import { describe, expect, it } from "vitest";
import { formatMoney, money } from "@/lib/money";

describe("money", () => {
  it("rejects non-integer cents", () => {
    expect(() => money(19.5, "EUR")).toThrow();
  });

  it("formats euros for Slovenian", () => {
    // Intl uses a non-breaking space; normalise it for the comparison.
    expect(formatMoney(money(39000, "EUR"), "sl").replace(/\s/g, " ")).toBe("390,00 €");
  });

  it("keeps the currency code", () => {
    expect(money(15000, "RSD").currency).toBe("RSD");
  });
});
