# SALES.md: Phase 1 sales playbook

> For the human doing sales, **and** input for the outreach-writer prompts (`src/prompts/outreach*.md`).
> Everything here is a hypothesis until the validation sprint (PRODUCT §10, Phase 0.5) produces real numbers.
> Update it with what actually works.

---

## 1. The offer (prices to test)

| Package | What's included | SI / HR / AT | RS / BA / MK |
|---|---|---|---|
| **Start** | One-page site on their own domain, legal pages, map, call/Viber button, Google Business Profile link help | €290–390 setup + €19/month | €150–250 setup + €10/month |
| **Plus** | Multi-page site, gallery, price list, contact form, 2 rounds of edits | €490–690 setup + €29/month | €250–400 setup + €15/month |

**Monthly plan includes:** hosting, SSL, small edits (up to 30 min per month), legal-text updates, and help with their Google Business Profile.
**Domain:** registered in the client's name; the cost is passed through at cost.
**Payment:** bank transfer or card. Setup is paid before go-live; monthly starts at go-live.

---

## 2. Message rules (the outreach writer must follow these)

1. **Personal:** their business name, one real detail (rating, review count, "only a Facebook page"), and the preview link.
2. **Short:** at most 5 lines. No marketing buzzwords. Formal "Vi" form in SL/HR/SR.
3. **From a real person:** the sender's full name and phone number. Company details are on the preview page.
4. **No pressure:** "no obligation". Never fake urgency or fake discounts.
5. **Easy opt-out** in every first message.
6. **Human-sent, one at a time.** Never bulk. 20–40 per week is plenty.
7. **Follow-up:** one message after 3 days, then one phone call. After that, stop and mark the lead `lost`.
8. **Correct language:** a native speaker checks it before it's sent.

### Example first message (Slovenian, Viber/WhatsApp)

> Pozdravljeni! Na Googlu ima {{business}} odlične ocene ({{rating}} ★, {{reviews}} mnenj), spletne strani pa še nimate.
> Zato vam pošiljam predlog, kako bi lahko izgledala: {{preview_url}}
> Brez obveznosti – če vam je všeč, jo lahko objavimo na vaši domeni še ta teden.
> Lep pozdrav, {{sender_name}}, {{sender_phone}}
> (Če ne želite več sporočil, odpišite »STOP«.)

Variants to write and test: Facebook-only ("vaša stran na Facebooku je lepa, a na Googlu vas stranke težko najdejo…"), outdated site (with the before/after image), Croatian, Serbian.

---

## 3. Objections → answers (the reply helper uses these)

| They say | Answer (the idea; write it in their language) |
|---|---|
| "I have Facebook." | Keep it. But people who google "hairdresser Maribor" find businesses with a website and a Google profile. We link the two. |
| "Too expensive." | Compare it with one new customer a month. Monthly can be cancelled any time, and they keep the domain. |
| "Who are you?" | Full name, company, registration number, a link to our own site and to live client sites. Offer a quick call. |
| "No time." | We do everything. A 10-minute call to confirm details is enough. |
| "Someone is already making me a site." | No problem: the preview is free, and they can keep the link to compare. |
| "Can you change X?" | Yes. Make the change (plain-language edit) and send the new link the same day. Speed sells. |

---

## 4. Phone call script (follow-up or no reply)

(Written in English; say it in their language.)
1. "Hello, {{sender_name}} here. I sent you a preview of a website for {{business}} on Viber a few days ago. Did you get a chance to look?"
2. If yes → ask what they liked and what they'd change → offer to make the changes now → propose the Start package.
3. If no → "Can I resend it? It takes a minute to look at." → resend, and call back in 2 days.
4. If not interested → thank them, mark `lost` (or `do_not_contact` if they ask).

---

## 5. What to record (pipeline, PRODUCT §5.7)

For every contact: channel, date, message variant (prompt version), preview views, reply type, outcome, price.
Weekly: compare reply rate and won rate per **trade × message variant × channel** against the KPIs in PRODUCT §2. Keep the winners, drop the losers.
