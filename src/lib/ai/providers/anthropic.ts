import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { requireEnv } from "@/lib/env";
import { AiRefusalError, AiValidationError } from "../errors";
import type { AiProvider, ProviderCall, ProviderResponse } from "../types";

let client: Anthropic | undefined;

function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY") });
  return client;
}

/** Anthropic's server-side refusal fallback: a declined request is re-run on a suitable model. */
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

function buildContent(input: ProviderCall): Anthropic.Beta.BetaContentBlockParam[] {
  const images: Anthropic.Beta.BetaContentBlockParam[] = (input.images ?? []).map((img) => ({
    type: "image",
    source: { type: "base64", media_type: img.mimeType, data: img.base64 },
  }));
  return [...images, { type: "text", text: input.prompt }];
}

export const anthropicProvider: AiProvider = {
  name: "anthropic",

  async call(input: ProviderCall): Promise<ProviderResponse> {
    // Thinking can't be disabled on Claude Opus 5.5; effort is the depth control (default medium).
    const base = {
      model: input.model,
      max_tokens: input.maxTokens,
      betas: [FALLBACK_BETA],
      fallbacks: "default" as const,
      ...(input.system ? { system: input.system } : {}),
      messages: [{ role: "user" as const, content: buildContent(input) }],
    };

    if (input.schema) {
      const response = await getClient().beta.messages.parse({
        ...base,
        output_config: {
          ...(input.effort ? { effort: input.effort } : {}),
          format: betaZodOutputFormat(input.schema),
        },
      });
      if (response.stop_reason === "refusal") {
        throw new AiRefusalError(`Claude declined (${response.stop_details?.category ?? "no category"})`);
      }
      const text = textOf(response.content);
      if (response.parsed_output === null || response.parsed_output === undefined) {
        throw new AiValidationError("Claude output did not match the schema", text);
      }
      return {
        text,
        parsed: response.parsed_output,
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    }

    const response = await getClient().beta.messages.create({
      ...base,
      ...(input.effort ? { output_config: { effort: input.effort } } : {}),
    });
    if (response.stop_reason === "refusal") {
      throw new AiRefusalError(`Claude declined (${response.stop_details?.category ?? "no category"})`);
    }
    return {
      text: textOf(response.content),
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  },
};

function textOf(content: Anthropic.Beta.BetaContentBlock[]): string {
  return content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
