# PRODUCT.md: product spec

> Product name: **Spletko** · Repo: https://github.com/macrorage/findmybusiness Agents: read only the sections your task needs.
> Change this file only when scope changes, and log the change in `PROGRESS.md` → Decisions.

## Contents
1. Vision and one-liner
2. Business model and phases
3. Market and users
4. Reference product analysis (webdesign.so)
5. Features (modules)
6. AI routing and cost
7. Data model
8. Legal and compliance
9. Generated website requirements
10. Roadmap and acceptance criteria
11. Open questions
12. Glossary

---

## 1. Vision and one-liner

**"Find local businesses with no proper website, and pitch them with one that's already finished, in their language and EU-compliant."**

The edge over US tools: **local data** (business registries, not just Maps), **local languages**,
**local channels** (Viber/WhatsApp), and **built-in EU legal compliance** on every site.

---

## 2. Business model and phases

| Phase | Who uses it | How it earns | Goal |
|---|---|---|---|
| **1. In-house agency** | The owner only | Sell sites to local businesses: about €300–600 setup + €15–30/month (hosting, edits, compliance updates) | First 10–20 paying clients; learn which trades and pitches convert |
| **2. SaaS** | Freelancers and agencies in SI, HR, RS, BA, MK, AT, then the EU | Subscription or lifetime licence; users bring their own API keys (like the reference product) or buy credits | Recurring software revenue |

Phase 1 decides Phase 2. Don't build multi-tenant, billing or onboarding until Phase 1 has paying clients.

---

## 3. Market and users

**Countries, in priority order:** Slovenia → Croatia → Serbia → Bosnia and Herzegovina → North Macedonia → Austria (German) → wider EU.

**Starter trades** (Slovenian label / English):
frizer (hairdresser), kozmetični salon (beauty salon), avtoservis / vulkanizer (car repair / tyres),
vodovodar (plumber), električar (electrician), krovec (roofer), mizar (carpenter), gradbeništvo (builder),
gostilna / restavracija (restaurant), zobozdravnik (dentist), fizioterapija (physio), čistilni servis (cleaning),
vrtnarstvo (gardening), **apartmaji / turistične sobe (holiday rentals)**.

**High-value niche: holiday rentals on the Croatian/Slovenian coast.** Owners pay about 15–18% Booking.com
commission. Pitch: a direct-booking site that pays for itself in a few bookings.

**Common local pattern:** a business has only a Facebook page plus a phone number. That counts as a lead.

**Personas**
- *Owner (Phase 1):* runs the tool, reviews each site, sends messages from their own phone.
- *Prospect:* a small business owner, often not technical, prefers a phone call or Viber to email, and is price-sensitive.
- *Agency user (Phase 2):* a freelancer who wants leads + sites + messages with no monthly fee.

---

## 4. Reference product analysis (webdesign.so, checked 2026-11-26)

US product by Indexsy, sold to agencies. **$289 lifetime** (scarcity: "2 left at this price"). Competitors are said to charge about $99/month.

**Flow:** pick a trade + city → Google Maps listings via DataForSEO → keep the ones with no website / Facebook-only / Instagram / link-in-bio / directory page, and show why the others were skipped (for example chains) → generate a site from the listing, using a template per trade → edit with plain-language prompts → a written message per prospect, **which the user sends** (WhatsApp/SMS/email) → reply suggestions → go live on the user's own Cloudflare.

**Model:** users bring their own keys (DataForSEO, the AI model (DeepSeek), Cloudflare), so it costs "a few cents per search/site". Extras: a redesign mode (paste an old site), and "rank and rent" pages (beta, 31 niches, no medical/legal/real estate).

**What to copy:** the finished site *is* the pitch; users bring their own keys; the user sends outreach themselves; skip reasons are shown.
**What to do better:** registry data, local languages, Viber, built-in EU legal pages, domain handling (.si/.hr), and a full pipeline CRM.
**Don't copy:** their brand, wording, design or templates.

---

## 5. Features (modules)

Each module = a folder in `src/lib/<module>` plus UI. Statuses are tracked in `PROGRESS.md`.

### 5.1 Prospect finder
- Input: trade (localized list from §3) + city or radius + country.
- Sources:
  - **Google Maps data** via DataForSEO (default) or the Google Places API. Fields: name, category, address, phone, website, rating, review count, hours, photos count, place_id.
  - **Business registries** (Phase 1.5, after checking their terms):
    SI: AJPES / ePRS, bizi.si · HR: Sudski registar · RS: APR. Useful fields: legal form, registration number, VAT ID, size, website, sometimes email and revenue.
- Matching a Maps listing to a registry entry: normalized name + address + phone; store a confidence score.
- Cache every API response (cost control). Never re-query the same trade+city within N days unless forced.

### 5.2 Classifier
Labels (one primary label plus reasons):
- `no_website`: the website field is empty.
- `social_only`: the website is facebook.com, instagram.com, linktr.ee, or a directory (bizi.si, booking.com, etc.).
- `outdated`: see 5.3.
- `ok`: a decent site (skipped, with the reason).
- `chain`: skip. Signals: same name in many cities, very high review count, a known franchise list.
- `closed`: skip (permanently closed on Maps).
Rule-based first (tested). AI only for unclear cases.

### 5.3 Website checker (for `has_site`)
Code checks: loads? HTTPS? mobile viewport meta? page weight? copyright year in the footer? Last-Modified header? cookie banner present? business details (impressum) present?
Then a screenshot (Playwright) → **Gemini Flash**: "Rate 1–5 how outdated this looks, and give 3 concrete problems." Store the score and reasons. These become the redesign pitch.

### 5.4 Site generator
- Input: the business record (Maps + registry + reviews) + the trade template + the language.
- **Claude** writes the copy and fills a **trade template**. Don't generate free-form HTML from scratch every time: templates keep quality consistent and cost low.
- Templates: 1 per trade group to start (trades, beauty, food, health, holiday rental), each with 2–3 colour/style variants.
- Sections: hero with a call/Viber CTA, services, reviews (only real Maps reviews, quoted with attribution), hours, map, contact, legal pages (§9).
- Images: stock (Unsplash/Pexels license) or AI-generated placeholders. **Don't reuse the prospect's photos or logo without permission** until they buy.
- Plain-language edits: "make it blue", "add a price list" → Claude edits the template data, not raw HTML.
- Preview URL: `preview.<domain>/<slug>`, with `noindex`, and expiring after N days.

### 5.5 Outreach writer
- Generates a short message per prospect in their language, mentioning one concrete detail (rating, review count, "only a Facebook page") plus the preview link.
- Channel variants: **Viber**, **WhatsApp**, SMS, email, phone-call script.
- One-click "copy" and deep links (`viber://`, `https://wa.me/`). **The human presses send.** No bulk or automated sending.
- Follow-up suggestions on day 3 and day 7. Reply helper: pick the reply type ("too expensive", "already have Facebook", "who are you?") → suggested answer.

### 5.6 Pipeline (mini CRM)
Statuses: `found → classified → site_built → contacted → replied → won / lost / do_not_contact`.
Notes, next action date, deal value. **`do_not_contact` is permanent and respected everywhere.**

### 5.7 Deploy and domains
- Won client → deploy to Cloudflare Pages (one project per client) → connect a custom domain.
- Help with `.si` / `.hr` / `.rs` registration (manual checklist in Phase 1, maybe a registrar API later).
- Monthly plan: hosting + small edits + legal text updates.

### 5.8 Phase 2 only: SaaS
Multi-tenant workspaces, users bring their own keys (DataForSEO, AI, Cloudflare), usage/cost shown before each run, billing (Stripe), onboarding, and a localized landing page.

---

## 6. AI routing and cost

All calls go through `src/lib/ai/`, which has a routing table like:

| Task | Model (default) | Fallback | Notes |
|---|---|---|---|
| Classify unclear listings | Gemini Flash | Claude Haiku | Cheap, high volume |
| Screenshot "outdated?" score | Gemini Flash (vision) | Claude Sonnet | Image input |
| Site copy + template fill | Claude Sonnet | Gemini Pro | Quality matters; SL/HR language |
| Outreach messages | Claude Sonnet | Gemini Pro | Tone matters |
| Plain-language site edits | Claude Sonnet | Gemini Pro | Structured JSON output |

- Model IDs live in config, not in code. Look up current IDs in the provider docs when implementing.
- Log tokens and cost per call into the DB. Show the cost per site and per search.
- Ask for structured JSON output wherever possible, and validate it with Zod.

---

## 7. Data model (first draft; Postgres / Supabase)

```
businesses      id, country, name, legal_form, reg_number, vat_id, trade, address, city, lat, lng,
                phone, email, website_url, maps_place_id, rating, review_count, source_flags,
                registry_match_confidence, created_at, updated_at
searches        id, trade, city, country, radius_km, source, cost_eur, result_count, created_at
search_results  search_id, business_id
classifications business_id, label, reasons jsonb, outdated_score, checked_at
sites           id, business_id, template, language, content jsonb, preview_slug, status,
                deployed_url, custom_domain, created_at
messages        id, business_id, channel, language, body, sent_by_human_at, kind (first|followup|reply)
pipeline        business_id, status, next_action_at, deal_value_eur, notes
ai_calls        id, task, provider, model, input_tokens, output_tokens, cost_eur, created_at
do_not_contact  business_id | phone | email, reason, created_at
```

---

## 8. Legal and compliance (not legal advice: verify with a local lawyer before Phase 1 outreach)

- **GDPR:** a sole trader (`s.p.`) is a natural person, so their data is personal data. Store only what's needed; have a lawful-basis note (legitimate interest assessment); honour deletion requests; keep `do_not_contact` lists.
- **Cold outreach:** EU ePrivacy rules (in Slovenia, the electronic communications act ZEKom-2) restrict unsolicited electronic marketing. Rules differ by country and between legal entities and individuals. **Human-sent, one-to-one, personalised messages** with an easy opt-out are the chosen approach. No bulk sending. Verify per country.
- **Data sources:** use official APIs; respect the terms of DataForSEO, Google and each registry. **No scraping of Google Maps.** Registry use: check the terms first (task in PROGRESS).
- **Reviews:** quote real reviews only, with attribution. Never invent reviews or testimonials.
- **Previews:** `noindex`, clearly marked "demo prepared for <business>", taken down on request or after N days.

---

## 9. Generated website requirements (every site, every language)

Must have:
- **Business details / impressum:** company name, address, registration number, VAT ID, contact (EU e-commerce rules; in SI the e-commerce act ZEPT).
- **Privacy policy** (GDPR) and a **cookie banner** with real reject/accept, if any non-essential cookies are used. Prefer cookie-free analytics so no banner is needed.
- **Accessibility baseline** (European Accessibility Act, from June 2025): contrast, alt text, keyboard navigation, semantic HTML, `lang` attribute.
- Mobile-first, Lighthouse ≥ 90 on performance, accessibility and SEO.
- Local SEO: `LocalBusiness` schema.org JSON-LD, title/meta in the local language, an embedded map, hours.
- Correct diacritics (č ć š ž đ) and Cyrillic support (`sr-Cyrl`, `mk`).
- A clear CTA: call, Viber or WhatsApp click-to-chat.

---

## 10. Roadmap and acceptance criteria

| Phase | Scope | Done when |
|---|---|---|
| **0 Foundation** | Repo, app scaffold, DB schema, AI wrapper, i18n | `pnpm dev` runs; schema migrated; one test AI call succeeds via the wrapper |
| **1 Finder** | 5.1 (Maps) + 5.2 + 5.3 + UI | Search "frizer, Maribor" → table of leads with labels and reasons in under 60 s; cost shown |
| **2 Sites** | 5.4 with 3 trade templates, SL + HR | One click → a compliant preview site at a URL; passes the §9 checklist |
| **3 Outreach + CRM** | 5.5 + 5.6 | Copy-ready Viber/WhatsApp/email messages; pipeline board; do-not-contact works |
| **4 Go live** | 5.7 | Won client → live on a custom domain in under 30 min |
| **5 Registries** | Registry matching (5.1) | ≥ 70% of SI Maps leads matched to AJPES/bizi.si with confidence |
| **6 SaaS** | 5.8 | An external user can sign up, add keys and run a search |

---

## 11. Open questions
- Product name and domain.
- DataForSEO vs Google Places (cost and terms per 1,000 listings in SI).
- Registry access: is there an official API or bulk export for AJPES/ePRS? What do bizi.si's terms allow?
- Pricing for Phase 1 clients per country (SI vs RS purchasing power).
- Stock photos vs AI images per trade.
- Phase 2 pricing: lifetime licence vs subscription vs credits.

---

## 12. Glossary
- **s.p.** (samostojni podjetnik): sole trader (SI). A natural person under GDPR.
- **d.o.o.**: limited liability company (SI/HR/RS/BA).
- **obrt**: sole trade (HR).
- **AJPES / ePRS**: Slovenian agency and business register.
- **bizi.si**: Slovenian business directory.
- **Impressum**: the legally required business details page or footer.
- **Lead / prospect**: a business we might pitch.
