import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getTrade, listTrades, tradeLabel } from "@/lib/trades";

const DIR = join(process.cwd(), "src", "trades");

describe("trade configs", () => {
  it("registers every JSON file in src/trades", () => {
    const files = readdirSync(DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
    expect(listTrades().map((t) => t.id).sort()).toEqual(files);
  });

  it("uses the file name as the id", () => {
    // listTrades() already validated each file against TradeConfigSchema.
    expect(getTrade("frizer").schemaOrgType).toBe("HairSalon");
  });

  it("has Slovenian services for every trade", () => {
    for (const t of listTrades()) {
      expect(t.defaultServices.sl?.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.searchKeywords.sl?.length, t.id).toBeGreaterThanOrEqual(1);
    }
  });

  it("returns localized labels with an English fallback", () => {
    const t = getTrade("vodovodar");
    expect(tradeLabel(t, "hr")).toBe("Vodoinstalater");
    expect(tradeLabel(t, "de")).toBe("Plumber");
  });

  it("throws on an unknown trade", () => {
    expect(() => getTrade("astronaut")).toThrow(/Unknown trade/);
  });
});
