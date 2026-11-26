import { afterEach, describe, expect, it } from "vitest";
import { resetMockResponders, setMockResponder } from "@/lib/ai";
import { analyseHtml, assertPublicUrl, checkWebsite, ruleScore } from "@/lib/checker";

const NOW = new Date("2026-11-26T12:00:00Z");

// Invented pages.
const OLD_SITE = `<html><head><title>Avtoservis Zobnik</title><meta name="generator" content="Joomla! 1.5 - Open Source"></head>
<body><table><tr><td><font size="2">Dobrodošli</font></td></tr></table>
<script src="/js/jquery-1.4.2.min.js"></script><p>© 2009-2013 Zobnik</p></body></html>`;

const MODERN_SITE = `<!doctype html><html lang="hr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Beauty studio Lotos</title></head>
<body><main><h1>Lotos</h1></main><footer>© 2026 Lotos d.o.o., OIB 00000000000 · Kolačići</footer></body></html>`;

const fakeFetch =
  (body: string, init: { status?: number; url?: string; lastModified?: string } = {}) =>
  async () => {
    const res = new Response(body, {
      status: init.status ?? 200,
      headers: init.lastModified ? { "last-modified": init.lastModified } : {},
    });
    Object.defineProperty(res, "url", { value: init.url ?? "" });
    return res;
  };

const opts = { businessName: "Test", tradeLabel: "Avtoservis", languageName: "Slovenian", now: NOW };

afterEach(() => resetMockResponders());

describe("HTML checks", () => {
  it("spots an old site", () => {
    const checks = analyseHtml({ html: OLD_SITE, finalUrl: "http://zobnik.example/", status: 200 });
    expect(checks).toMatchObject({ https: false, hasViewport: false, copyrightYear: 2013, hasBusinessDetails: false });
    expect(checks.oldTech).toEqual(expect.arrayContaining(["font_tag", "jquery_1x", "generator:Joomla! 1.5 - Open Source"]));
    const { score, problems } = ruleScore(checks, NOW);
    expect(score).toBe(5);
    expect(problems).toEqual(expect.arrayContaining(["no_mobile_viewport", "no_https", "old_copyright_year", "old_technology"]));
  });

  it("passes a modern site", () => {
    const checks = analyseHtml({ html: MODERN_SITE, finalUrl: "https://lotos.example/", status: 200 });
    expect(checks).toMatchObject({ https: true, hasViewport: true, copyrightYear: 2026, hasBusinessDetails: true, hasCookieNotice: true });
    expect(ruleScore(checks, NOW)).toEqual({ score: 1, problems: [] });
  });

  it("counts a very old Last-Modified header", () => {
    const checks = analyseHtml({ html: MODERN_SITE, finalUrl: "https://x.example/", status: 200, lastModified: "Tue, 01 Mar 2016 10:00:00 GMT" });
    expect(ruleScore(checks, NOW).problems).toContain("not_modified_recently");
  });
});

describe("URL guard", () => {
  it("allows public hosts and adds http:// when missing", () => {
    expect(assertPublicUrl("lotos.example").toString()).toBe("http://lotos.example/");
  });

  it("blocks local and private addresses", () => {
    for (const bad of ["http://localhost:3000", "http://127.0.0.1", "http://192.168.1.10", "http://10.0.0.5/x", "http://[::1]/", "http://intranet", "ftp://files.example", "http://printer.local"]) {
      expect(() => assertPublicUrl(bad), bad).toThrow();
    }
  });
});

describe("checkWebsite", () => {
  it("labels an old site as outdated from rules alone", async () => {
    const r = await checkWebsite("http://zobnik.example", { ...opts, fetchImpl: fakeFetch(OLD_SITE, { url: "http://zobnik.example/" }) });
    expect(r).toMatchObject({ label: "outdated", outdatedScore: 5, scoreSource: "rules" });
  });

  it("treats an unreachable site as a strong lead", async () => {
    const failing = async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    };
    const r = await checkWebsite("https://gone.example", { ...opts, fetchImpl: failing });
    expect(r).toMatchObject({ label: "outdated", outdatedScore: 5, problems: ["site_unreachable"] });
  });

  it("uses the AI screenshot verdict when a screenshotter is given", async () => {
    let sentImage = false;
    setMockResponder("outdated_vision", (input) => {
      sentImage = input.images?.[0]?.base64 === "c2NyZWVu";
      return { score: 4, problems: ["Premajhno besedilo na telefonu", "Star izgled", "Ni gumba za klic"] };
    });
    const r = await checkWebsite("https://lotos.example", {
      ...opts,
      fetchImpl: fakeFetch(MODERN_SITE, { url: "https://lotos.example/" }),
      screenshot: async () => ({ base64: "c2NyZWVu", viewport: "390×844 (phone)" }),
    });
    expect(sentImage).toBe(true);
    expect(r).toMatchObject({ label: "outdated", outdatedScore: 4, scoreSource: "ai" });
    expect(r.aiProblems).toHaveLength(3);
  });

  it("falls back to the rule score when the screenshot fails", async () => {
    const r = await checkWebsite("https://lotos.example", {
      ...opts,
      fetchImpl: fakeFetch(MODERN_SITE, { url: "https://lotos.example/" }),
      screenshot: async () => {
        throw new Error("Executable doesn't exist");
      },
    });
    expect(r).toMatchObject({ label: "ok", outdatedScore: 1, scoreSource: "rules" });
    expect(r.error).toMatch(/AI check skipped/);
  });

  it("refuses private URLs before fetching", async () => {
    await expect(checkWebsite("http://127.0.0.1:8080", { ...opts, fetchImpl: fakeFetch("") })).rejects.toThrow(/private or local/);
  });
});
