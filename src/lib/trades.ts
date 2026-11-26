/**
 * Trade configs are data (one JSON file per trade in src/trades/). PRODUCT §5.5.
 * To add a trade: create src/trades/<id>.json and add it to src/trades/index.ts.
 * tests/trades.test.ts fails if a file is missing from the index or invalid.
 */
import { z } from "zod";
import { CtaKindSchema, LANGUAGES, type Language } from "@/lib/sitegen/schema";
import { RAW_TRADES } from "@/trades";

const PerLanguage = <T extends z.ZodType>(value: T) =>
  z.partialRecord(z.enum(LANGUAGES), value).refine((r) => r.sl !== undefined && r.en !== undefined, {
    message: "needs at least sl and en",
  });

export const TradeConfigSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  labels: PerLanguage(z.string().min(2)),
  /** Search terms per language for the Maps query, most common first. */
  searchKeywords: z.partialRecord(z.enum(LANGUAGES), z.array(z.string().min(2)).min(1)),
  /** Google Maps category names (English) that count as this trade. */
  mapsCategories: z.array(z.string().min(2)).min(1),
  schemaOrgType: z.string().regex(/^[A-Z][A-Za-z]+$/),
  templateGroup: z.enum(["trades", "beauty", "food", "health", "lodging"]),
  defaultServices: z.partialRecord(z.enum(LANGUAGES), z.array(z.string().min(2)).min(2)),
  primaryCta: CtaKindSchema,
  imageQueries: z.array(z.string().min(3)).min(1),
  valueTier: z.enum(["low", "medium", "high"]),
});
export type TradeConfig = z.infer<typeof TradeConfigSchema>;

const TRADES: TradeConfig[] = RAW_TRADES.map((raw) => TradeConfigSchema.parse(raw));
const BY_ID = new Map(TRADES.map((t) => [t.id, t]));

export function listTrades(): TradeConfig[] {
  return TRADES;
}

export function getTrade(id: string): TradeConfig {
  const trade = BY_ID.get(id);
  if (!trade) throw new Error(`Unknown trade "${id}". Known: ${[...BY_ID.keys()].join(", ")}`);
  return trade;
}

export function tradeLabel(trade: TradeConfig, lang: Language): string {
  return trade.labels[lang] ?? trade.labels.en!;
}
