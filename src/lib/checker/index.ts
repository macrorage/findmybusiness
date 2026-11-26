/**
 * Website checker (PRODUCT §5.4): turns a `needs_check` lead into `outdated` or `ok`.
 *
 *   1. Fetch the page (public URLs only, 10 s timeout) → HTML checks → rule score 1–5.
 *   2. Optional: screenshot (Playwright) → Gemini vision score 1–5 + 3 problems.
 *      If the screenshot or AI step fails, the rule score is used.
 */
import { z } from "zod";
import { generateObject, loadPrompt } from "@/lib/ai";
import { analyseHtml, ruleScore, type HtmlChecks, type Problem } from "./html";
import { assertPublicUrl } from "./url-guard";

export { analyseHtml, ruleScore } from "./html";
export type { HtmlChecks, Problem } from "./html";
export { assertPublicUrl } from "./url-guard";

export const OUTDATED_THRESHOLD = 3;

export const VisionVerdictSchema = z.object({
  score: z.number().int().min(1).max(5),
  problems: z.array(z.string().min(3).max(160)).length(3),
});
export type VisionVerdict = z.infer<typeof VisionVerdictSchema>;

export interface CheckResult {
  url: string;
  label: "outdated" | "ok";
  outdatedScore: number;
  scoreSource: "rules" | "ai";
  problems: Problem[];
  aiProblems?: string[];
  checks?: HtmlChecks;
  error?: string;
}

export type Screenshotter = (url: string) => Promise<{ base64: string; viewport: string }>;

export interface CheckOptions {
  businessName: string;
  tradeLabel: string;
  /** Language name for the AI problem list, e.g. "Slovenian". */
  languageName: string;
  /** Pass a screenshotter to enable the AI step (see takeScreenshot). */
  screenshot?: Screenshotter;
  fetchImpl?: typeof fetch;
  now?: Date;
}

const USER_AGENT = "Mozilla/5.0 (compatible; SpletkoChecker/0.1)";

export async function checkWebsite(rawUrl: string, opts: CheckOptions): Promise<CheckResult> {
  const url = assertPublicUrl(rawUrl).toString();
  const doFetch = opts.fetchImpl ?? fetch;

  let checks: HtmlChecks;
  try {
    const res = await doFetch(url, {
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(10_000),
    });
    const html = await res.text();
    checks = analyseHtml({
      html,
      finalUrl: res.url || url,
      status: res.status,
      lastModified: res.headers.get("last-modified") ?? undefined,
    });
  } catch (err) {
    // A website that doesn't load is as good as no website: a strong lead.
    return {
      url,
      label: "outdated",
      outdatedScore: 5,
      scoreSource: "rules",
      problems: ["site_unreachable"],
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const rules = ruleScore(checks, opts.now);
  const base: CheckResult = {
    url,
    label: rules.score >= OUTDATED_THRESHOLD ? "outdated" : "ok",
    outdatedScore: rules.score,
    scoreSource: "rules",
    problems: rules.problems,
    checks,
  };
  if (!opts.screenshot || checks.status >= 400) return base;

  try {
    const shot = await opts.screenshot(url);
    const prompt = loadPrompt("outdated_vision", {
      language_name: opts.languageName,
      business_name: opts.businessName,
      trade_label: opts.tradeLabel,
      viewport: shot.viewport,
    });
    const { data } = await generateObject(
      {
        task: "outdated_vision",
        system: prompt.system,
        prompt: prompt.prompt,
        promptVersion: prompt.version,
        images: [{ mimeType: "image/png", base64: shot.base64 }],
      },
      VisionVerdictSchema,
    );
    return {
      ...base,
      label: data.score >= OUTDATED_THRESHOLD ? "outdated" : "ok",
      outdatedScore: data.score,
      scoreSource: "ai",
      aiProblems: data.problems,
    };
  } catch (err) {
    return { ...base, error: `AI check skipped: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Mobile-sized screenshot with Playwright's Chromium.
 * Needs `pnpm exec playwright install chromium` once per machine.
 */
export const takeScreenshot: Screenshotter = async (url) => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const viewport = { width: 390, height: 844 };
    const page = await browser.newPage({ viewport, userAgent: USER_AGENT, deviceScaleFactor: 1 });
    await page.goto(assertPublicUrl(url).toString(), { waitUntil: "load", timeout: 20_000 });
    const png = await page.screenshot({ type: "png", fullPage: false });
    return { base64: png.toString("base64"), viewport: `${viewport.width}×${viewport.height} (phone)` };
  } finally {
    await browser.close();
  }
};
