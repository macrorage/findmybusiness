/**
 * Prospect finder pipeline (PRODUCT §5.1–5.3): Maps source → classify → score → rank.
 * Website checks (src/lib/checker) are a separate step: they're slower, so `needs_check`
 * leads are listed and checked on demand.
 */
import { buildContext, classifyProspect, type Classification } from "@/lib/classify";
import { getEnv } from "@/lib/env";
import { getMapsSource, SUPPORTED_COUNTRIES, type CountryCode, type MapsQuery } from "@/lib/maps";
import type { Prospect } from "@/lib/prospect";
import { scoreLead, type LeadScore } from "@/lib/score";
import { getTrade, listTrades } from "@/lib/trades";

export interface Lead {
  prospect: Prospect;
  classification: Classification;
  score: LeadScore;
}

export interface FinderResult {
  mode: "mock" | "live";
  keyword: string;
  estimatedCostUsdMicros: number;
  costUsdMicros: number;
  /** Leads, best first. */
  leads: Lead[];
  /** Chains and closed businesses, with the reason they were skipped. */
  skipped: Lead[];
}

export class FinderInputError extends Error {}

export function parseFinderQuery(input: { trade?: string; city?: string; country?: string }): MapsQuery {
  const trade = input.trade?.trim();
  const city = input.city?.trim();
  const country = (input.country?.trim().toUpperCase() || "SI") as CountryCode;
  if (!trade || !listTrades().some((t) => t.id === trade)) throw new FinderInputError("Unknown trade");
  if (!city || city.length < 2 || city.length > 80) throw new FinderInputError("City must be 2–80 characters");
  if (!SUPPORTED_COUNTRIES.includes(country)) throw new FinderInputError("Unsupported country");
  return { trade, city, country };
}

/**
 * Live searches cost money. Until login exists (Supabase Auth, PRODUCT §5.9), a production
 * build refuses them so a deployed page can't be used to run up the bill.
 */
function assertLiveAllowed(): void {
  if (process.env.NODE_ENV === "production" && process.env.SPLETKO_ALLOW_UNAUTHENTICATED_LIVE !== "1") {
    throw new Error("Live searches are disabled in production until login is implemented.");
  }
}

export async function findProspects(query: MapsQuery): Promise<FinderResult> {
  const mode = getEnv().AI_PROVIDER_MODE;
  if (mode === "live") assertLiveAllowed();

  const source = getMapsSource();
  const trade = getTrade(query.trade);
  const estimatedCostUsdMicros = source.estimateCostUsdMicros(query);
  const result = await source.search(query);

  const ctx = buildContext(result.prospects);
  const all: Lead[] = result.prospects.map((prospect) => {
    const classification = classifyProspect(prospect, trade, ctx);
    return { prospect, classification, score: scoreLead({ prospect, classification, trade }) };
  });

  const leads = all
    .filter((l) => l.classification.isLead)
    .sort((a, b) => (b.score.score ?? 0) - (a.score.score ?? 0) || (b.prospect.reviewCount ?? 0) - (a.prospect.reviewCount ?? 0));

  return {
    mode,
    keyword: result.keyword,
    estimatedCostUsdMicros,
    costUsdMicros: result.costUsdMicros,
    leads,
    skipped: all.filter((l) => !l.classification.isLead),
  };
}
