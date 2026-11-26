/**
 * Demo data for mock mode: invented businesses for any trade + city, so the UI works with no keys.
 * Names start with "Demo" and phones use the 000 range, so nothing looks like a real lead.
 * Deterministic: the same query always returns the same list.
 */
import type { Prospect } from "@/lib/prospect";
import { getTrade, tradeLabel } from "@/lib/trades";
import type { MapsQuery, MapsSearchResult, MapsSource } from "./types";

const COUNTRY_LANG = { SI: "sl", HR: "hr", RS: "sr-Latn", BA: "bs", MK: "mk", AT: "de" } as const;
const DIAL = { SI: "+386", HR: "+385", RS: "+381", BA: "+387", MK: "+389", AT: "+43" } as const;
/** Mobile prefix + filler so the number has the right length (checked with libphonenumber-js). */
const MOBILE = { SI: "41 000 ", HR: "91 000 0", RS: "64 000 ", BA: "61 000 ", MK: "70 000 ", AT: "664 000 " } as const;
/** Area code + the start of a valid subscriber number (checked with libphonenumber-js). */
const LANDLINE = { SI: "2 230 0", HR: "1 000 0", RS: "11 300 0", BA: "33 200 ", MK: "2 300 0", AT: "1 500 0" } as const;

interface Variant {
  suffix: string;
  website?: (slug: string) => string;
  mobile: boolean;
  rating: number;
  reviews: number;
  closed?: boolean;
}

const VARIANTS: Variant[] = [
  { suffix: "Center", mobile: true, rating: 4.8, reviews: 52 },
  { suffix: "Studio", mobile: true, rating: 4.9, reviews: 31, website: (s) => `https://www.facebook.com/${s}.example` },
  { suffix: "Plus", mobile: false, rating: 4.5, reviews: 88, website: (s) => `http://${s}.example` },
  { suffix: "Mojster", mobile: false, rating: 4.6, reviews: 19 },
  { suffix: "Express", mobile: true, rating: 4.7, reviews: 23, website: (s) => `https://linktr.ee/${s}.example` },
  { suffix: "Stari", mobile: false, rating: 4.2, reviews: 140, closed: true },
  { suffix: "Mega", mobile: false, rating: 4.1, reviews: 1250 },
  { suffix: "Novi", mobile: true, rating: 4.4, reviews: 9 },
];

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function demoProspects(query: MapsQuery): Prospect[] {
  const trade = getTrade(query.trade);
  const label = tradeLabel(trade, COUNTRY_LANG[query.country]);
  const city = query.city.trim();
  return VARIANTS.map((v, i) => {
    const name = `Demo ${label} ${v.suffix}`;
    const slug = slugify(`demo-${trade.id}-${v.suffix}-${city}`);
    const n = String(i + 1).padStart(3, "0");
    const phone = v.mobile
      ? `${DIAL[query.country]} ${MOBILE[query.country]}${n}`
      : `${DIAL[query.country]} ${LANDLINE[query.country]}${n}`;
    return {
      source: "fixture",
      mapsPlaceId: `demo-${slug}`,
      name,
      category: trade.mapsCategories[0],
      country: query.country,
      city,
      address: `Demo ulica ${i + 1}, ${city}`,
      phone,
      website: v.website?.(slug),
      rating: v.rating,
      reviewCount: v.reviews,
      isPermanentlyClosed: v.closed ?? false,
      reviews: [],
    } satisfies Prospect;
  });
}

export const fixtureSource: MapsSource = {
  name: "fixture",
  estimateCostUsdMicros: () => 0,
  async search(query: MapsQuery): Promise<MapsSearchResult> {
    return { prospects: demoProspects(query), costUsdMicros: 0, source: "fixture", keyword: `demo ${query.trade} ${query.city}` };
  },
};
