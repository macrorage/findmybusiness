# Spletko

Finds local businesses in Slovenia, the Balkans and the EU with no website (or only a Facebook page),
builds them a finished, EU-compliant site in their language, and writes a personal message the
owner sends.

- **AI tools and contributors: start with [AGENTS.md](AGENTS.md)**, then [PROGRESS.md](PROGRESS.md).
- Product spec: [docs/PRODUCT.md](docs/PRODUCT.md) · Sales playbook: [docs/SALES.md](docs/SALES.md)

## Run locally

Needs Node 22.12+ (or 24 / 26) and pnpm 9.

```bash
pnpm install
cp .env.example .env   # fill in keys; AI_PROVIDER_MODE=mock works without them
pnpm dev               # http://localhost:3000
```

## Checks

```bash
pnpm check   # lint + typecheck + tests
pnpm build
```
