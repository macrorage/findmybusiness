/**
 * Site content schema: the contract between AI, templates and the editor (PRODUCT §5.5).
 *
 * Split on purpose:
 *   - SiteCopySchema   = what the AI writes (headline, services wording, about, SEO text).
 *   - SiteContentSchema = copy + FACTS taken only from data (name, phone, address, hours,
 *     legal details, real reviews). The AI never writes facts, so it can't invent a phone
 *     number or a review (PRODUCT §8).
 */
import { z } from "zod";

export const LANGUAGES = ["sl", "hr", "sr-Latn", "sr-Cyrl", "bs", "mk", "de", "en"] as const;
export const LanguageSchema = z.enum(LANGUAGES);
export type Language = z.infer<typeof LanguageSchema>;

export const CTA_KINDS = ["call", "viber", "whatsapp", "email", "form"] as const;
export const CtaKindSchema = z.enum(CTA_KINDS);

export const CURRENCY_CODES = ["EUR", "RSD", "BAM", "MKD"] as const;

const PhoneSchema = z.string().regex(/^\+[1-9][0-9]{6,14}$/, "E.164 phone, e.g. +38641123456");
const TimeSchema = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, "HH:MM");

// ---------------------------------------------------------------------------
// Written by the AI
// ---------------------------------------------------------------------------

export const SiteCopySchema = z.object({
  seo: z.object({
    title: z.string().min(10).max(60).describe("Page title in the site language, with trade and city"),
    description: z.string().min(50).max(160).describe("Meta description in the site language"),
  }),
  hero: z.object({
    eyebrow: z.string().max(60).optional().describe("Short line above the headline, e.g. 'Frizerski salon v Mariboru'"),
    headline: z.string().min(5).max(80),
    subline: z.string().min(10).max(200),
    ctaLabel: z.string().min(2).max(30).describe("Button text, e.g. 'Pokličite nas'"),
  }),
  services: z
    .array(
      z.object({
        name: z.string().min(2).max(60),
        description: z.string().max(200).optional(),
      }),
    )
    .min(2)
    .max(12),
  about: z.object({
    heading: z.string().min(3).max(60),
    body: z.string().min(50).max(800).describe("2-4 short paragraphs. No invented facts, years, awards or numbers."),
  }),
  galleryAlts: z
    .array(z.string().min(5).max(140))
    .max(12)
    .describe("Alt text for each gallery image, in order, in the site language"),
});
export type SiteCopy = z.infer<typeof SiteCopySchema>;

// ---------------------------------------------------------------------------
// Facts from data (Maps listing, registry, the human editor)
// ---------------------------------------------------------------------------

export const OpeningHoursSchema = z.array(
  z.object({
    day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
    opens: TimeSchema,
    closes: TimeSchema,
  }),
);

export const BusinessFactsSchema = z.object({
  name: z.string().min(1).max(120),
  phone: PhoneSchema.optional(),
  email: z.email().optional(),
  address: z.object({
    street: z.string().min(1),
    postalCode: z.string().min(1),
    city: z.string().min(1),
    country: z.string().regex(/^[A-Z]{2}$/),
  }),
  geo: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).optional(),
  hours: OpeningHoursSchema,
  rating: z.object({ value: z.number().min(0).max(5), count: z.number().int().min(0) }).optional(),
});
export type BusinessFacts = z.infer<typeof BusinessFactsSchema>;

/** Impressum / business details: required on every site (PRODUCT §9). */
export const LegalSchema = z.object({
  companyName: z.string().min(1),
  legalForm: z.string().optional(),
  regNumber: z.string().optional(),
  vatId: z.string().optional(),
  address: z.string().min(1),
  email: z.email().optional(),
  phone: PhoneSchema.optional(),
});

export const ReviewSchema = z.object({
  author: z.string().min(1).max(60),
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1).max(400),
  source: z.literal("google"),
  date: z.iso.date().optional(),
});

export const GalleryImageSchema = z.object({
  src: z.url(),
  alt: z.string().min(5).max(140),
  license: z.object({
    source: z.enum(["unsplash", "pexels", "ai_generated", "client"]),
    url: z.url().optional(),
  }),
});

export const SiteContentSchema = z.object({
  schemaVersion: z.literal(1),
  lang: LanguageSchema,
  trade: z.string().min(1),
  template: z.string().min(1),
  theme: z.object({ palette: z.string().min(1), fontPair: z.string().min(1) }),
  business: BusinessFactsSchema,
  legal: LegalSchema,
  copy: SiteCopySchema,
  primaryCta: CtaKindSchema,
  reviews: z.array(ReviewSchema).max(6),
  gallery: z.array(GalleryImageSchema).max(12),
  contact: z.object({
    formEnabled: z.boolean(),
    channels: z.array(CtaKindSchema).min(1),
    showMap: z.boolean(),
  }),
});
export type SiteContent = z.infer<typeof SiteContentSchema>;
