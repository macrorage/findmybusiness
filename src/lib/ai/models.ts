import type { ProviderName } from "./types";

export interface ModelInfo {
  provider: ProviderName;
  /** USD per 1M input tokens. */
  inputPerMTok: number;
  /** USD per 1M output tokens (includes thinking tokens on both providers). */
  outputPerMTok: number;
  /** When the price was last checked against the provider's pricing page. */
  verifiedOn: string;
  note?: string;
}

/**
 * Model IDs and prices. Prices change: re-check before relying on cost numbers
 * (Anthropic: platform.claude.com pricing; Google: aistudio.google.com/docs/pricing).
 */
export const MODELS: Record<string, ModelInfo> = {
  "claude-opus-5-5": { provider: "anthropic", inputPerMTok: 4, outputPerMTok: 20, verifiedOn: "2026-11-26" },
  // Cheaper Claude options. Switching to them is the owner's call (PROGRESS "Blockers / open decisions").
  "claude-sonnet-5-5": { provider: "anthropic", inputPerMTok: 2, outputPerMTok: 10, verifiedOn: "2026-11-26" },
  "claude-haiku-5-5": {
    provider: "anthropic",
    inputPerMTok: 0.1,
    outputPerMTok: 0.5,
    verifiedOn: "2026-11-26",
    note: "Price for prompts up to 100K tokens ($0.50 / $2.50 beyond).",
  },
  "gemini-3.5-flash-lite": { provider: "google", inputPerMTok: 0.3, outputPerMTok: 2.5, verifiedOn: "2026-11-26" },
  "gemini-3.8-flash": {
    provider: "google",
    inputPerMTok: 0.75,
    outputPerMTok: 3.75,
    verifiedOn: "2026-11-26",
    note: "Google doubles this to $1.50 / $7.50 from 2027-01-01.",
  },
  mock: { provider: "mock", inputPerMTok: 0, outputPerMTok: 0, verifiedOn: "2026-11-26" },
};

/** Cost in integer micro-USD. Unknown models cost 0 and should be added to MODELS. */
export function costUsdMicros(model: string, inputTokens: number, outputTokens: number): number {
  const info = MODELS[model];
  if (!info) return 0;
  // tokens × (USD per 1M tokens) = micro-USD
  return Math.round(inputTokens * info.inputPerMTok + outputTokens * info.outputPerMTok);
}
