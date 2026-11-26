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
| `docs/PRODUCT.md` | Product spec: features, data, legal, roadmap | When scope changes |
| `docs/decisions/` | Optional longer write-ups for big decisions (`NNNN-title.md`) | Occasionally |
| `.env.example` | Every env var the app needs, with no real values | When a new key is added |

Keep `AGENTS.md` and `PROGRESS.md` **short**. They are loaded into context every session and cost tokens.
Put detail in `docs/`, and link to it.

---

## 3. Session protocol (follow exactly)

### 3.1 Start of session (do this before writing any code)
1. Read `AGENTS.md` (this file) and `PROGRESS.md` in full.
2. Run `git status` and `git log --oneline -15` to see what the last tool actually did.
3. If `PROGRESS.md` and git disagree, **git wins**. Fix `PROGRESS.md` first, then continue.
4. Read only the sections of `docs/PRODUCT.md` and the source files that the current task needs.
   **Do not scan the whole repo.** It wastes the token budget.
5. Take the task under **"▶ In progress"**. If that is empty, take the **top** item of **"Next up"**.
   Move it to "In progress" and write your tool name next to it.

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

---

## 4. Collaboration rules between tools

- **Respect previous work.** Don't rewrite or "clean up" another tool's code unless the task asks for
  it, or it's clearly broken. If you disagree with an approach, log it in "Decisions" as a proposal.
  Don't silently change it.
- **Follow existing conventions** in the code, even if you would choose differently.
- **No hidden state.** No notes only "in your head", and no local files outside the repo.
- **Never commit secrets.** Real keys go in `.env` (gitignored). Add the variable name to `.env.example`.
- **Ask the human** only for decisions that are genuinely theirs: money, legal, brand, sending messages to
  real businesses, deploying to production. Otherwise pick a sensible default and log it.
- **Never send outreach messages or emails to real businesses automatically.** The product writes them,
  and the human sends them. This is a product rule *and* a legal one (see `docs/PRODUCT.md` §8).

---

## 5. Tech conventions (provisional; finalised in Phase 0, see PROGRESS "Decisions")

- Language: **TypeScript** (strict). Package manager: **pnpm**.
- App: **Next.js (App Router)** with Tailwind. DB, auth and storage: **Supabase (Postgres)**.
- Generated client sites: static HTML + Tailwind, deployed to **Cloudflare Pages**.
- AI calls go **only** through one wrapper module (`src/lib/ai/`). It hides which provider is used, so
  models can be swapped in one place.
- Every external API (DataForSEO, Google Places, registries, AI) gets its own module in `src/lib/`,
  with typed inputs and outputs.
- Put all user-facing text through an i18n layer from day one. Languages: `sl`, `hr`, `sr-Latn`,
  `sr-Cyrl`, `bs`, `mk`, `de`, `en`.
- Tests: Vitest for logic (filters, classifiers, parsers). Keep them fast.

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
