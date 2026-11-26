import { getEnv } from "@/lib/env";
import { dataForSeoSource } from "./dataforseo";
import { fixtureSource } from "./fixtures";
import type { MapsSource } from "./types";

export * from "./types";
export { buildKeyword, parseDataForSeoResponse } from "./dataforseo";
export { demoProspects } from "./fixtures";

/** Live DataForSEO in live mode, invented demo data otherwise (same switch as the AI wrapper). */
export function getMapsSource(): MapsSource {
  return getEnv().AI_PROVIDER_MODE === "live" ? dataForSeoSource : fixtureSource;
}
