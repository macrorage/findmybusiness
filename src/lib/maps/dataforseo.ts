/**
 * DataForSEO Google Maps (live, advanced). Docs checked 2026-11-26:
 * https://docs.dataforseo.com/v3/serp/google/maps/live/advanced/
 *
 * Query strategy (verify on the first live run, then log a decision):
 *   keyword = "<local trade keyword> <city>", location_name = country, language_code = "en"
 *   English results keep Maps categories comparable with src/trades/*.json `mapsCategories`.
 */
import { z } from "zod";
import { requireEnv } from "@/lib/env";
import { ProspectSchema, type Prospect } from "@/lib/prospect";
import { getTrade } from "@/lib/trades";
import type { CountryCode, MapsQuery, MapsSearchResult, MapsSource } from "./types";

const ENDPOINT = "https://api.dataforseo.com/v3/serp/google/maps/live/advanced";

/** USD per SERP page (≤100 results). From the docs sample response; confirm on the pricing page. */
export const USD_PER_PAGE = 0.002;
const DEFAULT_DEPTH = 100;

export const COUNTRY_LOCATION_NAMES: Record<CountryCode, string> = {
  SI: "Slovenia",
  HR: "Croatia",
  RS: "Serbia",
  BA: "Bosnia and Herzegovina",
  MK: "North Macedonia",
  AT: "Austria",
};

const COUNTRY_LANGUAGE: Record<CountryCode, "sl" | "hr" | "sr-Latn" | "bs" | "mk" | "de"> = {
  SI: "sl",
  HR: "hr",
  RS: "sr-Latn",
  BA: "bs",
  MK: "mk",
  AT: "de",
};

export function buildKeyword(query: MapsQuery): string {
  const trade = getTrade(query.trade);
  const lang = COUNTRY_LANGUAGE[query.country];
  const keyword = trade.searchKeywords[lang]?.[0] ?? trade.searchKeywords.en?.[0] ?? trade.labels.en!;
  return `${keyword} ${query.city.trim()}`;
}

// ---------------------------------------------------------------------------
// Response parsing (lenient: unknown fields are ignored, missing ones become undefined)
// ---------------------------------------------------------------------------

const TimeOfDay = z.object({ hour: z.number().int(), minute: z.number().int() });
const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_SHORT = { monday: "mon", tuesday: "tue", wednesday: "wed", thursday: "thu", friday: "fri", saturday: "sat", sunday: "sun" } as const;

const MapsItem = z.object({
  type: z.string(),
  title: z.string().nullish(),
  url: z.string().nullish(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  address_info: z
    .object({
      address: z.string().nullish(),
      city: z.string().nullish(),
      zip: z.string().nullish(),
      country_code: z.string().nullish(),
    })
    .nullish(),
  place_id: z.string().nullish(),
  category: z.string().nullish(),
  rating: z
    .object({ rating_type: z.string().nullish(), value: z.number().nullish(), votes_count: z.number().nullish() })
    .nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  work_hours: z
    .object({
      timetable: z
        .record(z.string(), z.array(z.object({ open: TimeOfDay, close: TimeOfDay })).nullish())
        .nullish(),
      current_status: z.string().nullish(),
    })
    .nullish(),
});

const Response = z.object({
  status_code: z.number(),
  status_message: z.string(),
  cost: z.number().nullish(),
  tasks: z
    .array(
      z.object({
        status_code: z.number(),
        status_message: z.string(),
        cost: z.number().nullish(),
        result: z.array(z.object({ items: z.array(z.unknown()).nullish() })).nullish(),
      }),
    )
    .nullish(),
});

const pad = (n: number) => String(n).padStart(2, "0");

export function parseDataForSeoResponse(json: unknown, fallbackCountry: CountryCode): {
  prospects: Prospect[];
  costUsd: number;
} {
  const res = Response.parse(json);
  if (res.status_code !== 20000) {
    throw new Error(`DataForSEO error ${res.status_code}: ${res.status_message}`);
  }
  const task = res.tasks?.[0];
  if (!task) throw new Error("DataForSEO returned no task");
  if (task.status_code !== 20000) {
    throw new Error(`DataForSEO task error ${task.status_code}: ${task.status_message}`);
  }

  const prospects: Prospect[] = [];
  for (const rawItem of task.result?.[0]?.items ?? []) {
    const parsed = MapsItem.safeParse(rawItem);
    if (!parsed.success || parsed.data.type !== "maps_search") continue;
    const item = parsed.data;
    if (!item.place_id || !item.title) continue;

    const hours = DAYS.flatMap((day) =>
      (item.work_hours?.timetable?.[day] ?? []).map((slot) => ({
        day: DAY_SHORT[day],
        opens: `${pad(slot.open.hour)}:${pad(slot.open.minute)}`,
        closes: `${pad(slot.close.hour)}:${pad(slot.close.minute)}`,
      })),
    );
    const rating = item.rating?.rating_type === "Max5" ? item.rating : undefined;

    const candidate = ProspectSchema.safeParse({
      source: "dataforseo",
      mapsPlaceId: item.place_id,
      name: item.title,
      category: item.category ?? undefined,
      country: (item.address_info?.country_code ?? fallbackCountry).toUpperCase(),
      city: item.address_info?.city ?? undefined,
      address: item.address ?? undefined,
      street: item.address_info?.address ?? undefined,
      postalCode: item.address_info?.zip ?? undefined,
      lat: item.latitude ?? undefined,
      lng: item.longitude ?? undefined,
      phone: item.phone ?? undefined,
      website: item.url ?? undefined,
      rating: rating?.value ?? undefined,
      reviewCount: rating?.votes_count ?? undefined,
      hours: hours.length ? hours : undefined,
      // DataForSEO has no "permanently closed" field; Maps usually hides those listings anyway.
      isPermanentlyClosed: false,
    });
    if (candidate.success) prospects.push(candidate.data);
  }

  return { prospects, costUsd: task.cost ?? res.cost ?? 0 };
}

// ---------------------------------------------------------------------------
// Live source
// ---------------------------------------------------------------------------

export const dataForSeoSource: MapsSource = {
  name: "dataforseo",

  estimateCostUsdMicros(query) {
    const pages = Math.ceil((query.depth ?? DEFAULT_DEPTH) / 100);
    return Math.round(pages * USD_PER_PAGE * 1_000_000);
  },

  async search(query): Promise<MapsSearchResult> {
    const login = requireEnv("DATAFORSEO_LOGIN");
    const password = requireEnv("DATAFORSEO_PASSWORD");
    const keyword = buildKeyword(query);

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        {
          keyword,
          location_name: COUNTRY_LOCATION_NAMES[query.country],
          language_code: "en",
          depth: Math.min(query.depth ?? DEFAULT_DEPTH, 700),
        },
      ]),
    });
    if (!response.ok) {
      throw new Error(`DataForSEO HTTP ${response.status}`);
    }
    const { prospects, costUsd } = parseDataForSeoResponse(await response.json(), query.country);
    return {
      prospects,
      costUsdMicros: Math.round(costUsd * 1_000_000),
      source: "dataforseo",
      keyword,
    };
  },
};
