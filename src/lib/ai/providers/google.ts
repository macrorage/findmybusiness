import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { requireEnv } from "@/lib/env";
import { AiRefusalError } from "../errors";
import type { AiProvider, ProviderCall, ProviderResponse } from "../types";

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
  return client;
}

const BLOCKED_FINISH_REASONS = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"]);

export const googleProvider: AiProvider = {
  name: "google",

  async call(input: ProviderCall): Promise<ProviderResponse> {
    const parts = [
      ...(input.images ?? []).map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.base64 } })),
      { text: input.prompt },
    ];

    const response = await getClient().models.generateContent({
      model: input.model,
      contents: [{ role: "user", parts }],
      config: {
        maxOutputTokens: input.maxTokens,
        ...(input.system ? { systemInstruction: input.system } : {}),
        ...(input.schema
          ? { responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(input.schema) }
          : {}),
      },
    });

    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason && BLOCKED_FINISH_REASONS.has(String(finishReason))) {
      throw new AiRefusalError(`Gemini blocked the response (${finishReason})`);
    }

    const usage = response.usageMetadata;
    return {
      text: response.text ?? "",
      model: input.model,
      inputTokens: usage?.promptTokenCount ?? 0,
      // Thinking tokens are billed as output.
      outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
    };
  },
};
