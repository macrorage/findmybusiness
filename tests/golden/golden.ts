import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ProspectSchema } from "@/lib/prospect";
import { LanguageSchema, LegalSchema } from "@/lib/sitegen/schema";

export const GoldenCaseSchema = z.object({
  id: z.string().regex(/^g\d{2}-[a-z0-9-]+$/),
  trade: z.string(),
  language: LanguageSchema,
  prospect: ProspectSchema,
  legal: LegalSchema,
  expect: z.object({
    label: z.enum(["no_website", "social_only", "needs_check", "chain", "closed"]),
    channels: z.array(z.enum(["viber", "whatsapp", "sms", "email", "call"])),
  }),
});
export type GoldenCase = z.infer<typeof GoldenCaseSchema>;

export function loadGoldenSet(): GoldenCase[] {
  const raw: unknown = JSON.parse(readFileSync(join(process.cwd(), "tests", "golden", "businesses.json"), "utf8"));
  return z.array(GoldenCaseSchema).parse(raw);
}
