import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadPrompt } from "@/lib/ai/prompts";
import { costUsdMicros } from "@/lib/ai/models";
import { ROUTES } from "@/lib/ai/routing";
import { MODELS } from "@/lib/ai/models";

const DIR = join(process.cwd(), "tests", "fixtures", "prompts");

describe("loadPrompt", () => {
  it("renders system and user sections with the version", () => {
    const p = loadPrompt("example", { language: "slovenščina", name: "Salon Testna", reviews: 52 }, DIR);
    expect(p).toEqual({
      name: "example",
      version: "2",
      system: "You write in slovenščina.",
      prompt: "Business: Salon Testna\nReviews: 52",
    });
  });

  it("throws on a missing variable", () => {
    expect(() => loadPrompt("example", { language: "sl", name: "X" }, DIR)).toThrow(/\{\{reviews\}\}/);
  });
});

describe("costUsdMicros", () => {
  it("prices Gemini Flash-Lite in micro-USD", () => {
    // 10,000 × $0.30/M + 1,000 × $2.50/M = $0.0055
    expect(costUsdMicros("gemini-3.5-flash-lite", 10_000, 1_000)).toBe(5_500);
  });

  it("returns 0 for unknown models", () => {
    expect(costUsdMicros("unknown-model", 1_000, 1_000)).toBe(0);
  });
});

describe("routing table", () => {
  it("only uses models that have a price", () => {
    for (const route of Object.values(ROUTES)) {
      for (const target of [route.primary, route.fallback].filter(Boolean)) {
        expect(MODELS[target!.model], target!.model).toBeDefined();
        expect(MODELS[target!.model]!.provider).toBe(target!.provider);
      }
    }
  });
});
