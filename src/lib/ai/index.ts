/**
 * The only way the app talks to AI models (AGENTS.md §5).
 *
 *   const { data } = await generateObject({ task: "site_content", prompt, system }, SiteContentSchema);
 *
 * Mode comes from AI_PROVIDER_MODE: "mock" (default, free, deterministic) or "live".
 * Flow per call: budget check → primary route → on invalid JSON retry once with the error
 * → on any failure try the fallback route → log every attempt.
 */
import type { z } from "zod";
import { getEnv } from "@/lib/env";
import { AiFailedError, AiValidationError } from "./errors";
import { costUsdMicros } from "./models";
import { anthropicProvider } from "./providers/anthropic";
import { googleProvider } from "./providers/google";
import { mockProvider } from "./providers/mock";
import { ROUTES, type RouteTarget } from "./routing";
import type { AiCallLog, AiProvider, AiRequest, AiResult, ProviderName } from "./types";

export * from "./types";
export { AiFailedError, AiRefusalError, AiValidationError } from "./errors";
export { loadPrompt } from "./prompts";
export { setMockResponder, resetMockResponders } from "./providers/mock";

const PROVIDERS: Record<ProviderName, AiProvider> = {
  anthropic: anthropicProvider,
  google: googleProvider,
  mock: mockProvider,
};

export interface AiHooks {
  /** Persist each attempt (the ai_calls table once Supabase is connected). */
  log: (entry: AiCallLog) => void | Promise<void>;
  /** Throw to block a call, e.g. when the monthly budget is used up (PRODUCT §5.9). */
  beforeCall: (req: AiRequest) => void | Promise<void>;
}

let hooks: AiHooks = { log: () => {}, beforeCall: () => {} };

export function configureAi(next: Partial<AiHooks>): void {
  hooks = { ...hooks, ...next };
}

export async function generateText(req: AiRequest): Promise<AiResult<string>> {
  return run(req, undefined);
}

export async function generateObject<S extends z.ZodType>(
  req: AiRequest,
  schema: S,
): Promise<AiResult<z.infer<S>>> {
  return run(req, schema);
}

async function run<T>(req: AiRequest, schema: z.ZodType | undefined): Promise<AiResult<T>> {
  await hooks.beforeCall(req);

  const route = ROUTES[req.task];
  const live = getEnv().AI_PROVIDER_MODE === "live";
  const targets: (RouteTarget | { provider: "mock"; model: "mock"; effort?: undefined })[] = live
    ? [route.primary, ...(route.fallback ? [route.fallback] : [])]
    : [{ provider: "mock", model: "mock" }];

  const causes: Error[] = [];

  for (const target of targets) {
    let prompt = req.prompt;
    // Second pass only happens after an invalid-JSON answer from the same target.
    for (let attempt = 1; attempt <= 2; attempt++) {
      const started = Date.now();
      try {
        const res = await PROVIDERS[target.provider].call({
          task: req.task,
          model: target.model,
          effort: target.effort,
          system: req.system,
          prompt,
          images: req.images,
          schema,
          maxTokens: req.maxTokens ?? route.maxTokens,
        });
        const data = (schema ? validate(schema, res.parsed, res.text) : res.text) as T;
        const result: AiResult<T> = {
          data,
          provider: target.provider,
          model: res.model,
          inputTokens: res.inputTokens,
          outputTokens: res.outputTokens,
          costUsdMicros: costUsdMicros(res.model, res.inputTokens, res.outputTokens),
          latencyMs: Date.now() - started,
        };
        await hooks.log({ ...logBase(req, result), ok: true });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        causes.push(error);
        await hooks.log({
          task: req.task,
          provider: target.provider,
          model: target.model,
          promptVersion: req.promptVersion,
          businessId: req.businessId,
          inputTokens: 0,
          outputTokens: 0,
          costUsdMicros: 0,
          latencyMs: Date.now() - started,
          ok: false,
          error: error.message.slice(0, 500),
        });
        if (error instanceof AiValidationError && attempt === 1) {
          prompt = `${req.prompt}\n\nYour previous answer was not valid for the required JSON schema:\n${error.message}\nAnswer again with valid JSON only.`;
          continue;
        }
        break; // next target
      }
    }
  }

  throw new AiFailedError(
    `AI task "${req.task}" failed on every route: ${causes.map((c) => c.message).join(" | ")}`,
    causes,
  );
}

function validate(schema: z.ZodType, parsed: unknown, text: string): unknown {
  let value = parsed;
  if (value === undefined) {
    try {
      value = JSON.parse(text);
    } catch {
      throw new AiValidationError("Output was not valid JSON", text);
    }
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AiValidationError(result.error.message, text);
  }
  return result.data;
}

function logBase(req: AiRequest, r: AiResult<unknown>): Omit<AiCallLog, "ok" | "error"> {
  return {
    task: req.task,
    provider: r.provider,
    model: r.model,
    promptVersion: req.promptVersion,
    businessId: req.businessId,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    costUsdMicros: r.costUsdMicros,
    latencyMs: r.latencyMs,
  };
}
