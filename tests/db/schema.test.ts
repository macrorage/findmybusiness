/**
 * Applies every migration in supabase/migrations to an in-memory Postgres (PGlite)
 * and checks the rules the app relies on. Runs without Docker, keys or network.
 * All data here is invented (AGENTS.md §4: no real business data in git).
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

const EXPECTED_TABLES = [
  "ai_calls",
  "api_cache",
  "businesses",
  "classifications",
  "clients",
  "do_not_contact",
  "messages",
  "pipeline",
  "preview_views",
  "search_results",
  "searches",
  "sites",
];

let db: PGlite;

async function insertBusiness(fields: Record<string, unknown> = {}): Promise<string> {
  const row = { country: "SI", name: "Frizerski salon Testna", ...fields };
  const cols = Object.keys(row);
  const params = cols.map((_, i) => `$${i + 1}`).join(", ");
  const result = await db.query<{ id: string }>(
    `insert into public.businesses (${cols.join(", ")}) values (${params}) returning id`,
    Object.values(row),
  );
  return result.rows[0]!.id;
}

beforeAll(async () => {
  db = new PGlite();
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    await db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
}, 30_000);

afterAll(async () => {
  await db?.close();
});

describe("schema", () => {
  it("creates every expected table", async () => {
    const { rows } = await db.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' order by tablename",
    );
    expect(rows.map((r) => r.tablename)).toEqual(EXPECTED_TABLES);
  });

  it("has row level security enabled on every public table", async () => {
    const { rows } = await db.query<{ relname: string }>(
      `select c.relname from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(rows).toEqual([]);
  });
});

describe("businesses", () => {
  it("dedupes by maps_place_id", async () => {
    await insertBusiness({ maps_place_id: "test-place-1" });
    await expect(insertBusiness({ maps_place_id: "test-place-1" })).rejects.toThrow();
  });

  it("dedupes by registry number per country, but allows many without one", async () => {
    await insertBusiness({ reg_number: "1234567000" });
    await expect(insertBusiness({ reg_number: "1234567000" })).rejects.toThrow();
    await insertBusiness({ reg_number: "1234567000", country: "HR" });
    await insertBusiness();
    await insertBusiness();
  });

  it("only accepts E.164 phone numbers", async () => {
    await insertBusiness({ phone_e164: "+38641123456" });
    await expect(insertBusiness({ phone_e164: "041 123 456" })).rejects.toThrow();
  });

  it("rejects a blank name and a bad country code", async () => {
    await expect(insertBusiness({ name: "   " })).rejects.toThrow();
    await expect(insertBusiness({ country: "si" })).rejects.toThrow();
  });

  it("bumps updated_at on update", async () => {
    const id = await insertBusiness({ updated_at: "2000-01-01T00:00:00Z" });
    await db.query("update public.businesses set city = 'Maribor' where id = $1", [id]);
    const { rows } = await db.query<{ updated: boolean }>(
      "select updated_at > '2000-01-02'::timestamptz as updated from public.businesses where id = $1",
      [id],
    );
    expect(rows[0]!.updated).toBe(true);
  });
});

describe("do_not_contact", () => {
  it("needs at least one durable identifier", async () => {
    const id = await insertBusiness();
    await expect(
      db.query("insert into public.do_not_contact (business_id) values ($1)", [id]),
    ).rejects.toThrow();
  });

  it("matches by phone or email and survives deleting the business", async () => {
    const id = await insertBusiness({ phone_e164: "+38640111222" });
    await db.query(
      "insert into public.do_not_contact (business_id, phone_e164, reason) values ($1, $2, 'asked to stop')",
      [id, "+38640111222"],
    );
    await db.query("insert into public.do_not_contact (email) values ('stop@example.com')");

    await db.query("delete from public.businesses where id = $1", [id]);

    const { rows } = await db.query<{ by_phone: boolean; by_email: boolean; other: boolean }>(
      `select public.is_do_not_contact(null, '+38640111222', null) as by_phone,
              public.is_do_not_contact(null, null, 'STOP@example.com') as by_email,
              public.is_do_not_contact('unknown-place', '+38640999999', null) as other`,
    );
    expect(rows[0]).toEqual({ by_phone: true, by_email: true, other: false });
  });
});

describe("pipeline and clients", () => {
  it("requires a currency when a deal value is set", async () => {
    const id = await insertBusiness();
    await expect(
      db.query("insert into public.pipeline (business_id, deal_value_cents) values ($1, 39000)", [id]),
    ).rejects.toThrow();
    await db.query(
      "insert into public.pipeline (business_id, deal_value_cents, currency) values ($1, 39000, 'EUR')",
      [id],
    );
  });

  it("rejects unknown pipeline statuses", async () => {
    const id = await insertBusiness();
    await expect(
      db.query("insert into public.pipeline (business_id, status) values ($1, 'maybe')", [id]),
    ).rejects.toThrow();
  });

  it("protects paying clients from deletion", async () => {
    const id = await insertBusiness();
    await db.query(
      `insert into public.clients (business_id, plan, setup_price_cents, monthly_price_cents, currency)
       values ($1, 'start', 39000, 1900, 'EUR')`,
      [id],
    );
    await expect(db.query("delete from public.businesses where id = $1", [id])).rejects.toThrow();
  });
});

describe("sites", () => {
  it("requires a URL-safe preview slug", async () => {
    const id = await insertBusiness();
    const insertSite = (slug: string) =>
      db.query(
        `insert into public.sites (business_id, template, language, content, preview_slug)
         values ($1, 'beauty', 'sl', '{}'::jsonb, $2)`,
        [id, slug],
      );
    await insertSite("frizerski-salon-testna");
    await expect(insertSite("Frizerski Salon!")).rejects.toThrow();
    await expect(insertSite("frizerski-salon-testna")).rejects.toThrow();
  });
});
