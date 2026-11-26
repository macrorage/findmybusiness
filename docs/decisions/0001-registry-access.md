# 0001: Business registry access (research)

**Date:** 2026-11-26 · **By:** claude · **Status:** research done, implementation in Phase 5 (PRODUCT §10)

Goal (PRODUCT §5.1): enrich Google Maps listings with official registry data (registration number,
legal form, size, activity, VAT status) to fill the impressum and to rank leads better.
Rule: **official open data or paid APIs only, no scraping.**

## Slovenia: AJPES Poslovni register Slovenije (PRS) ✅ use this

- Source: OPSI open data portal, dataset "Poslovni register Slovenije"
  (`https://podatki.gov.si/dataset/poslovni-register-slovenije`), publisher AJPES.
- **License: CC BY 4.0** (free reuse, attribution required: "Vir: AJPES, Poslovni register Slovenije").
- **Updated twice a month.** Last update seen: 2026-11-15.
- Formats: CSV (`opsiprs.csv`, about 122.5 MB), XML bundle (ZIP, about 18.4 MB), field catalogue
  `atributimr20.xml`, and the CKAN API (`/api/3/action/package_show?id=poslovni-register-slovenije`).
- Covers companies **and sole traders (s.p.)**. Field catalogue includes: matična številka, full and short name,
  s.p. short name, street / house number / settlement / municipality / postal code, legal form,
  SKD activity code, size by EU and Slovenian criteria, VAT-registered flag, founding and entry dates,
  status and deletion fields.
- **Not included:** website, email and phone as plain fields (there is only a generic "contact type" attribute;
  check whether the open CSV fills it). The tax number is **not public for natural persons**.
- Not yet confirmed: the exact CSV columns. **Next step: download the CSV once and list its columns**
  (needs the owner's OK: 122.5 MB file with personal data of sole traders, see PROGRESS).

**Use for:** matching a Maps listing to a registry entry (normalized name + postal code + street,
with a confidence score), filling impressum fields, filtering out deleted or inactive entities,
the `registry_size` signal in lead scoring (§5.3), and mapping SKD codes to trades.

**GDPR:** s.p. entries are personal data even though they're public. Lawful basis: legitimate interest
(PRODUCT §8). Import only the columns we use, never commit the data to git, apply retention limits.

## Slovenia: bizi.si ❌ don't scrape

- Run by TSmedia, d.o.o. Terms ("Pravila in pogoji", section 14): the data is a protected database, for
  the user's **own needs only**. Bulk export with **software tools is forbidden**, as are redistribution,
  paid or free, and copying parts of the database without express written consent.
- They sell access ("Moj Bizi" tiers, "API dostop", "Seznami"). Possible later, **only with a contract**.
- Decision: **not used.** PRS covers what we need for free. Revisit only if we need email or website
  data that PRS lacks, and then through their paid API with written terms.

## Croatia: Sudski registar 🔶 promising, verify manually

- Croatia's open data portal (`data.gov.hr`) lists "Sudski registar", described as an open-data portal for developers
  (publisher: the Ministry of Justice). The developer site `sudreg-data.gov.hr` loops redirects for automated
  fetches, so access steps (registration, client credentials), license and fields were **not verified**.
- Companies only. **Crafts (obrt) are in a separate register (Obrtni registar)** and are not covered.
  Many Croatian prospects (hairdressers, apartment owners) are obrt, so this needs separate research.
- Next step (human or tool with a browser): open the developer portal, record the API terms and fields here.

## Serbia (APR), Bosnia and Herzegovina, North Macedonia ⏳ not researched yet

To do when those countries come up in the roadmap.

## Decision

1. Phase 5 starts with **Slovenia PRS open data** (CSV import into a `registry_entries` table; a new migration).
2. **No scraping** of bizi.si or any other directory. Paid APIs only with written terms.
3. Croatia: verify the Sudski registar API and research the Obrtni registar before building anything.
