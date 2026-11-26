import { describe, expect, it } from "vitest";
import { analysePhone, buildContext, classifyProspect } from "@/lib/classify";
import { ProspectSchema, type ProspectInput } from "@/lib/prospect";
import { scoreLead } from "@/lib/score";
import { getTrade } from "@/lib/trades";
import { loadGoldenSet } from "./golden/golden";

const base: ProspectInput = { source: "fixture", mapsPlaceId: "t-1", name: "Salon Testna", country: "SI", city: "Maribor" };
const p = (overrides: Partial<ProspectInput>) => ProspectSchema.parse({ ...base, ...overrides });

describe("classifier on the golden set", () => {
  const cases = loadGoldenSet();
  const ctx = buildContext(cases.map((c) => c.prospect));
  for (const c of cases) {
    it(`${c.id} → ${c.expect.label}`, () => {
      const result = classifyProspect(c.prospect, getTrade(c.trade), ctx);
      expect(result.label).toBe(c.expect.label);
      expect(result.channels).toEqual(c.expect.channels);
    });
  }
});

describe("classifier rules", () => {
  it("treats Facebook, Instagram, Linktree and directories as social only", () => {
    for (const site of [
      "https://m.facebook.com/x.example",
      "instagram.com/x.example",
      "https://linktr.ee/x",
      "https://www.bizi.si/x-example/",
      "https://sub.booking.com/hotel/x",
    ]) {
      expect(classifyProspect(p({ website: site })).label, site).toBe("social_only");
    }
  });

  it("sends an own domain to the website checker", () => {
    const r = classifyProspect(p({ website: "salon-testna.example" }));
    expect(r.label).toBe("needs_check");
    expect(r.reasons[0]).toEqual({ code: "own_site", domain: "salon-testna.example" });
  });

  it("detects chains by known name, review count and presence in many cities", () => {
    expect(classifyProspect(p({ name: "Vulco Maribor" })).label).toBe("chain");
    expect(classifyProspect(p({ name: "Salon Dmitrij" })).label).not.toBe("chain"); // "dm" only as a whole word
    expect(classifyProspect(p({ reviewCount: 1500 })).label).toBe("chain");
    const batch = ["Maribor", "Celje", "Kranj"].map((city, i) => p({ mapsPlaceId: `c${i}`, name: "Lepi Lasje", city }));
    expect(classifyProspect(batch[0]!, undefined, buildContext(batch)).label).toBe("chain");
  });

  it("flags a category that doesn't match the trade", () => {
    const r = classifyProspect(p({ category: "Car wash" }), getTrade("frizer"));
    expect(r.reasons).toContainEqual({ code: "category_mismatch", category: "Car wash" });
  });

  it("normalizes phones and only offers chat channels for mobiles", () => {
    expect(analysePhone("041 000 001", "SI")).toEqual({
      e164: "+38641000001",
      type: "mobile",
      channels: ["viber", "whatsapp", "sms", "call"],
    });
    expect(analysePhone("02 230 00 03", "SI").channels).toEqual(["call"]);
    expect(analysePhone("12", "SI")).toEqual({ type: "unknown", channels: [] });
    expect(analysePhone(undefined, "SI").channels).toEqual([]);
  });
});

describe("lead score", () => {
  it("scores a reputable no-website hairdresser with a mobile", () => {
    const prospect = p({ phone: "041 000 001", rating: 4.8, reviewCount: 52 });
    const result = scoreLead({ prospect, classification: classifyProspect(prospect), trade: getTrade("frizer") });
    expect(result.score).toBe(30 + 15 + 15);
    expect(result.breakdown.map((b) => b.signal)).toEqual(["no_website", "mobile_phone", "reputable"]);
  });

  it("adds points for an outdated site and a high-value trade", () => {
    const prospect = p({ website: "http://old.example", phone: "03 490 00 03" });
    const classification = classifyProspect(prospect);
    expect(scoreLead({ prospect, classification, trade: getTrade("avtoservis"), outdatedScore: 4 }).score).toBe(20 + 10);
    expect(scoreLead({ prospect, classification, trade: getTrade("avtoservis"), outdatedScore: 2 }).score).toBe(10);
  });

  it("excludes chains and closed businesses", () => {
    const prospect = p({ isPermanentlyClosed: true });
    expect(scoreLead({ prospect, classification: classifyProspect(prospect) })).toEqual({ score: null, breakdown: [] });
  });

  it("never goes below 0", () => {
    const prospect = p({ website: "https://own.example", category: "Car wash" });
    expect(scoreLead({ prospect, classification: classifyProspect(prospect, getTrade("frizer")) }).score).toBe(0);
  });
});
