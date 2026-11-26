import { describe, expect, it } from "vitest";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { SiteContentSchema, SiteCopySchema, type SiteContent } from "@/lib/sitegen/schema";

// Invented business (AGENTS.md §4).
const copy = {
  seo: {
    title: "Frizerski salon Testna – Maribor",
    description: "Striženje, barvanje in pričeske za posebne priložnosti v središču Maribora. Pokličite in se naročite.",
  },
  hero: {
    eyebrow: "Frizerski salon v Mariboru",
    headline: "Pričeska, ki vam ostane všeč",
    subline: "Striženje, barvanje in nega las brez čakanja. Naročite se po telefonu.",
    ctaLabel: "Pokličite nas",
  },
  services: [{ name: "Striženje" }, { name: "Barvanje", description: "Naravni odtenki in pramenčki." }],
  about: {
    heading: "O salonu",
    body: "Smo majhen salon v središču mesta. Vzamemo si čas za vsako stranko in svetujemo, kaj bo vašim lasem najbolj ustrezalo.",
  },
  galleryAlts: ["Notranjost frizerskega salona"],
};

const content: SiteContent = {
  schemaVersion: 1,
  lang: "sl",
  trade: "frizer",
  template: "beauty",
  theme: { palette: "rose", fontPair: "geist" },
  business: {
    name: "Frizerski salon Testna",
    phone: "+38641000111",
    address: { street: "Testna ulica 1", postalCode: "2000", city: "Maribor", country: "SI" },
    hours: [{ day: "mon", opens: "08:00", closes: "16:00" }],
    rating: { value: 4.8, count: 52 },
  },
  legal: { companyName: "Testna Ana s.p.", legalForm: "s.p.", address: "Testna ulica 1, 2000 Maribor" },
  copy,
  primaryCta: "call",
  reviews: [{ author: "Maja K.", rating: 5, text: "Odlična izkušnja!", source: "google" }],
  gallery: [
    {
      src: "https://images.example.com/salon.jpg",
      alt: "Notranjost frizerskega salona",
      license: { source: "unsplash" },
    },
  ],
  contact: { formEnabled: false, channels: ["call", "viber"], showMap: true },
};

describe("site content schema", () => {
  it("accepts a complete site", () => {
    expect(SiteContentSchema.parse(content)).toEqual(content);
  });

  it("keeps the AI copy within limits", () => {
    const tooLong = { ...copy, hero: { ...copy.hero, headline: "x".repeat(81) } };
    expect(SiteCopySchema.safeParse(tooLong).success).toBe(false);
  });

  it("rejects facts the AI must not invent in the wrong format", () => {
    const badPhone = { ...content, business: { ...content.business, phone: "041 000 111" } };
    expect(SiteContentSchema.safeParse(badPhone).success).toBe(false);
    const fakeReviewSource = { ...content, reviews: [{ ...content.reviews[0]!, source: "ai" }] };
    expect(SiteContentSchema.safeParse(fakeReviewSource).success).toBe(false);
  });

  it("requires the impressum company name", () => {
    const noLegal = { ...content, legal: { ...content.legal, companyName: "" } };
    expect(SiteContentSchema.safeParse(noLegal).success).toBe(false);
  });

  it("builds a Claude structured-output format from the AI copy schema", () => {
    const format = betaZodOutputFormat(SiteCopySchema) as { type: string; schema: Record<string, unknown> };
    expect(format.type).toBe("json_schema");
    expect(JSON.stringify(format.schema)).toContain("headline");
  });

  it("converts the AI copy schema to JSON Schema (for Gemini structured output)", () => {
    const json = z.toJSONSchema(SiteCopySchema) as { type: string; required: string[] };
    expect(json.type).toBe("object");
    expect(json.required).toEqual(expect.arrayContaining(["seo", "hero", "services", "about"]));
  });
});
