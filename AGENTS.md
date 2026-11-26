# AGENTS.md: read this first (every AI tool, every session)

This repo is built by **several AI coding tools taking turns** (Claude Code, Gemini CLI, and others).
Any tool can stop at any moment (token limit, quota, crash). The next tool must be able to continue
**without the conversation history**. Everything a successor needs lives in files in this repo and in git.

> **The golden rule:** if it is not written in `PROGRESS.md` or committed to git, it did not happen.

---

## 1. What we are building (30-second version)

**Spletko** · repo: https://github.com/macrorage/findmybusiness

A tool that **finds local businesses in Slovenia, the Balkans and the EU that have no website, only a
Facebook page, or an outdated site**. It generates a finished, **EU-compliant** website for each one,
in the business's own language, and writes a personal outreach message (Viber / WhatsApp / email) that
the **human user sends themselves**.

- Phase 1: the owner uses it as an in-house agency tool and sells sites to local businesses.
- Phase 2: it is sold as SaaS to freelancers and agencies in the region.

Full spec: `docs/PRODUCT.md`. Live state and next tasks: `PROGRESS.md`.

---

## 2. File map

| File | Purpose | How often it changes |
|---|---|---|
| `AGENTS.md` | Rules and the handoff protocol (this file) | Rarely. Only the human or a deliberate decision changes it |
| `CLAUDE.md` / `GEMINI.md` | One-line pointers so each tool auto-loads this file | Never |
| `PROGRESS.md` | **Live state**: current task, next tasks, blockers, decisions, session log | **Every session** |
| `docs/PRODUCT.md` | Product spec: features, data, legal, roadmap, QA, risks | When scope changes |
| `docs/SALES.md` | Offer, prices, message rules, objections (also input for outreach prompts) | When sales learnings change |
| `docs/decisions/` | Optional longer write-ups for big decisions (`NNNN-title.md`) | Occasionally |
| `src/prompts/` | AI prompts, one file per task, with a `version:` line | When prompts are tuned |
| `src/trades/` | One JSON config per trade (PRODUCT §5.5) | When trades are added |
| `.env.example` | Every env var the app needs, with no real values (PRODUCT §13) | When a new key is added |

Keep `AGENTS.md` and `PROGRESS.md` **short**. They are loaded into context every session and cost tokens.
Put detail in `docs/`, and link to it.

---

## 3. Session protocol (follow exactly)

### 3.1 Start of session (do this before writing any code)
1. Run `git pull` (another tool may have pushed since you last looked).
2. Read `AGENTS.md` (this file) and `PROGRESS.md` in full.
3. Run `git status` and `git log --oneline -15` to see what the last tool actually did.
4. If `PROGRESS.md` and git disagree, **git wins**. Fix `PROGRESS.md` first, then continue.
5. Read only the sections of `docs/PRODUCT.md` and the source files that the current task needs.
   **Do not scan the whole repo.** It wastes the token budget.
6. Take the task under **"▶ In progress"**. If that is empty, take the **top** item of **"Next up"**
   that is not waiting on a human task (`👤 H…`). Move it to "In progress" and write your tool name next to it.
7. If the task needs something only the human can give (an account, a key, a decision), say so right
   away and take the next unblocked task.

### 3.2 During the session
- Work on **one task at a time**. Small, finishable steps beat big rewrites.
- **Commit after every working unit** (something that builds and runs). Message format:
  `<type>(<area>): <what>  [tool: claude|gemini|other]`
  Example: `feat(finder): filter out chains by review count  [tool: gemini]`
  Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`.
- When you make a choice that a future tool might undo (library, folder layout, data shape, naming),
  add one line to **"Decisions"** in `PROGRESS.md`, with the reason.
- If you hit a wall you can't get past, write it under **"Blockers"** and move to the next task.
  Don't spin on it.

**Definition of done** (a task is not done until all of these are true):
- `pnpm lint`, `pnpm typecheck` and `pnpm test` pass (once these scripts exist).
- The feature was actually **run** once (the page opened, or the function was called), not just written.
- New env vars are in `.env.example`; new decisions are in `PROGRESS.md`.
- No secrets and no real business data in the diff.

### 3.3 Update `PROGRESS.md` when any of these happen
- A task is finished → move it to the session log, and update "Next up".
- A decision is made → "Decisions".
- You are blocked → "Blockers".
- **You estimate you are past about 70% of your context or token budget** → stop feature work
  **now**, and write the handoff (3.4). Running out mid-edit with no handoff is the worst outcome.
- The human says "stop", "switch", or "handoff".

Do **not** update it after every tiny edit. That burns tokens. Milestones only.

### 3.4 End of session / handoff (mandatory)
1. Make sure the code builds, or clearly mark what is broken.
2. Commit everything, including work in progress (`wip(...)` commits are fine; say what's unfinished).
3. In `PROGRESS.md`:
   - Update "▶ In progress" with **exact** next steps: file, function, what is left.
   - Add a session-log entry at the **top** (template in `PROGRESS.md`).
   - Keep only the last 10 session-log entries. Delete older ones (git keeps them).
4. Commit: `docs(progress): handoff  [tool: <name>]`
5. `git push`, so the next tool (possibly on another machine) gets your work.

---

## 4. Collaboration rules between tools

- **Respect previous work.** Don't rewrite or "clean up" another tool's code unless the task asks for
  it, or it's clearly broken. If you disagree with an approach, log it in "Decisions" as a proposal.
  Don't silently change it.
- **Follow existing conventions** in the code, even if you would choose differently.
- **One tool at a time.** Never run two AI tools on this repo at once. If parallel work is ever
  needed, each tool works on its own branch.
- **No hidden state.** No notes only "in your head", and no local files outside the repo.
- **Never commit secrets.** Real keys go in `.env` (gitignored). Add the variable name to `.env.example`.
- **Never commit real business or client data** (names, phones, emails of real prospects). It is
  GDPR personal data and the repo may be public. Fixtures, seeds and the golden set use invented businesses.
- **Prompts are code.** They live in `src/prompts/`. When you change one, bump its `version:` line and
  rerun the golden set (PRODUCT §11).
- **Ask the human** only for decisions that are genuinely theirs: money, legal, brand, sending messages to
  real businesses, deploying to production. Otherwise pick a sensible default and log it.
- **Never send outreach messages or emails to real businesses automatically.** The product writes them,
  and the human sends them. This is a product rule *and* a legal one (see `docs/PRODUCT.md` §8).

---

## 5. Tech conventions (provisional; finalised in Phase 0, see PROGRESS "Decisions")

- Language: **TypeScript** (strict). Package manager: **pnpm**.
- App: **Next.js 16.4 (App Router, `cacheComponents` on)** with Tailwind 4. It's newer than most AI
  training data: read the matching guide in `node_modules/next/dist/docs/` before using a Next API
  (see the block at the end of this file). DB, auth and storage: **Supabase (Postgres)**.
- Node 22.12+ / 24 / 26 (Vitest 5 needs it). Run `pnpm check` (lint + typecheck + tests) before every commit.
- Generated client sites: static HTML + Tailwind, deployed to **Cloudflare Pages**.
- AI calls go **only** through one wrapper module (`src/lib/ai/`). It hides which provider is used, so
  models can be swapped in one place.
- Every external API (DataForSEO, Google Places, registries, AI) gets its own module in `src/lib/`,
  with typed inputs and outputs.
- Put all user-facing text through an i18n layer from day one. Languages: `sl`, `hr`, `sr-Latn`,
  `sr-Cyrl`, `bs`, `mk`, `de`, `en`.
- Validation: **Zod** for every external input and every AI JSON output. Phones: **libphonenumber-js**.
  Screenshots and site checks: **Playwright**.
- Tests: Vitest for logic (filters, classifiers, parsers). Keep them fast. The AI wrapper has a mock
  provider (`AI_PROVIDER_MODE=mock`), so tests never cost money.
- Money: integer cents plus a currency code. Never floats.

Folder layout:
```
src/app/              Next.js routes (UI)
src/lib/<module>/     maps, registry, classify, score, checker, sitegen, outreach, ai, deploy
src/prompts/          AI prompt files (versioned)
src/trades/           one JSON config per trade
templates/            client site templates
supabase/migrations/  SQL migrations
tests/  tests/golden/ unit tests and the golden set (invented businesses only)
```

---

## 6. Which tool for what (guidance for the human and for agents)

| Work | Best fit | Why |
|---|---|---|
| Architecture, data model, tricky bugs, site templates, Slovenian/Croatian copy | **Claude** | Stronger at code design, UI, and natural copy |
| Bulk or repetitive coding, tests, boilerplate, docs, refactors with clear instructions | **Gemini CLI** | Generous free tier, big context window |
| Reading large files or logs, comparing many pages | **Gemini** | Long context |
| Final review before a milestone | The *other* tool from the one that wrote it | A fresh pair of eyes |

Inside the product itself: **Gemini Flash** classifies (cheap, handles images), and **Claude** generates
sites and messages. See `docs/PRODUCT.md` §6.

---

## 7. Token-saving rules (for agents)

- Read `PROGRESS.md` pointers first, then open only the files they name.
- Prefer `grep` and targeted reads over opening whole directories.
- Don't paste big files back in your replies. Reference `path:line`.
- Don't regenerate a whole file to change a few lines. Edit in place.
- Keep this file and `PROGRESS.md` under about 250 lines each.

---

## 8. For the human: how to switch tools

Open a terminal in the project folder and start either tool:
```
cd ~/Projects/Spletko && claude
cd ~/Projects/Spletko && gemini
```
Claude Code loads `CLAUDE.md` and Gemini CLI loads `GEMINI.md`. Both point here. Other tools (Codex,
Cursor and similar) read `AGENTS.md` directly.

**First message to any tool:**
> Read AGENTS.md and PROGRESS.md, then continue with the task in progress or the next one. Follow the session protocol.

**When a tool is close to its limit, or you want to switch:**
> Handoff now: finish the smallest safe step, commit, update PROGRESS.md per AGENTS.md §3.4, and push.

**Review before a milestone:** ask the *other* tool to review it:
> Review the commits since <hash> against docs/PRODUCT.md. List problems; don't change code yet.

---

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
