/**
 * Lead score 0–100 with a breakdown (PRODUCT §5.3). First version: tune after the validation sprint.
 */
import type { Classification } from "@/lib/classify";
import type { Prospect } from "@/lib/prospect";
import type { TradeConfig } from "@/lib/trades";

export type ScoreSignal =
  | "no_website"
  | "social_only"
  | "outdated_site"
  | "mobile_phone"
  | "reputable"
  | "high_value_trade"
  | "registry_size"
  | "category_mismatch";

export const POINTS: Record<ScoreSignal, number> = {
  no_website: 30,
  social_only: 25,
  outdated_site: 20,
  mobile_phone: 15,
  reputable: 15,
  high_value_trade: 10,
  registry_size: 10,
  category_mismatch: -15,
};

export const REPUTABLE_MIN_RATING = 4.3;
export const REPUTABLE_MIN_REVIEWS = 15;

export interface ScoreInput {
  prospect: Prospect;
  classification: Classification;
  trade?: TradeConfig;
  /** 1–5 from the website checker (5 = very outdated). */
  outdatedScore?: number;
  /** Set once registry matching exists (Phase 5). */
  registryAboveThreshold?: boolean;
}

export interface LeadScore {
  /** null = excluded (chain, closed, do-not-contact). */
  score: number | null;
  breakdown: { signal: ScoreSignal; points: number }[];
}

export function scoreLead(input: ScoreInput): LeadScore {
  const { prospect, classification, trade } = input;
  if (!classification.isLead) return { score: null, breakdown: [] };

  const breakdown: LeadScore["breakdown"] = [];
  const add = (signal: ScoreSignal) => breakdown.push({ signal, points: POINTS[signal] });

  if (classification.label === "no_website") add("no_website");
  if (classification.label === "social_only") add("social_only");
  if (classification.label === "needs_check" && (input.outdatedScore ?? 0) >= 4) add("outdated_site");
  if (classification.phoneType === "mobile") add("mobile_phone");
  if ((prospect.rating ?? 0) >= REPUTABLE_MIN_RATING && (prospect.reviewCount ?? 0) >= REPUTABLE_MIN_REVIEWS) {
    add("reputable");
  }
  if (trade?.valueTier === "high") add("high_value_trade");
  if (input.registryAboveThreshold) add("registry_size");
  if (classification.reasons.some((r) => r.code === "category_mismatch")) add("category_mismatch");

  const total = breakdown.reduce((sum, b) => sum + b.points, 0);
  return { score: Math.max(0, Math.min(100, total)), breakdown };
}
