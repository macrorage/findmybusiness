import { z } from "zod";

/** Treat `KEY=` (empty, as copied from .env.example) the same as an unset key. */
const optional = z.preprocess((v) => (v === "" ? undefined : v), z.string().optional());

const EnvSchema = z.object({
  AI_PROVIDER_MODE: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["mock", "live"]).default("mock")),
  ANTHROPIC_API_KEY: optional,
  GEMINI_API_KEY: optional,
  DATAFORSEO_LOGIN: optional,
  DATAFORSEO_PASSWORD: optional,
  NEXT_PUBLIC_SUPABASE_URL: optional,
  SUPABASE_SERVICE_ROLE_KEY: optional,
  ALLOWED_ADMIN_EMAIL: optional,
  MONTHLY_BUDGET_EUR: z.preprocess((v) => (v === "" ? undefined : v), z.coerce.number().positive().default(50)),
});

export type Env = z.infer<typeof EnvSchema>;

/** Read and validate env vars. Not cached, so tests can change process.env between calls. */
export function getEnv(): Env {
  return EnvSchema.parse(process.env);
}

/** Throw a clear error when a key needed for live mode is missing (PROGRESS 👤 H1). */
export function requireEnv<K extends keyof Env>(key: K): NonNullable<Env[K]> {
  const value = getEnv()[key];
  if (value === undefined || value === null) {
    throw new Error(`${String(key)} is not set. Add it to .env (see .env.example and PROGRESS.md task H1).`);
  }
  return value as NonNullable<Env[K]>;
}
