# PRODUCT.md: product spec

> Product name: **Spletko** · Repo: https://github.com/macrorage/findmybusiness
> Agents: read only the sections your task needs.
> Change this file only when scope changes, and log the change in `PROGRESS.md` → Decisions.

## Contents
1. Vision and one-liner
2. Business model, phases and KPIs
3. Market and users
4. Reference product analysis (webdesign.so)
5. Features (modules)
6. AI routing, prompts and cost
7. Data model
8. Legal and compliance
9. Generated website requirements
10. Roadmap and acceptance criteria
11. Quality and testing
12. Risks
13. Environment variables
14. Open questions
15. Glossary

Related: `docs/SALES.md` (offer, pricing, message rules, objections).

---

## 1. Vision and one-liner

**"Find local businesses with no proper website, and pitch them with one that's already finished, in their language and EU-compliant."**

The edge over US tools: **local data** (business registries, not just Maps), **local languages**,
**local channels** (Viber/WhatsApp), and **EU legal pages built into every site**.

---

## 2. Business model, phases and KPIs

| Phase | Who uses it | How it earns | Goal |
|---|---|---|---|
| **0.5 Validation** | The owner, by hand | First sales with no product code | Prove local businesses will pay before building |
| **1. In-house agency** | The owner only | Sell sites to local businesses (pricing hypotheses in `docs/SALES.md`) | First 10–20 paying clients; learn which trades and pitches convert |
| **2. SaaS** | Freelancers and agencies in SI, HR, RS, BA, MK, AT, then the EU | Subscription or lifetime licence; users bring their own API keys (like the reference product) or buy credits | Recurring software revenue |

Phase 1 decides Phase 2. Don't build multi-tenant, billing or onboarding until Phase 1 has paying clients.

**KPIs (Phase 1, reviewed weekly; targets are first guesses)**

| Metric | Target |
|---|---|
| Qualified leads found per week | 100+ |
| Personal messages sent per week (human-sent) | 20–40 |
| Reply rate | ≥ 10% |
| Won / contacted | ≥ 3% |
| Average setup price | ≥ €350 (SI/HR) |
| Monthly recurring revenue (MRR) | Track from client #1 |
| Cost per lead / per generated site | Logged automatically (§6) |

**Pivot rule:** if fewer than 2 sales come from 100 personal contacts across at least 2 trades,
change the pitch, price or niche **before** building more features.

---

## 3. Market and users

**Countries, in priority order:** Slovenia → Croatia → Serbia → Bosnia and Herzegovina → North Macedonia → Austria (German) → wider EU.

**Currencies:** EUR (SI, HR, AT), RSD (RS), BAM (BA), MKD (MK). Store money as integer cents plus a currency code. Prices differ per country.

**Starter trades** (Slovenian label / English):
frizer (hairdresser), kozmetični salon (beauty salon), avtoservis / vulkanizer (car repair / tyres),
vodovodar (plumber), električar (electrician), krovec (roofer), mizar (carpenter), gradbeništvo (builder),
gostilna / restavracija (restaurant), zobozdravnik (dentist), fizioterapija (physio), čistilni servis (cleaning),
vrtnarstvo (gardening), **apartmaji / turistične sobe (holiday rentals)**.

**High-value niche: holiday rentals on the Croatian/Slovenian coast.** Owners pay Booking.com commission of
15% or more. Pitch: a direct-booking site that pays for itself in a few bookings. Needs its own template
(inquiry form first; calendar sync later, see §14).

**Common local pattern:** a business has only a Facebook page plus a phone number. That counts as a lead.

**Personas**
- *Owner (Phase 1):* runs the tool, reviews each site, sends messages from their own phone.
- *Prospect:* a small business owner, often not technical, prefers a phone call or Viber to email, price-sensitive, and wary of scams.
- *Agency user (Phase 2):* a freelancer who wants leads + sites + messages with no monthly fee.

---

## 4. Reference product analysis (webdesign.so, checked 2026-11-26)

US product by Indexsy, sold to agencies. **$289 lifetime** (scarcity: "2 left at this price"). Competitors are said to charge about $99/month.

**Flow:** pick a trade + city → Google Maps listings via DataForSEO → keep the ones with no website / Facebook-only / Instagram / link-in-bio / directory page, and show why the others were skipped (for example chains) → generate a site from the listing, using a template per trade → edit with plain-language prompts → a written message per prospect, **which the user sends** (WhatsApp/SMS/email) → reply suggestions → go live on the user's own Cloudflare.

**Model:** users bring their own keys (DataForSEO, the AI model (DeepSeek), Cloudflare), so it costs "a few cents per search/site". Extras: a redesign mode (paste an old site), and "rank and rent" pages (beta, 31 niches, no medical/legal/real estate).

**What to copy:** the finished site *is* the pitch; users bring their own keys; the user sends outreach themselves; skip reasons are shown.
**What to do better:** registry data, local languages, Viber, EU legal pages, link previews that show the prospect's own site, domain handling (.si/.hr), lead scoring, and a full pipeline CRM.
**Don't copy:** their brand, wording, design or templates.

---

## 5. Features (modules)

Each module = a folder in `src/lib/<module>` plus UI. Statuses are tracked in `PROGRESS.md`.

### 5.1 Prospect finder
- Input: trade (from `src/trades/`, §5.5) + city or radius + country.
- Sources:
  - **Google Maps data** via DataForSEO (default) or the Google Places API. Fields: name, category, address, phone, website, rating, review count, hours, photos count, place_id, permanently-closed flag.
  - **Business registries** (Phase 5, after checking their terms):
    SI: AJPES / ePRS, bizi.si · HR: Sudski registar · RS: APR. Useful fields: legal form, registration number, VAT ID, size, website, sometimes email and revenue.
- Matching a Maps listing to a registry entry: normalized name + address + phone; store a confidence score.
- **Deduplicate** across searches by `maps_place_id`, then normalized phone, then registration number. A business is stored once, however many searches find it.
- Cache every API response (cost control). Never re-query the same trade+city within N days (config, default 30) unless forced. Respect each provider's caching limits.
- Show the **estimated cost before** each search runs.

### 5.2 Classifier
Labels (one primary label plus reasons):
- `no_website`: the website field is empty.
- `social_only`: the website is facebook.com, instagram.com, linktr.ee, or a directory (bizi.si, booking.com, etc.). Keep the domain list in config.
- `outdated`: see 5.4.
- `ok`: a decent site (skipped, with the reason).
- `chain`: skip. Signals: same name in many cities, very high review count, a known franchise list.
- `closed`: skip (permanently closed on Maps).

Also derive **contact channels** from the phone number with `libphonenumber-js`: mobile → Viber/WhatsApp/SMS possible;
landline → call only. (Example: Slovenian mobile numbers start with 030, 031, 040, 041, 051, 064, 065, 068, 069, 070 or 071. Let the library decide; don't hard-code.)

Rule-based first, with unit tests. AI only for unclear cases.

### 5.3 Lead scoring
Rank leads so the human contacts the best ones first. Score 0–100; first version (tune after validation):

| Signal | Points |
|---|---|
| `no_website` | +30 |
| `social_only` | +25 |
| `outdated` with score ≥ 4/5 | +20 |
| Mobile number (Viber/WhatsApp possible) | +15 |
| Rating ≥ 4.3 **and** ≥ 15 reviews (active, reputable) | +15 |
| High-value trade (`valueTier: high` in the trade config) | +10 |
| Registry: revenue or size above threshold | +10 |
| `chain`, `closed`, or on `do_not_contact` | excluded |

Store the score **and** its breakdown so the UI can show why a lead ranks high.

### 5.4 Website checker (for businesses that have a site)
Code checks: loads? HTTPS? mobile viewport meta? page weight? copyright year in the footer? Last-Modified header? cookie banner present? business details (impressum) present?
Then a screenshot (Playwright) → **Gemini Flash**: "Rate 1–5 how outdated this looks, and give 3 concrete problems." Store the score and reasons.
For the redesign pitch, produce a **before/after image** (old site screenshot next to the new one).

### 5.5 Site generator
**Trade configs** are data, not code: one JSON file per trade in `src/trades/`. Example:
```json
{
  "id": "frizer",
  "labels": { "sl": "Frizerski salon", "hr": "Frizerski salon", "en": "Hair salon" },
  "mapsCategories": ["hair_salon", "barber_shop"],
  "schemaOrgType": "HairSalon",
  "templateGroup": "beauty",
  "defaultServices": { "sl": ["Striženje", "Barvanje", "Feniranje"] },
  "primaryCta": "call",
  "imageQueries": ["hair salon interior", "hairdresser at work"],
  "valueTier": "medium"
}
```

**Site content schema** (Zod, in `src/lib/sitegen/schema.ts`). This is the contract between AI, templates and the editor:
`lang`, `business` (name, phone, address, geo, hours, legal details), `theme` (palette, font pair),
`seo` (title, description), `hero` (headline, subline, cta), `services[]`, `about`, `reviews[]` (author, rating, text, source, date),
`gallery[]` (image url, alt, license source), `contact` (form on/off, channels), `legal` (impressum, privacy, cookies).

Generation:
- Input: the business record (Maps + registry + reviews) + the trade config + the language.
- **Claude** fills the content schema (JSON output, validated). Templates render it. Don't generate free-form HTML each time: templates keep quality consistent and cost low.
- Templates: 1 per template group to start (trades, beauty, food, health, holiday rental), each with 2–3 palette/font variants.
- Sections: hero with a call/Viber CTA, services, reviews (only real Maps reviews, quoted with attribution), hours, map, contact, legal pages (§9).
- Images: licensed stock (Unsplash/Pexels) or AI-generated, with the source stored per image. **Don't reuse the prospect's photos or logo without permission** until they buy.
- Plain-language edits: "make it blue", "add a price list" → Claude edits the content JSON, not raw HTML.
- **Link preview image (Open Graph, 1200×630):** a screenshot of the prospect's own new hero. When the link is pasted in Viber/WhatsApp, the prospect sees *their* site in the chat. This is the most important conversion detail.
- **Contact form** (client sites): Cloudflare Pages Function → email to the business (via an email API). Spam protection: Cloudflare Turnstile. Consent text + a privacy link.
- Preview URL: `https://<preview-domain>/<slug>`, on a **separate domain** from the product brand (if a link scanner flags the preview domain, the main brand isn't hurt). `noindex`, a small "demo prepared for <business>" note, expires after N days (default 30).

### 5.6 Outreach writer
- Generates a short message per prospect in their language, using the rules and examples in `docs/SALES.md`: one concrete detail (rating, review count, "only a Facebook page") plus the preview link.
- Channel variants: **Viber**, **WhatsApp**, SMS, email, phone-call script. Only offer channels the phone type allows (§5.2).
- One-click "copy" and deep links (`viber://`, `https://wa.me/`). **The human presses send.** No bulk or automated sending.
- Follow-up suggestions on day 3; after that, a phone call; then stop. Reply helper: pick the reply type ("too expensive", "already have Facebook", "who are you?") → suggested answer.
- **Preview views:** count hits per preview slug (time and device type only, no IP, no cookies), so the human knows who opened the link and when to follow up.

### 5.7 Pipeline (mini CRM)
Statuses: `found → classified → site_built → reviewed → contacted → replied → won / lost / do_not_contact`.
- `reviewed` = the human (ideally a native speaker) checked the site and the message. **Nothing is contacted without review.**
- Notes, next-action date, deal value, preview views.
- **`do_not_contact` is permanent and respected everywhere**, including future searches (checked by place_id, phone, email).

### 5.8 Deploy, domains and after-sale
- Won client → deploy to Cloudflare Pages (one project per client) → connect a custom domain.
- The domain is registered **in the client's name** (they own it); the cost is passed through. `.si` / `.hr` / `.rs` help: a checklist in Phase 1, maybe a registrar API later.
- After go-live: help the client set the website link on their **Google Business Profile** (they do it, or grant manager access). This is where most local traffic comes from.
- Monthly plan: hosting + small edits + legal text updates.
- **Offboarding:** if a client cancels, give them a static export (zip) of their site. Write this into the contract.

### 5.9 Auth, ops and cost control
- Phase 1: a single user. Supabase Auth with one allowed email (`ALLOWED_ADMIN_EMAIL`). Row Level Security on from the start.
- **Monthly AI + data budget cap** (`MONTHLY_BUDGET_EUR`): block new runs when it's reached, and show spend on the dashboard.
- Backups: a weekly database dump (the Supabase free tier has limited backups).
- Errors: log server errors (Sentry free tier or similar).
- Data retention: delete leads that were never contacted after 12 months, and contacted-no-reply after 6 months (§8).

### 5.10 Phase 2 only: SaaS
Multi-tenant workspaces, users bring their own keys (DataForSEO, AI, Cloudflare), usage/cost shown before each run, billing (Stripe), onboarding, and a localized landing page.

---

## 6. AI routing, prompts and cost

All calls go through `src/lib/ai/`, which has a routing table like:

| Task | Model (default) | Fallback | Notes |
|---|---|---|---|
| `classify` (unclear listings) | `gemini-3.5-flash-lite` | `claude-opus-5-5` (effort low) | Cheap, high volume |
| `outdated_vision` (screenshot score) | `gemini-3.5-flash-lite` | `claude-opus-5-5` (effort low) | Image input |
| `site_content` (JSON) | `claude-opus-5-5` (effort medium) | `gemini-3.8-flash` | Quality matters; SL/HR language |
| `outreach` | `claude-opus-5-5` (effort medium) | `gemini-3.8-flash` | Tone matters |
| `site_edit` | `claude-opus-5-5` (effort low) | `gemini-3.8-flash` | Structured JSON output |

Source of truth: `src/lib/ai/routing.ts` (routes) and `src/lib/ai/models.ts` (prices, checked 2026-11-26).
Cheaper Claude models (`claude-sonnet-5-5` at $2/$10, `claude-haiku-5-5` at $0.10/$0.50 per 1M tokens) are
priced in `models.ts`; switching to them is the owner's decision. Every Claude request also sends Anthropic's
server-side refusal fallback (`fallbacks: "default"`, beta `server-side-fallback-2026-07-01`).

- **API keys are separate from chat subscriptions.** A Claude Pro/Max or Gemini app subscription does *not* pay for API calls. The product needs an Anthropic API key (console.anthropic.com) and a Gemini API key (Google AI Studio), both pay-per-use.
- Model IDs live in config, not in code. Look up current IDs in the provider docs when implementing.
- **Prompts are files** in `src/prompts/<task>.md`, with a `version:` line at the top. Code loads them, so both AI coding tools can improve prompts without touching logic.
- Ask for structured JSON output wherever possible, and validate it with Zod. On a validation failure: retry once with the error, then fall back.
- Log tokens and cost per call into `ai_calls`. Show the cost per site and per search.
- The wrapper must have a **mock provider** so tests and local development run without keys or cost.

---

## 7. Data model (Postgres / Supabase)

**Source of truth: `supabase/migrations/`** (first one: `20261126120000_initial_schema.sql`).
Tested by `tests/db/schema.test.ts`, which applies every migration to an in-memory Postgres (PGlite).
This section is only an overview; if it disagrees with the migrations, the migrations win.

```
businesses      one row per real business; dedupe keys: maps_place_id (unique), (country, reg_number) (unique)
searches        trade + city + country + source; estimated and actual cost (micro-USD)
search_results  which businesses a search returned, with rank
api_cache       raw provider responses with expires_at (never pay twice for the same query)
classifications one current row per business: label, reasons, contact_channels, outdated_score,
                lead_score, score_breakdown
sites           generated site: template, language, content jsonb, content_version (+1 per edit),
                preview_slug (unique, URL-safe), og_image_url, status, expires_at, deployed_url, custom_domain
preview_views   site_id, viewed_at, device_type          -- no IP, no cookies, no user agent
messages        business, site, channel, kind, language, body, prompt_version, sent_by_human_at
pipeline        one row per business: status, next_action_at, deal value (cents + currency), notes
clients         paying clients: plan, prices (cents + currency), domain, contract and DPA dates, status;
                a business with a client row cannot be deleted
ai_calls        task, provider, model, prompt_version, tokens, cost (micro-USD), latency, ok/error
do_not_contact  maps_place_id / phone_e164 / email (at least one), reason; survives business deletion;
                check with is_do_not_contact(place_id, phone, email)
```

**Conventions:** status columns are text + CHECK (not enums). Customer money = integer cents + currency.
Provider costs = integer **micro-USD** (AI calls cost fractions of a cent), converted to EUR only for display
and the budget cap. RLS is on for every table with no policies in Phase 1; only server code with the
service-role key reads and writes.

---

## 8. Legal and compliance (not legal advice: verify with a local lawyer or accountant before Phase 1 outreach)

**Prospect data**
- **GDPR:** a sole trader (`s.p.`) is a natural person, so their data is personal data. Store only what's needed; write a legitimate-interest assessment; honour access and deletion requests; keep `do_not_contact`; apply the retention limits in §5.9.
- **No real prospect or client data in git.** The repo may be public. Fixtures and seeds use invented businesses only.
- **Cold outreach:** EU ePrivacy rules (in Slovenia, the electronic communications act ZEKom-2) restrict unsolicited electronic marketing. Rules differ by country and between legal entities and individuals. **Human-sent, one-to-one, personalised messages** with an easy opt-out are the chosen approach. No bulk sending. Verify per country.
- **Data sources:** use official APIs; respect the terms of DataForSEO, Google and each registry, including caching limits. **No scraping of Google Maps.** Registry use: check the terms first (task in PROGRESS).
- **Reviews:** quote real reviews only, with attribution. Never invent reviews or testimonials.
- **Previews:** `noindex`, clearly marked as a demo, taken down on request or on expiry.

**Running the agency (Phase 1)**
- Invoicing needs a registered business (in SI: `s.p.` or `d.o.o.`). Cash payments have fiscal-invoice rules in SI and HR; bank transfer or card is simpler. Check with an accountant.
- **Client contract** (template needed before the first sale): scope, price, monthly plan and what it includes, the client owns the domain and their content, cancellation and site export, the client is responsible for content they supply.
- **Data processing agreement (GDPR Art. 28):** if client contact forms pass through our systems, we are a processor for the client. Include a DPA in the contract.
- Images: licensed stock only; keep the license source per image (§5.5).

**Accessibility:** the European Accessibility Act (applies since June 2025) covers specific services such as e-commerce and banking, and **micro-enterprises providing services are exempt**. Most clients are micro-enterprises, so it's usually not legally required, but every site still targets WCAG 2.1 AA: it's cheap to do in templates, helps SEO, and covers clients who sell online.

---

## 9. Generated website requirements (every site, every language)

Must have:
- **Business details / impressum:** company name, address, registration number, VAT ID, contact (EU e-commerce rules; in SI the e-commerce act ZEPT).
- **Privacy policy** (GDPR). **No third-party trackers by default**: use cookie-free analytics, so no cookie banner is needed. If a client wants non-essential cookies, add a banner with real reject/accept.
- **Accessibility:** WCAG 2.1 AA target (§8): contrast, alt text, keyboard navigation, semantic HTML, a correct `lang` attribute.
- Mobile-first, Lighthouse ≥ 90 on performance, accessibility and SEO.
- Local SEO: `LocalBusiness` (or the trade's `schemaOrgType`) JSON-LD, title/meta in the local language, an embedded map, hours.
- Open Graph image and favicon (§5.5).
- Contact form with spam protection and consent text, if enabled (§5.5).
- Correct diacritics (č ć š ž đ) and Cyrillic support (`sr-Cyrl`, `mk`).
- A clear CTA: call, Viber or WhatsApp click-to-chat.

---

## 10. Roadmap and acceptance criteria

| Phase | Owner | Scope | Done when |
|---|---|---|---|
| **0 Foundation** | AI tools | Repo, app scaffold, DB schema, AI wrapper with a mock provider, content schema + trade config format, i18n | `pnpm dev` runs; schema migrated locally; a test AI call succeeds via the wrapper (mock and real) |
| **0.5 Validation** | **Human**, alongside Phase 0 | 2 trades × 2 cities; 25 leads found by hand on Maps; 5 sites made with Claude chat; 25 personal messages; calls to non-responders; results in a sheet | Real reply and close numbers exist (§2 KPIs) |
| **1 Finder** | AI tools | §5.1 (Maps), §5.2, §5.3, §5.4 + UI | Search "frizer, Maribor" → ranked leads with labels, reasons and contact channels in under 60 s; cost shown before and after |
| **2 Sites** | AI tools | §5.5 with 3 template groups, SL + HR | One click → a preview site at a URL with an OG image; passes §9 and the §11 checks |
| **3 Outreach + CRM** | AI tools | §5.6 + §5.7 | Copy-ready Viber/WhatsApp/email messages; pipeline board; preview views; do-not-contact works |
| **4 Go live** | AI tools + human | §5.8 | Won client → live on their own domain in under 30 min; export works |
| **5 Registries** | AI tools | Registry matching (§5.1) | ≥ 70% of SI Maps leads matched to AJPES/bizi.si with confidence |
| **6 SaaS** | AI tools | §5.10 | An external user can sign up, add keys and run a search |

---

## 11. Quality and testing

- **Unit tests (Vitest):** classifier rules, lead scoring, phone parsing, dedupe, parsers, cost estimates.
- **Golden set:** 10 *invented* businesses in `tests/golden/` (mixed trades and languages). After any prompt or template change, regenerate them and compare screenshots plus the automatic checks below. Record the prompt version.
- **Automatic checks on every generated site:** content JSON validates; HTML is valid; Lighthouse ≥ 90; axe: zero serious accessibility violations; all links work; impressum and privacy pages exist; `lang` is correct; **no placeholder text left** (`Lorem`, `TODO`, `[`, `{{`).
- **Human check (Phase 1):** a native speaker reads every site and message before it's sent (pipeline status `reviewed`). Grammar mistakes in Slovenian or Croatian destroy trust instantly.
- **Definition of done for code tasks:** see `AGENTS.md` §3.2.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Local businesses won't pay enough | Phase 0.5 validation; country-specific prices; pivot rule (§2) |
| Messages look like spam or a scam | Personal tone, real name and phone, company details, the preview uses their real data, a link preview showing their site, a follow-up call; low volume |
| Data-source terms (Google, DataForSEO, registries) | Official APIs only; read the terms; respect caching limits |
| GDPR complaint | Minimal data, opt-out, `do_not_contact`, retention limits, no data in git, legitimate-interest note |
| Weak Slovenian/Croatian copy | Native review before sending; golden set; Claude for copy |
| AI and data costs grow | Caching, cost shown before runs, monthly budget cap |
| Monthly-plan clients cancel | Real value in the plan: edits, Google Business Profile help, legal updates |
| A local competitor appears | Speed, local relationships, compliance angle, registry data |
| Multi-tool chaos (two tools undo each other) | `AGENTS.md` protocol: one tool at a time, pull/push every session, decisions log |

---

## 13. Environment variables (mirror in `.env.example`, no real values)

```
ANTHROPIC_API_KEY=            # console.anthropic.com (pay per use, not the Claude subscription)
GEMINI_API_KEY=               # Google AI Studio
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=
GOOGLE_PLACES_API_KEY=        # optional alternative source
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=    # server only
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
PREVIEW_BASE_URL=             # separate preview domain
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
EMAIL_API_KEY=                # contact-form forwarding (e.g. Resend/Postmark)
ALLOWED_ADMIN_EMAIL=
MONTHLY_BUDGET_EUR=50
AI_PROVIDER_MODE=mock         # mock | live
```

---

## 14. Open questions
- Product domain, and a separate preview domain.
- DataForSEO vs Google Places: cost and terms per 1,000 listings in SI.
- Registry access: is there an official API or bulk export for AJPES/ePRS? What do bizi.si's terms allow?
- Final prices per country (after Phase 0.5).
- Stock photos vs AI images per trade.
- Holiday-rental template: inquiry form only, or calendar sync with Booking/Airbnb (iCal) in a later phase?
- Show prices on client sites by default?
- Phase 2 pricing: lifetime licence vs subscription vs credits.

---

## 15. Glossary
- **s.p.** (samostojni podjetnik): sole trader (SI). A natural person under GDPR.
- **d.o.o.**: limited liability company (SI/HR/RS/BA).
- **obrt**: sole trade (HR).
- **AJPES / ePRS**: Slovenian agency and business register.
- **bizi.si**: Slovenian business directory.
- **Impressum**: the legally required business details page or footer.
- **OG image**: the Open Graph image a chat app shows when a link is pasted.
- **Golden set**: fixed test businesses used to check generation quality after changes.
- **Lead / prospect**: a business we might pitch.
