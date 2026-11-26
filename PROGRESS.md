# PROGRESS.md: live project state

> Read `AGENTS.md` first. Update this file at milestones and **always before you stop** (AGENTS.md §3.4).
> If this file and `git log` disagree, git wins: fix this file first.

**Last updated:** 2026-11-26 by claude · **Phase:** 0 (setup) · **Build status:** ✅ `pnpm check` and `pnpm build` pass

---

## ▶ In progress
_Nothing. The next tool takes the top unblocked item from "Next up" (#12, Find prospects UI)._

<!-- Format when filled:
**Task:** <name>  · **Owner:** <tool>  · **Started:** <date>
- Done so far: ...
- Exact next step: <file> → <function/section> → <what is left>
- Gotchas: ...
-->

---

## ⏭ Next up (ordered: take the top one that isn't waiting on a 👤 human task)

**Phase 0: foundation** (PRODUCT §10)
1. [x] `git init`, `.gitignore`, first commit with these docs, push to `https://github.com/macrorage/findmybusiness`.
2. [x] Scaffold Next.js + TypeScript (strict) + Tailwind + pnpm. Add Vitest, ESLint, and `lint` / `typecheck` / `test` scripts. Create `.env.example` from PRODUCT §13. Create the folder layout from AGENTS.md §5.
3. [x] DB schema from PRODUCT §7 as an SQL migration in `supabase/migrations/`, tested with PGlite (`tests/db/schema.test.ts`).
   - [ ] Still open: apply it with `pnpm db:start` (needs **Docker Desktop running**), and to the hosted project (👤 H1: `pnpm exec supabase link` + `pnpm exec supabase db push`).
4. [x] `src/lib/ai/`: provider-agnostic wrapper (Claude + Gemini), a `task → model` routing table in config, **mock provider first** (`AI_PROVIDER_MODE=mock`), Zod-validated JSON output, cost logging hook (`configureAi({ log })`).
   - [ ] Still open: a DB logger writing `ai_calls` + the monthly budget check in `beforeCall` (needs Supabase); a live smoke test with real keys (👤 H1).
5. [x] Site content schema (Zod) in `src/lib/sitegen/schema.ts` + trade config format (`src/lib/trades.ts`) + 7 trades in `src/trades/` (frizer, kozmeticni-salon, avtoservis, vodovodar, elektricar, gostilna, apartmaji).
6. [x] i18n setup with `sl` + `en` (`src/i18n/`; UI language from `APP_LOCALE`, default `sl`).
7. [x] `tests/golden/`: 10 **invented** businesses (`businesses.json`, 7 SL + 3 HR, every classifier outcome) + loader and validity tests. Shared listing shape: `src/lib/prospect.ts`.

**Phase 1: prospect finder** (needs 👤 H1 for DataForSEO)
8. [x] `src/lib/maps/`: DataForSEO Google Maps client (request, parsing, cost estimate), demo source for mock mode.
   - [ ] Still open: first live run (👤 H1) to confirm the keyword strategy and that `language_code: "en"` gives English categories; DB cache (`api_cache`) and dedupe on save (needs Supabase).
9. [x] `src/lib/classify/`: rule-based labels + phone type / contact channels via libphonenumber-js. Golden set passes.
10. [x] `src/lib/score/`: lead score with a breakdown (PRODUCT §5.3).
11. [x] `src/lib/checker/`: HTML checks + rule score, public-URL guard, Playwright phone screenshot → `outdated_vision` AI score (prompt `src/prompts/outdated_vision.md` v1), rules fallback.
   - [ ] Still open: live AI scoring needs keys (👤 H1). Chromium: `pnpm exec playwright install chromium` once per machine.
12. [ ] UI: "Find prospects" page (trade dropdown in Slovenian + city) → ranked table with label badges, reasons, channels and cost.
13. [ ] `src/lib/registry/`: **research only**: AJPES/ePRS and bizi.si access and terms → `docs/decisions/0001-registry-access.md`. No scraping.

**Phase 2+:** see PRODUCT §10 (roadmap).

---

## 👤 Human tasks (only the human can do these; can run in parallel with coding)
- [ ] **H1 Accounts and API keys.** Put them in a local `.env`, never in git.
  - Anthropic API key at console.anthropic.com (pay per use; **separate from the Claude subscription**).
  - Gemini API key at Google AI Studio.
  - Supabase project, DataForSEO account, Cloudflare account.
- [ ] **H2 Validation sprint** (PRODUCT §10, Phase 0.5): 2 trades × 2 cities, 25 leads by hand, 5 sites with Claude chat, 25 personal messages, follow-up calls. Write the results here.
- [ ] **H3 Legal and admin:** a lawyer or accountant checks outreach rules (SI/HR), a client contract + DPA template, invoicing setup (`s.p.` or `d.o.o.`). PRODUCT §8.
- [ ] **H4 Domains:** a product domain + a **separate** preview domain.
- [ ] **H5 Repo visibility:** the GitHub repo is **public**. Decide whether to make it private.
- [ ] **H6 Native-speaker reviewer** for Slovenian (and later Croatian) sites and messages.

---

## ⛔ Blockers / open decisions
- [x] Product name: **Spletko** (chosen 2026-11-26).
- [ ] Maps data source: DataForSEO (pay per use) or Google Places API? **Default: DataForSEO.**
- [ ] Claude model for sites and messages: **default `claude-opus-5-5`** (about $0.07 per generated site). Cheaper `claude-sonnet-5-5` / `claude-haiku-5-5` are priced in `src/lib/ai/models.ts`; switching is the owner's call (one line in `src/lib/ai/routing.ts`).

---

## 🧭 Decisions (append-only; one line each, newest at the bottom)
| Date | Decision | Why | By |
|---|---|---|---|
| 2026-11-26 | Multi-tool workflow: AGENTS.md + PROGRESS.md + git as the handoff mechanism | No single tool has enough quota; any tool must be able to resume | human + claude |
| 2026-11-26 | The product **writes** outreach and the **human sends it**. No auto-sending | GDPR/ePrivacy risk; same model as the reference product | human + claude |
| 2026-11-26 | Phase 1 = in-house agency use; Phase 2 = SaaS | Validate sales before building SaaS features | human + claude |
| 2026-11-26 | Stack (provisional): Next.js, TS, Tailwind, Supabase, Cloudflare Pages | Free tiers, AI tools know them well | claude |
| 2026-11-26 | AI routing: Gemini Flash = classify/vision; Claude = site and copy generation | Cost vs. quality | claude |
| 2026-11-26 | One tool at a time; `git pull` at the start and `git push` at the end of every session | Avoid tools overwriting each other | claude |
| 2026-11-26 | Sites are generated as **content JSON + templates**, not free-form HTML | Consistent quality, cheap edits, testable | claude |
| 2026-11-26 | AI wrapper gets a mock provider first | Build and test without keys or cost | claude |
| 2026-11-26 | No real prospect data in git; golden set = invented businesses | GDPR; the repo may be public | claude |
| 2026-11-26 | Every site and message is reviewed by a human before contact (`reviewed` status) | Language quality and trust | claude |
| 2026-11-26 | Next.js 16.4 + React 19.3 + Tailwind 4.3 (create-next-app defaults, incl. `cacheComponents`), ESLint 9 flat config, Vitest 5 | Current stable versions; scaffold defaults keep it standard | claude |
| 2026-11-26 | Node `^22.12 \|\| ^24 \|\| >=26` (`engines`) | Vitest 5 requirement | claude |
| 2026-11-26 | `typecheck` = `next typegen && tsc --noEmit` | `LayoutProps`/route types are generated; works on a fresh clone without a build | claude |
| 2026-11-26 | Next.js agent-rules block kept at the end of AGENTS.md | `next dev` re-adds it otherwise, leaving a dirty tree | claude |
| 2026-11-26 | Fonts load `latin-ext` + `cyrillic` subsets; `<html lang="sl">` until i18n | č ć š ž đ and sr-Cyrl/mk must render | claude |
| 2026-11-26 | Migrations are the schema's source of truth; tested on PGlite in Vitest | Works for every tool without Docker or keys | claude |
| 2026-11-26 | Status columns = text + CHECK, not enums | Easier to extend in later migrations | claude |
| 2026-11-26 | Provider costs (AI, DataForSEO) stored as integer micro-USD; customer money as cents + currency | AI calls cost fractions of a cent; providers bill in USD | claude |
| 2026-11-26 | Phase 1 security: RLS on everywhere, **no policies**; all DB access server-side with the service-role key after the admin email check | Simplest safe setup for one user; Phase 2 adds tenant policies | claude |
| 2026-11-26 | Added `api_cache` table and `is_do_not_contact()` function (not in the first PRODUCT draft) | Needed for §5.1 caching and §5.7 opt-outs | claude |
| 2026-11-26 | Supabase CLI and PGlite installed as dev dependencies (`pnpm exec supabase …`) | Same CLI version for every tool, no global install | claude |
| 2026-11-26 | AI SDKs: `@anthropic-ai/sdk` (beta `messages.parse` + `betaZodOutputFormat`), `@google/genai` (`responseJsonSchema` from `z.toJSONSchema`), Zod 4 | Official SDKs; structured output validated by Zod | claude |
| 2026-11-26 | Claude calls send `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`); no `thinking`/`temperature` params (Opus 5.5 rejects them); depth set with `output_config.effort` | Current Claude API rules; refusals auto-rerouted | claude |
| 2026-11-26 | Gemini models: `gemini-3.5-flash-lite` (classify/vision), `gemini-3.8-flash` (fallback for Claude tasks) | Checked on Google's model and pricing pages 2026-11-26; `gemini-2.5-*` is being retired | claude |
| 2026-11-26 | Callers use `generateText` / `generateObject(req, zodSchema)`; mock responders via `setMockResponder(task, fn)` | Typed results; mock mode fails loudly on missing fixtures | claude |
| 2026-11-26 | Site content = `SiteCopySchema` (AI writes) + facts from data (name, phone, address, hours, legal, real reviews) in `SiteContentSchema` | The AI can't invent phones or reviews (PRODUCT §8) | claude |
| 2026-11-26 | Trades are JSON files registered in `src/trades/index.ts` (static imports) | Works in the Next.js bundle; a test catches unregistered files | claude |
| 2026-11-26 | UI i18n = typed dictionaries (`sl` is the source; `en: Dictionary` must match), language from `APP_LOCALE`, no locale routing | One Slovenian user in Phase 1; avoids dynamic per-request APIs; per-user locale in Phase 2 | claude |
| 2026-11-26 | `Prospect` (src/lib/prospect.ts) is the one normalized listing shape every source must produce | Classifier, scorer and sitegen stay source-agnostic | claude |
| 2026-11-26 | Classifier pre-check label `needs_check` for businesses with their own site; the checker (#11) turns it into `outdated` or `ok` before storing | DB stores only final labels | claude |
| 2026-11-26 | One switch `AI_PROVIDER_MODE` (mock/live) controls AI **and** Maps data; mock Maps = deterministic "Demo …" businesses | One place to go live; UI demoable without keys | claude |
| 2026-11-26 | DataForSEO query: keyword = local trade word + city, `location_name` = country, `language_code: "en"` | No dependency on exact DataForSEO city names; English categories match trade configs. Verify on first live run | claude |
| 2026-11-26 | Chain rules: known-name list, ≥1000 reviews, or same name in ≥3 cities of one batch. Chat channels only for MOBILE numbers (libphonenumber-js `max` metadata) | Simple, testable first version; tune after validation | claude |
| 2026-11-26 | Checker: outdated if score ≥ 3 (1 = modern, 5 = very old); unreachable site = score 5; only public http(s) URLs are fetched | A broken site is a strong lead; Maps URLs are untrusted input | claude |
| 2026-11-26 | Real-browser tests are opt-in (`RUN_BROWSER_TESTS=1`) | Default suite stays offline and fast | claude |
| 2026-11-26 | No dentist/health trade yet | Healthcare advertising has extra rules; add after the legal check (H3) | claude |

---

## 📓 Session log (newest first, keep the last 10)

<!-- Template, copy for each session:
### YYYY-MM-DD · <tool> · <one-line summary>
- Did: ...
- Commits: <short hashes>
- Left unfinished: ...
- Next tool should: ...
-->

### 2026-11-26 · claude · Website checker (Next up #11)
- Did: `src/lib/checker/` (html.ts checks + rule score, url-guard.ts, index.ts checkWebsite + takeScreenshot), first prompt file `src/prompts/outdated_vision.md`, Playwright + Chromium installed. 11 new tests + 1 opt-in browser test.
- Verified: `pnpm check` passes (92 tests); browser smoke test passed (real screenshot of example.com).
- Next tool should: start #12.

### 2026-11-26 · claude · Maps client, classifier, lead score (Next up #8–#10)
- Did: `src/lib/maps/` (DataForSEO request + lenient parsing, cost estimate, demo source), `src/lib/classify/` (closed/chain/social/own-site rules, phone type + channels), `src/lib/score/` (points + breakdown). Fixed fake landline numbers in the golden set (some were really mobile prefixes). 27 new tests.
- Verified: `pnpm check` passes (82 tests). No live DataForSEO call (H1).
- Next tool should: start #11.

### 2026-11-26 · claude · Golden set (Next up #7)
- Did: `src/lib/prospect.ts` (normalized listing), `tests/golden/` (10 invented businesses, README, loader, 4 tests).
- Verified: `pnpm check` passes (55 tests).
- Next tool should: start #8.

### 2026-11-26 · claude · i18n (Next up #6)
- Did: `src/i18n/` (sl source, en, `getDictionary`, `fmt`, `intlLocale`), UI strings for finder, labels, channels, pipeline, countries. Layout `lang` and home page use it. `APP_LOCALE` in env. 3 new tests (key and placeholder parity).
- Verified: `pnpm check` (51 tests) and `pnpm build` pass.
- Next tool should: start #7.

### 2026-11-26 · claude · Site content schema + trades (Next up #5)
- Did: `src/lib/sitegen/schema.ts` (languages, AI copy schema, facts, legal, reviews, gallery, full site content), `src/lib/trades.ts` + 7 trade JSONs with sl/hr/en labels, keywords, Maps categories, services. 11 new tests (incl. Claude and Gemini schema conversion).
- Verified: `pnpm check` passes (48 tests).
- Next tool should: start #6.

### 2026-11-26 · claude · AI wrapper (Next up #4)
- Did: `src/lib/ai/` (types, models + prices, routing, errors, prompt loader, providers: anthropic / google / mock, `generateText` / `generateObject` with retry-once-on-invalid-JSON and fallback route). `src/lib/env.ts` (Zod-validated env). 21 new tests (mocked SDKs check the exact request shape). PRODUCT §6 table updated.
- Verified: `pnpm check` passes (37 tests). No live API call was made (no keys yet: H1).
- Next tool should: start #5.

### 2026-11-26 · claude · DB schema (Next up #3)
- Did: `supabase init` (config in `supabase/config.jsonc`, Postgres 17), migration `20261126120000_initial_schema.sql` with 12 tables, dedupe keys, CHECK constraints, `updated_at` triggers, `is_do_not_contact()`, RLS on all tables. `tests/db/schema.test.ts` (13 tests on PGlite). Scripts `db:start` / `db:stop` / `db:reset` / `db:new`. PRODUCT §7 now points to the migrations.
- Verified: `pnpm check` passes (16 tests).
- Not done: `supabase start` was not run, because Docker isn't running on this machine. The hosted project waits on H1.
- Next tool should: start #4 (AI wrapper, mock provider first).

### 2026-11-26 · claude · App scaffold (Next up #2)
- Did: Next.js 16.4 app (TS strict, Tailwind 4, App Router, `src/`), Vitest 5 + `tests/money.test.ts`, scripts `lint` / `typecheck` / `test` / `check`, `.env.example`, README, folder layout with `.gitkeep`s, `src/lib/money.ts` (integer cents + currency), Slovenian placeholder home page.
- Verified: `pnpm check` passes (3 tests), `pnpm build` passes, `pnpm dev` serves `/` with HTTP 200 and `lang="sl"`.
- Left unfinished: nothing in #2.
- Next tool should: start #3 (DB schema migration). Install the Supabase CLI locally (`supabase init` / `supabase start` needs Docker; if Docker is missing, write the migration SQL anyway and note it here).

### 2026-11-26 · claude · Plan review before implementation
- Did: expanded PRODUCT.md (validation phase, KPIs, lead scoring, trade configs, content schema, OG link previews, preview tracking, after-sale, ops and budget cap, QA and golden set, risks, env vars; corrected the accessibility-law note). Added docs/SALES.md. AGENTS.md: git pull/push, one tool at a time, definition of done, folder layout, human switching guide. PROGRESS.md: human tasks H1–H6, new Phase 0 items.
- Branch: `docs/plan-review`.
- Next tool should: start at Next up #2.

### 2026-11-26 · claude · Project docs created
- Did: wrote `AGENTS.md`, `PROGRESS.md`, `docs/PRODUCT.md`, `CLAUDE.md`, `GEMINI.md`. Git repo set up, `.gitignore` added, pushed to GitHub (`main`, a153871).
