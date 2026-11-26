import type { z } from "zod";

/** Every AI job in the product. Add a task here, then give it a route in routing.ts. */
export type AiTask = "classify" | "outdated_vision" | "site_content" | "outreach" | "site_edit";

export type ProviderName = "anthropic" | "google" | "mock";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface AiImage {
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  /** Base64 without a data: prefix or newlines. */
  base64: string;
}

/** What callers pass to generateText / generateObject. */
export interface AiRequest {
  task: AiTask;
  system?: string;
  prompt: string;
  images?: AiImage[];
  maxTokens?: number;
  /** From the prompt file's `version:` line, logged with every call. */
  promptVersion?: string;
  businessId?: string;
}

/** What a provider receives. */
export interface ProviderCall {
  task: AiTask;
  model: string;
  effort?: Effort;
  system?: string;
  prompt: string;
  images?: AiImage[];
  schema?: z.ZodType;
  maxTokens: number;
}

export interface ProviderResponse {
  /** Raw text output (JSON text when a schema was given). */
  text: string;
  /** Already-parsed object, when the provider SDK parsed it. */
  parsed?: unknown;
  /** The model that actually answered (can differ after a server-side fallback). */
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AiProvider {
  name: ProviderName;
  call(input: ProviderCall): Promise<ProviderResponse>;
}

export interface AiResult<T> {
  data: T;
  provider: ProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsdMicros: number;
  latencyMs: number;
}

/** One row for the ai_calls table (supabase/migrations). */
export interface AiCallLog {
  task: AiTask;
  provider: ProviderName;
  model: string;
  promptVersion?: string;
  businessId?: string;
  inputTokens: number;
  outputTokens: number;
  costUsdMicros: number;
  latencyMs: number;
  ok: boolean;
  error?: string;
}
