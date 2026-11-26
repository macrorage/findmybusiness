# Golden set

`businesses.json` holds **10 invented businesses** (PRODUCT §11). None of them exist, and every phone,
address and review is made up. Websites use the reserved `.example` domain, or obviously fake social pages.
**Never put real business data here** (AGENTS.md §4).

Each case has:
- `prospect`: the normalized listing (`src/lib/prospect.ts`), as a data source would return it
- `trade` and `language`: what the site generator would use
- `legal`: invented impressum details
- `expect`: what the pipeline should conclude (classifier label and contact channels)

Used by:
- `tests/golden/golden.test.ts`: every case is valid, and the trade exists
- the classifier and scoring tests (task #9 and #10)
- later: site-generation runs after every prompt or template change (regenerate, compare screenshots, run the checks in PRODUCT §11)
