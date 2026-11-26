-- Spletko: initial schema (docs/PRODUCT.md §7)
--
-- Rules for this folder:
--   * Never edit a migration that has been committed. Add a new, later-timestamped file instead.
--   * Every new table must `enable row level security` (tests/db/schema.test.ts checks this).
--
-- Conventions:
--   * Status-like columns are text + CHECK, not enums: easier to extend (replace the constraint in a new migration).
--   * Customer money: integer cents + currency code (EUR, RSD, BAM, MKD).
--   * Provider costs (AI, DataForSEO) are fractions of a cent, so they are stored as integer micro-USD
--     (1 USD = 1,000,000). Converted to EUR only for display and the monthly budget check.
--   * Security (Phase 1, single admin): RLS is ON for every table with NO policies, so the browser roles
--     (anon, authenticated) see nothing. All access goes through server code using the service-role key
--     after the admin check (PRODUCT §5.9). Phase 2 (multi-tenant) adds real policies.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Businesses (one row per real business, deduplicated across searches)
-- ---------------------------------------------------------------------------

create table public.businesses (
  id                        uuid primary key default gen_random_uuid(),
  country                   text not null check (country ~ '^[A-Z]{2}$'),
  name                      text not null check (length(btrim(name)) > 0),
  legal_form                text,                       -- s.p., d.o.o., obrt, ...
  reg_number                text,                       -- registry number (matična številka, OIB/MBS, ...)
  vat_id                    text,
  trade                     text,                       -- id of a src/trades/*.json config
  address                   text,
  postal_code               text,
  city                      text,
  lat                       double precision check (lat between -90 and 90),
  lng                       double precision check (lng between -180 and 180),
  phone_e164                text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  phone_type                text check (phone_type in ('mobile', 'fixed_line', 'fixed_line_or_mobile', 'voip', 'other', 'unknown')),
  email                     text check (email = lower(email)),
  website_url               text,
  maps_place_id             text unique,
  rating                    numeric(2, 1) check (rating between 0 and 5),
  review_count              integer check (review_count >= 0),
  is_permanently_closed     boolean not null default false,
  source_flags              jsonb not null default '{}'::jsonb,   -- e.g. {"maps": true, "ajpes": true}
  registry_match_confidence real check (registry_match_confidence between 0 and 1),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Dedupe keys (PRODUCT §5.1): place_id (unique above), then registry number per country.
create unique index businesses_country_reg_number_key
  on public.businesses (country, reg_number) where reg_number is not null;
create index businesses_phone_idx on public.businesses (phone_e164) where phone_e164 is not null;
create index businesses_country_trade_city_idx on public.businesses (country, trade, city);

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Searches and API cache
-- ---------------------------------------------------------------------------

create table public.searches (
  id                   uuid primary key default gen_random_uuid(),
  trade                text not null,
  country              text not null check (country ~ '^[A-Z]{2}$'),
  city                 text not null,
  radius_km            numeric(6, 2) check (radius_km > 0),
  source               text not null check (source in ('dataforseo', 'google_places')),
  forced               boolean not null default false,          -- bypassed the re-query window
  est_cost_usd_micros  bigint check (est_cost_usd_micros >= 0),
  cost_usd_micros      bigint check (cost_usd_micros >= 0),
  result_count         integer check (result_count >= 0),
  created_at           timestamptz not null default now()
);

create index searches_lookup_idx on public.searches (country, trade, city, created_at desc);

create table public.search_results (
  search_id    uuid not null references public.searches (id) on delete cascade,
  business_id  uuid not null references public.businesses (id) on delete cascade,
  result_rank  integer check (result_rank >= 1),
  primary key (search_id, business_id)
);

create index search_results_business_idx on public.search_results (business_id);

-- Raw provider responses, so the same query is never paid for twice (PRODUCT §5.1).
create table public.api_cache (
  cache_key   text primary key,               -- e.g. 'dataforseo:maps:SI:frizer:maribor'
  provider    text not null,
  response    jsonb not null,
  fetched_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create index api_cache_expires_idx on public.api_cache (expires_at);

-- ---------------------------------------------------------------------------
-- Classification and lead score (one current row per business)
-- ---------------------------------------------------------------------------

create table public.classifications (
  business_id       uuid primary key references public.businesses (id) on delete cascade,
  label             text not null check (label in ('no_website', 'social_only', 'outdated', 'ok', 'chain', 'closed')),
  reasons           jsonb not null default '[]'::jsonb,
  contact_channels  text[] not null default '{}'
                    check (contact_channels <@ array['viber', 'whatsapp', 'sms', 'email', 'call']::text[]),
  outdated_score    smallint check (outdated_score between 1 and 5),
  lead_score        smallint check (lead_score between 0 and 100),
  score_breakdown   jsonb not null default '{}'::jsonb,
  checked_at        timestamptz not null default now()
);

create index classifications_lead_score_idx on public.classifications (lead_score desc nulls last);

-- ---------------------------------------------------------------------------
-- Generated sites and preview views
-- ---------------------------------------------------------------------------

create table public.sites (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  template         text not null,
  language         text not null check (language in ('sl', 'hr', 'sr-Latn', 'sr-Cyrl', 'bs', 'mk', 'de', 'en')),
  content          jsonb not null,                              -- validated by src/lib/sitegen/schema.ts
  content_version  integer not null default 1 check (content_version >= 1),   -- +1 on every edit
  prompt_version   text,
  preview_slug     text not null unique check (preview_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  og_image_url     text,
  status           text not null default 'draft'
                   check (status in ('draft', 'preview', 'reviewed', 'live', 'expired', 'archived')),
  expires_at       timestamptz,
  deployed_url     text,
  custom_domain    text unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index sites_business_idx on public.sites (business_id);

create trigger sites_set_updated_at
  before update on public.sites
  for each row execute function public.set_updated_at();

create table public.preview_views (
  id           bigint generated always as identity primary key,
  site_id      uuid not null references public.sites (id) on delete cascade,
  viewed_at    timestamptz not null default now(),
  device_type  text not null default 'unknown' check (device_type in ('mobile', 'tablet', 'desktop', 'bot', 'unknown'))
);

comment on table public.preview_views is
  'Hit counter per preview. No IP, no cookies, no user-agent string (PRODUCT §5.6).';

create index preview_views_site_idx on public.preview_views (site_id, viewed_at desc);

-- ---------------------------------------------------------------------------
-- Outreach and pipeline
-- ---------------------------------------------------------------------------

create table public.messages (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses (id) on delete cascade,
  site_id           uuid references public.sites (id) on delete set null,
  channel           text not null check (channel in ('viber', 'whatsapp', 'sms', 'email', 'call')),
  kind              text not null check (kind in ('first', 'followup', 'reply')),
  language          text not null check (language in ('sl', 'hr', 'sr-Latn', 'sr-Cyrl', 'bs', 'mk', 'de', 'en')),
  body              text not null,
  prompt_version    text,
  sent_by_human_at  timestamptz,           -- set when the human marks it sent; never sent automatically
  created_at        timestamptz not null default now()
);

create index messages_business_idx on public.messages (business_id, created_at desc);

create table public.pipeline (
  business_id       uuid primary key references public.businesses (id) on delete cascade,
  status            text not null default 'found'
                    check (status in ('found', 'classified', 'site_built', 'reviewed', 'contacted',
                                      'replied', 'won', 'lost', 'do_not_contact')),
  next_action_at    timestamptz,
  deal_value_cents  integer check (deal_value_cents >= 0),
  currency          text check (currency in ('EUR', 'RSD', 'BAM', 'MKD')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint pipeline_deal_needs_currency check (deal_value_cents is null or currency is not null)
);

create index pipeline_status_idx on public.pipeline (status, next_action_at);

create trigger pipeline_set_updated_at
  before update on public.pipeline
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Paying clients (protected: a business with a client row cannot be deleted)
-- ---------------------------------------------------------------------------

create table public.clients (
  business_id          uuid primary key references public.businesses (id) on delete restrict,
  plan                 text not null check (plan in ('start', 'plus')),
  setup_price_cents    integer not null check (setup_price_cents >= 0),
  monthly_price_cents  integer not null check (monthly_price_cents >= 0),
  currency             text not null check (currency in ('EUR', 'RSD', 'BAM', 'MKD')),
  start_date           date,
  domain               text,
  contract_signed_at   timestamptz,
  dpa_signed_at        timestamptz,        -- GDPR Art. 28 data processing agreement (PRODUCT §8)
  status               text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- AI call log (cost tracking and budget cap, PRODUCT §6 and §5.9)
-- ---------------------------------------------------------------------------

create table public.ai_calls (
  id               bigint generated always as identity primary key,
  task             text not null,
  provider         text not null check (provider in ('anthropic', 'google', 'mock')),
  model            text not null,
  prompt_version   text,
  business_id      uuid references public.businesses (id) on delete set null,
  input_tokens     integer not null default 0 check (input_tokens >= 0),
  output_tokens    integer not null default 0 check (output_tokens >= 0),
  cost_usd_micros  bigint not null default 0 check (cost_usd_micros >= 0),
  latency_ms       integer check (latency_ms >= 0),
  ok               boolean not null default true,
  error            text,
  created_at       timestamptz not null default now()
);

create index ai_calls_created_idx on public.ai_calls (created_at);

-- ---------------------------------------------------------------------------
-- Do not contact (permanent; survives deletion of the business row)
-- ---------------------------------------------------------------------------

create table public.do_not_contact (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid references public.businesses (id) on delete set null,
  maps_place_id  text,
  phone_e164     text check (phone_e164 ~ '^\+[1-9][0-9]{6,14}$'),
  email          text check (email = lower(email)),
  reason         text,
  created_at     timestamptz not null default now(),
  -- At least one durable identifier, so the opt-out still works after business_id is set to null.
  constraint do_not_contact_has_identifier check (num_nonnulls(maps_place_id, phone_e164, email) > 0)
);

create unique index do_not_contact_place_key on public.do_not_contact (maps_place_id) where maps_place_id is not null;
create unique index do_not_contact_phone_key on public.do_not_contact (phone_e164) where phone_e164 is not null;
create unique index do_not_contact_email_key on public.do_not_contact (email) where email is not null;

create or replace function public.is_do_not_contact(
  p_maps_place_id text,
  p_phone_e164 text,
  p_email text
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.do_not_contact d
    where (p_maps_place_id is not null and d.maps_place_id = p_maps_place_id)
       or (p_phone_e164 is not null and d.phone_e164 = p_phone_e164)
       or (p_email is not null and d.email = lower(p_email))
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: on everywhere, no policies (see header)
-- ---------------------------------------------------------------------------

alter table public.businesses      enable row level security;
alter table public.searches        enable row level security;
alter table public.search_results  enable row level security;
alter table public.api_cache       enable row level security;
alter table public.classifications enable row level security;
alter table public.sites           enable row level security;
alter table public.preview_views   enable row level security;
alter table public.messages        enable row level security;
alter table public.pipeline        enable row level security;
alter table public.clients         enable row level security;
alter table public.ai_calls        enable row level security;
alter table public.do_not_contact  enable row level security;
