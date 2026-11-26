import type { Prospect } from "@/lib/prospect";

export const SUPPORTED_COUNTRIES = ["SI", "HR", "RS", "BA", "MK", "AT"] as const;
export type CountryCode = (typeof SUPPORTED_COUNTRIES)[number];

export interface MapsQuery {
  trade: string;
  city: string;
  country: CountryCode;
  /** Results to request; DataForSEO bills per page of up to 100. */
  depth?: number;
}

export interface MapsSearchResult {
  prospects: Prospect[];
  /** What the provider charged, in micro-USD (0 for fixtures). */
  costUsdMicros: number;
  source: Prospect["source"];
  /** The exact keyword sent, for logging and the api_cache key. */
  keyword: string;
}

export interface MapsSource {
  name: Prospect["source"];
  estimateCostUsdMicros(query: MapsQuery): number;
  search(query: MapsQuery): Promise<MapsSearchResult>;
}
