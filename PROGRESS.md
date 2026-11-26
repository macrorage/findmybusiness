# PROGRESS.md: live project state

> Read `AGENTS.md` first. Update this file at milestones and **always before you stop** (AGENTS.md §3.4).
> If this file and `git log` disagree, git wins: fix this file first.

**Last updated:** 2026-11-26 by claude · **Phase:** 0 (setup) · **Build status:** no code yet

---

## ▶ In progress
_Nothing yet. The next tool takes the top item from "Next up"._

<!-- Format when filled:
**Task:** <name>  · **Owner:** <tool>  · **Started:** <date>
- Done so far: ...
- Exact next step: <file> → <function/section> → <what is left>
- Gotchas: ...
-->

---

## ⏭ Next up (ordered: always take the top one)

**Phase 0: foundation**
1. [x] `git init`, `.gitignore` (node, .env, .next), first commit with these docs, push to `https://github.com/macrorage/findmybusiness`.
2. [ ] Scaffold a Next.js + TypeScript + Tailwind + pnpm app. Add Vitest. Add `.env.example`.
3. [ ] Supabase project. Write the schema from `docs/PRODUCT.md` §7 as an SQL migration.
4. [ ] `src/lib/ai/`: one provider-agnostic wrapper (Claude + Gemini) with a `task → model` routing table.
5. [ ] i18n setup with `sl` + `en` first.

**Phase 1: prospect finder (first useful thing)**
6. [ ] `src/lib/maps/`: DataForSEO Google Maps search (trade + city → listings). Cache results in the DB.
7. [ ] `src/lib/registry/`: research AJPES/ePRS and bizi.si access (API? export? terms?). Write the findings to `docs/decisions/`. **Research only; no scraping until the terms are checked.**
8. [ ] Rule-based classifier: `no_website` / `social_only` / `has_site` / `chain`. Unit tests.
9. [ ] Website checker: does it load? HTTPS? mobile viewport? last-modified? Screenshot → Gemini Flash: "outdated?" score.
10. [ ] UI: "Find prospects" page (trade dropdown in Slovenian + city) → results table with reason badges.

**Phase 2+:** see `docs/PRODUCT.md` §10 (roadmap).

---

## ⛔ Blockers / needs a human decision
- [x] Product name: **Spletko** (chosen 2026-11-26). Domain still open.
- [ ] Which Maps data source: DataForSEO (pay per use) or Google Places API (free tier, stricter terms)? Default: DataForSEO.
- [ ] Legal check of cold outreach to `d.o.o.` vs `s.p.` in SI/HR before the first real outreach. See PRODUCT §8.

---

## 🧭 Decisions (append-only; one line each, newest at the bottom)
| Date | Decision | Why | By |
|---|---|---|---|
| 2026-11-26 | Multi-tool workflow: AGENTS.md + PROGRESS.md + git as the handoff mechanism | No single tool has enough quota; any tool must be able to resume | human + claude |
| 2026-11-26 | The product **writes** outreach and the **human sends it**. No auto-sending | GDPR/ePrivacy risk; same model as the reference product | human + claude |
| 2026-11-26 | Phase 1 = in-house agency use; Phase 2 = SaaS | Validate sales before building SaaS features | human + claude |
| 2026-11-26 | Stack (provisional): Next.js, TS, Tailwind, Supabase, Cloudflare Pages | Free tiers, AI tools know them well | claude |
| 2026-11-26 | AI routing: Gemini Flash = classify/vision; Claude = site and copy generation | Cost vs. quality | claude |

---

## 📓 Session log (newest first, keep the last 10)

<!-- Template, copy for each session:
### YYYY-MM-DD · <tool> · <one-line summary>
- Did: ...
- Commits: <short hashes>
- Left unfinished: ...
- Next tool should: ...
-->

### 2026-11-26 · claude · Project docs created
- Did: wrote `AGENTS.md`, `PROGRESS.md`, `docs/PRODUCT.md`, `CLAUDE.md`, `GEMINI.md`.
- Also: git repo set up, `.gitignore` added, pushed to GitHub (`main`).
- Left unfinished: Next up #2 onward.
- Next tool should: start at Next up #2 (scaffold the app).
