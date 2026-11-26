/**
 * Pure HTML checks for an existing website (PRODUCT §5.4). No network, easy to test.
 */

export type Problem =
  | "site_unreachable"
  | "http_error"
  | "no_https"
  | "no_mobile_viewport"
  | "old_copyright_year"
  | "not_modified_recently"
  | "old_technology"
  | "no_business_details"
  | "no_title"
  | "very_heavy_page";

export interface HtmlChecks {
  status: number;
  https: boolean;
  hasViewport: boolean;
  title?: string;
  copyrightYear?: number;
  lastModified?: string;
  oldTech: string[];
  generator?: string;
  hasBusinessDetails: boolean;
  hasCookieNotice: boolean;
  htmlBytes: number;
}

const OLD_TECH: [string, RegExp][] = [
  ["frameset", /<frameset[\s>]/i],
  ["flash", /\.swf\b|application\/x-shockwave-flash/i],
  ["marquee", /<marquee[\s>]/i],
  ["font_tag", /<font[\s>]/i],
  ["jquery_1x", /jquery[.-]1\.\d+(\.\d+)?(\.min)?\.js/i],
  ["table_layout", /(<table[\s>][\s\S]*?){6,}/i],
];

const OLD_GENERATORS = /joomla!?\s*1\.|wordpress\s*[1-4]\.|frontpage|dreamweaver|iweb|microsoft word/i;

/** Words that usually appear in an impressum / business-details block (sl, hr, sr, de, en). */
const BUSINESS_DETAIL_HINTS =
  /\b(d\.o\.o\.|s\.p\.|d\.d\.|j\.d\.o\.o\.|obrt|matična številka|davčna številka|id za ddv|oib|mbs|pib|matični broj|impressum|uid-nr|firmenbuch|vat (no|number))\b/i;

const COOKIE_HINTS = /cookie|piškot|kolačić|колачић|колачиња/i;

export function analyseHtml(input: { html: string; finalUrl: string; status: number; lastModified?: string }): HtmlChecks {
  const { html } = input;
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || undefined;
  const generator = html.match(/<meta[^>]+name=["']generator["'][^>]*content=["']([^"']+)["']/i)?.[1];

  // "© 2014", "&copy; 2009-2016", "Copyright 2012" → the latest year mentioned
  const years = [...html.matchAll(/(?:©|&copy;|&#169;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)]
    .map((m) => Number(m[1]))
    .filter((y) => y >= 1995 && y <= 2100);

  return {
    status: input.status,
    https: input.finalUrl.startsWith("https://"),
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    title,
    copyrightYear: years.length ? Math.max(...years) : undefined,
    lastModified: input.lastModified,
    oldTech: [
      ...OLD_TECH.filter(([, re]) => re.test(html)).map(([name]) => name),
      ...(generator && OLD_GENERATORS.test(generator) ? [`generator:${generator}`] : []),
    ],
    generator,
    hasBusinessDetails: BUSINESS_DETAIL_HINTS.test(html.replace(/<[^>]+>/g, " ")),
    hasCookieNotice: COOKIE_HINTS.test(html),
    htmlBytes: Buffer.byteLength(html, "utf8"),
  };
}

/**
 * 1 = modern, 5 = very outdated. Rule-based; the AI screenshot score replaces it when available.
 */
export function ruleScore(checks: HtmlChecks, now: Date = new Date()): { score: number; problems: Problem[] } {
  const problems: Problem[] = [];
  let points = 0;

  if (checks.status >= 400) {
    return { score: 5, problems: ["http_error"] };
  }
  if (!checks.hasViewport) {
    problems.push("no_mobile_viewport");
    points += 2;
  }
  if (!checks.https) {
    problems.push("no_https");
    points += 1;
  }
  if (checks.copyrightYear && checks.copyrightYear < now.getFullYear() - 2) {
    problems.push("old_copyright_year");
    points += 1;
  }
  if (checks.lastModified) {
    const modified = Date.parse(checks.lastModified);
    if (!Number.isNaN(modified) && now.getTime() - modified > 3 * 365 * 24 * 3600 * 1000) {
      problems.push("not_modified_recently");
      points += 1;
    }
  }
  if (checks.oldTech.length) {
    problems.push("old_technology");
    points += 2;
  }
  if (!checks.hasBusinessDetails) problems.push("no_business_details");
  if (!checks.title) problems.push("no_title");
  if (checks.htmlBytes > 3_000_000) problems.push("very_heavy_page");

  return { score: Math.min(5, 1 + points), problems };
}
