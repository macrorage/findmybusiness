/**
 * A normalized business listing, as every data source must produce it (DataForSEO, Google
 * Places, fixtures). The classifier, scorer and site generator only ever see this shape.
 */
import { z } from "zod";
import { OpeningHoursSchema } from "@/lib/sitegen/schema";

export const ProspectReviewSchema = z.object({
  author: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  text: z.string(),
  date: z.iso.date().optional(),
});

export const ProspectSchema = z.object({
  source: z.enum(["dataforseo", "google_places", "fixture"]),
  mapsPlaceId: z.string().min(1),
  name: z.string().min(1),
  /** Google Maps category as the source returns it (English), e.g. "Hair salon". */
  category: z.string().optional(),
  country: z.string().regex(/^[A-Z]{2}$/),
  city: z.string().optional(),
  /** Full address line as returned by the source. */
  address: z.string().optional(),
  street: z.string().optional(),
  postalCode: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  /** Phone exactly as the source gave it; normalized to E.164 by the classifier. */
  phone: z.string().optional(),
  website: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  hours: OpeningHoursSchema.optional(),
  isPermanentlyClosed: z.boolean().default(false),
  reviews: z.array(ProspectReviewSchema).default([]),
});

export type Prospect = z.infer<typeof ProspectSchema>;
export type ProspectInput = z.input<typeof ProspectSchema>;
