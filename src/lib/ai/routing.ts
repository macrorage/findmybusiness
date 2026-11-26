import type { AiTask, Effort, ProviderName } from "./types";

export interface RouteTarget {
  provider: Exclude<ProviderName, "mock">;
  model: string;
  effort?: Effort;
}

export interface Route {
  primary: RouteTarget;
  /** Tried when the primary fails (error, refusal, or invalid output after one retry). */
  fallback?: RouteTarget;
  maxTokens: number;
}

/**
 * Which model does which job (PRODUCT §6). Change models here only.
 * Claude requests also carry Anthropic's server-side refusal fallback (providers/anthropic.ts).
 */
export const ROUTES: Record<AiTask, Route> = {
  classify: {
    primary: { provider: "google", model: "gemini-3.5-flash-lite" },
    fallback: { provider: "anthropic", model: "claude-opus-5-5", effort: "low" },
    maxTokens: 2_000,
  },
  outdated_vision: {
    primary: { provider: "google", model: "gemini-3.5-flash-lite" },
    fallback: { provider: "anthropic", model: "claude-opus-5-5", effort: "low" },
    maxTokens: 2_000,
  },
  site_content: {
    primary: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
    fallback: { provider: "google", model: "gemini-3.8-flash" },
    maxTokens: 16_000,
  },
  outreach: {
    primary: { provider: "anthropic", model: "claude-opus-5-5", effort: "medium" },
    fallback: { provider: "google", model: "gemini-3.8-flash" },
    maxTokens: 4_000,
  },
  site_edit: {
    primary: { provider: "anthropic", model: "claude-opus-5-5", effort: "low" },
    fallback: { provider: "google", model: "gemini-3.8-flash" },
    maxTokens: 16_000,
  },
};
