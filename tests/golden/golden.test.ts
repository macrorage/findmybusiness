import { describe, expect, it } from "vitest";
import { getTrade } from "@/lib/trades";
import { loadGoldenSet } from "./golden";

const cases = loadGoldenSet();

describe("golden set", () => {
  it("has 10 valid, uniquely named cases", () => {
    expect(cases).toHaveLength(10);
    expect(new Set(cases.map((c) => c.id)).size).toBe(10);
    expect(new Set(cases.map((c) => c.prospect.mapsPlaceId)).size).toBe(10);
  });

  it("only uses known trades", () => {
    for (const c of cases) expect(() => getTrade(c.trade), c.id).not.toThrow();
  });

  it("covers Slovenian and Croatian, and every classifier outcome", () => {
    expect(new Set(cases.map((c) => c.language))).toEqual(new Set(["sl", "hr"]));
    expect(new Set(cases.map((c) => c.expect.label))).toEqual(
      new Set(["no_website", "social_only", "needs_check", "chain", "closed"]),
    );
  });

  it("only links to reserved .example domains or fake social pages", () => {
    for (const c of cases) {
      const site = c.prospect.website;
      if (!site) continue;
      const url = new URL(site);
      // Own sites use the reserved .example TLD; social/directory pages carry "example" in the path.
      expect(url.hostname.endsWith(".example") || url.pathname.includes("example"), c.id).toBe(true);
    }
  });
});
