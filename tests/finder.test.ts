import { afterEach, describe, expect, it } from "vitest";
import { findProspects, FinderInputError, parseFinderQuery } from "@/lib/finder";
import { getDictionary } from "@/i18n";
import { reasonText } from "@/app/find/format";

afterEach(() => {
  delete process.env.AI_PROVIDER_MODE;
});

describe("finder", () => {
  it("validates the query", () => {
    expect(parseFinderQuery({ trade: "frizer", city: " Maribor ", country: "si" })).toEqual({
      trade: "frizer",
      city: "Maribor",
      country: "SI",
    });
    expect(() => parseFinderQuery({ trade: "astronaut", city: "Maribor" })).toThrow(FinderInputError);
    expect(() => parseFinderQuery({ trade: "frizer", city: "M" })).toThrow(FinderInputError);
    expect(() => parseFinderQuery({ trade: "frizer", city: "Maribor", country: "US" })).toThrow(FinderInputError);
  });

  it("ranks demo leads best first and separates chains and closed businesses", async () => {
    const result = await findProspects({ trade: "frizer", city: "Maribor", country: "SI" });
    expect(result.mode).toBe("mock");
    expect(result.costUsdMicros).toBe(0);
    const scores = result.leads.map((l) => l.score.score ?? 0);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(result.leads[0]!.classification.label).toBe("no_website");
    expect(result.skipped.map((l) => l.classification.label).sort()).toEqual(["chain", "closed"]);
  });

  it("renders every reason in both languages without leftover placeholders", async () => {
    const result = await findProspects({ trade: "avtoservis", city: "Celje", country: "SI" });
    for (const locale of ["sl", "en"] as const) {
      const t = getDictionary(locale);
      for (const lead of [...result.leads, ...result.skipped]) {
        for (const reason of lead.classification.reasons) {
          expect(reasonText(t, reason)).not.toMatch(/\{\w+\}/);
        }
      }
    }
  });
});
