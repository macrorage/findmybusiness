/**
 * Rule-based classifier (PRODUCT §5.2). Pure functions, no AI, no network.
 *
 * Order of rules: closed → chain → website. A business with its own website gets
 * `needs_check`; the website checker (src/lib/checker) turns that into `outdated` or `ok`.
 */
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import type { CountryCode as PhoneCountry } from "libphonenumber-js";
import type { Prospect } from "@/lib/prospect";
import type { TradeConfig } from "@/lib/trades";

export type PreLabel = "no_website" | "social_only" | "needs_check" | "chain" | "closed";
export type Channel = "viber" | "whatsapp" | "sms" | "email" | "call";
export type PhoneType = "mobile" | "fixed_line" | "fixed_line_or_mobile" | "voip" | "other" | "unknown";

export type Reason =
  | { code: "no_website" }
  | { code: "social_only"; domain: string }
  | { code: "own_site"; domain: string }
  | { code: "invalid_website"; value: string }
  | { code: "permanently_closed" }
  | { code: "chain_review_count"; count: number }
  | { code: "chain_known_name"; name: string }
  | { code: "chain_multi_city"; cities: number }
  | { code: "category_mismatch"; category: string }
  | { code: "mobile_phone" }
  | { code: "landline_phone" }
  | { code: "no_valid_phone" };

export interface Classification {
  label: PreLabel;
  reasons: Reason[];
  phoneE164?: string;
  phoneType: PhoneType;
  channels: Channel[];
  /** False for chain and closed: never shown as a lead. */
  isLead: boolean;
}

/** Hosts that are a profile on someone else's platform, not the business's own site. */
export const SOCIAL_AND_DIRECTORY_HOSTS = [
  "facebook.com", "fb.com", "fb.me", "instagram.com", "tiktok.com", "youtube.com", "x.com", "twitter.com",
  "linkedin.com", "pinterest.com", "linktr.ee", "linkin.bio", "bio.link", "beacons.ai", "taplink.cc",
  "business.site", "g.page", "maps.app.goo.gl", "goo.gl",
  "booking.com", "airbnb.com", "tripadvisor.com", "holidaycheck.com", "vrbo.com",
  "bizi.si", "najdi.si", "poslovna.hr", "fininfo.hr", "companywall.hr", "companywall.rs", "companywall.si",
  "wolt.com", "glovoapp.com",
];

/** Names of chains and franchises seen in the region (lower case, matched as whole words). Extend freely. */
export const KNOWN_CHAINS = [
  "petrol", "omv", "mol", "ina", "vulco", "euromaster", "point s", "first stop", "bosch car service",
  "dm", "müller", "hervis", "mercator", "spar", "lidl", "hofer", "tuš", "konzum", "kaufland",
  "mcdonald's", "subway", "burger king", "kfc", "sushimama", "hair & co",
];

/** Above this many reviews a "local business" is almost always a chain or a big venue. */
export const CHAIN_REVIEW_THRESHOLD = 1000;
/** Same name in at least this many cities of one search batch counts as a chain. */
export const CHAIN_CITY_THRESHOLD = 3;

export interface ClassifyContext {
  /** Number of distinct cities each normalized name appears in, across the current batch. */
  citiesByName?: Map<string, number>;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildContext(prospects: Prospect[]): ClassifyContext {
  const cities = new Map<string, Set<string>>();
  for (const p of prospects) {
    const key = normalizeName(p.name);
    const set = cities.get(key) ?? new Set<string>();
    if (p.city) set.add(p.city.toLowerCase());
    cities.set(key, set);
  }
  return { citiesByName: new Map([...cities].map(([k, v]) => [k, v.size])) };
}

function hostOf(website: string): string | undefined {
  try {
    const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
    return url.hostname.toLowerCase().replace(/^www\.|^m\./, "");
  } catch {
    return undefined;
  }
}

function matchesHost(host: string, list: string[]): string | undefined {
  return list.find((d) => host === d || host.endsWith(`.${d}`));
}

function knownChain(name: string): string | undefined {
  const n = normalizeName(name);
  return KNOWN_CHAINS.find((chain) => new RegExp(`(^|[^\\p{L}])${escapeRegex(chain)}([^\\p{L}]|$)`, "u").test(n));
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function analysePhone(raw: string | undefined, country: string): {
  e164?: string;
  type: PhoneType;
  channels: Channel[];
} {
  const parsed = raw ? parsePhoneNumberFromString(raw, country as PhoneCountry) : undefined;
  if (!parsed?.isValid()) return { type: "unknown", channels: [] };
  const typeMap: Record<string, PhoneType> = {
    MOBILE: "mobile",
    FIXED_LINE: "fixed_line",
    FIXED_LINE_OR_MOBILE: "fixed_line_or_mobile",
    VOIP: "voip",
  };
  const type = typeMap[parsed.getType() ?? ""] ?? "other";
  // Viber and WhatsApp need a mobile number; for "fixed line or mobile" we can't be sure.
  const channels: Channel[] = type === "mobile" ? ["viber", "whatsapp", "sms", "call"] : ["call"];
  return { e164: parsed.number, type, channels };
}

export function classifyProspect(p: Prospect, trade?: TradeConfig, ctx: ClassifyContext = {}): Classification {
  const reasons: Reason[] = [];
  const phone = analysePhone(p.phone, p.country);
  const phoneReason: Reason =
    phone.type === "mobile" ? { code: "mobile_phone" } : phone.e164 ? { code: "landline_phone" } : { code: "no_valid_phone" };

  const result = (label: PreLabel, isLead: boolean): Classification => ({
    label,
    reasons: [...reasons, phoneReason],
    phoneE164: phone.e164,
    phoneType: phone.type,
    channels: phone.channels,
    isLead,
  });

  if (p.isPermanentlyClosed) {
    reasons.push({ code: "permanently_closed" });
    return result("closed", false);
  }

  const chainName = knownChain(p.name);
  if (chainName) {
    reasons.push({ code: "chain_known_name", name: chainName });
    return result("chain", false);
  }
  if ((p.reviewCount ?? 0) >= CHAIN_REVIEW_THRESHOLD) {
    reasons.push({ code: "chain_review_count", count: p.reviewCount! });
    return result("chain", false);
  }
  const cities = ctx.citiesByName?.get(normalizeName(p.name)) ?? 0;
  if (cities >= CHAIN_CITY_THRESHOLD) {
    reasons.push({ code: "chain_multi_city", cities });
    return result("chain", false);
  }

  if (trade && p.category && !trade.mapsCategories.some((c) => c.toLowerCase() === p.category!.toLowerCase())) {
    reasons.push({ code: "category_mismatch", category: p.category });
  }

  const website = p.website?.trim();
  if (!website) {
    reasons.unshift({ code: "no_website" });
    return result("no_website", true);
  }
  const host = hostOf(website);
  if (!host) {
    reasons.unshift({ code: "invalid_website", value: website });
    return result("no_website", true);
  }
  const social = matchesHost(host, SOCIAL_AND_DIRECTORY_HOSTS);
  if (social) {
    reasons.unshift({ code: "social_only", domain: social });
    return result("social_only", true);
  }
  reasons.unshift({ code: "own_site", domain: host });
  return result("needs_check", true);
}
