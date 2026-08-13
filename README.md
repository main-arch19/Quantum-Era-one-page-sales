# QES — Websites That Answer

Google Ads landing page for the free 30-minute teardown.
Served at `https://<your-domain>/websites-that-answer`.

Single purpose: capture a lead for that call. Nothing on this page does
anything else.

**Who it is written for.** A business that **already has a website** and is not
getting enough out of it. Years of trading, real revenue, and a site somebody
built for them at some point that now sits there forwarding the occasional
enquiry into a mailbox nobody watches. Their pain is present-tense, and their
willingness to spend is already proven by what they spent last time.

The loss the page names is the enquiry that arrived and went cold: somebody
ready to buy filled in the form at 11:47 PM, got an auto-reply that told them
nothing, filled in two competitors' forms while they were still sitting there,
and hired whoever answered first. The enquiry is still in the inbox. It looks
like a lead rather than a loss, which is exactly why it has never been counted.

> **This is Page A.** It requires the visitor to have a URL to type. Do not
> broaden the copy to serve people who have no website — see
> [Page B](#page-b--not-built) at the bottom.

```bash
npm install
cp .env.example .env.local   # fill it in
npm run dev                  # http://localhost:3000/websites-that-answer
```

---

## Before this page sees a single paid click

`npm run build` **fails** while any placeholder in `lib/content.ts` still has
brackets in it. That is deliberate: Google Ads prohibits unsubstantiated
claims, and a page with placeholder proof is both a disapproval risk and a
worse page than no page.

Everything you need to fill lives in one file — `lib/content.ts`:

| Value | What it needs |
| --- | --- |
| `PRIMARY_DOMAIN` | quantumerasolutions.com or quantumera.tech. **Must match the ad's display URL domain exactly.** Also sets the footer email |
| `PRIMARY_PROOF.client` | One real client name |
| `PRIMARY_PROOF.story` | **An upgrade story, not a first website.** What their old site was, how enquiries reached them, how long a reply took, how many went cold, what changed, the number after, over a stated time window |
| `PRIMARY_PROOF.quote` | One sentence with a number in it, named, with role and company — and written permission to use it |
| `SECONDARY_PROOFS` | Optional, 0–2 one-line results. Each needs a real number and time window |
| `PRICE_FLOOR` | Actual project floor price |
| `BUILD_TIMEFRAME` | Actual typical build duration |
| `MARKETS` | Markets you actually serve |

Plus `.env.local` — see `.env.example`. Only `RESEND_API_KEY` and
`NEXT_PUBLIC_CALENDLY_URL` are needed to take a lead; the rest degrade
gracefully and say so.

Check what is still outstanding at any time — the dev server prints it on every
boot, and the page shows a banner listing it.

---

## How a lead flows

Three stages, and the split is the whole design. A field costs a completely
different amount depending on where it sits: a project-description textarea in
front of an uncommitted visitor is the most expensive field on the internet,
and the same question after they have decided to book is nearly free.

```
STAGE 1   hero, ONE field: the website URL
          └─ runAuditAction
             ├─ url-safety: scheme, DNS, private-range block, redirect re-check
             ├─ ONE html fetch, 8s timeout, 2 MB cap
             └─ 2 findings back → rendered in the terminal readout
                                  (no email, no database row, no redirect)

STAGE 2   email gate, under the two findings: name / email / company
          └─ submitGate                        (company PREFILLED from the domain)
             ├─ honeypot + <3s submit → silently dropped
             ├─ rate limit: 5 per 10 min per IP, own budget
             ├─ re-runs the audit server-side (never trusts the hidden field)
             ├─ inserts the lead + full audit into Supabase
             ├─ emails you the lead + findings + every UTM param
             └─ redirect

/booked   ─ fires GA4 form_submit + Google Ads conversion (deduped on lead id)
          ├─ renders the FULL report from the stored row
          └─ Calendly inline, prefilled

STAGE 3   Calendly custom questions
          a1 lead id (hidden) · a2 url (hidden) · a3 "what do you want the
          site to do?" (REQUIRED) · phone (native, optional)
```

**Why the report is on `/booked` rather than revealed in place.** Reaching
`/booked` is what defines a conversion here — it means a submission passed
server validation — and the conversion events dedupe on the lead id there. If
the gate revealed the report inline, anyone who left without clicking through
would be a captured lead with no conversion recorded, and Google Ads would be
optimising against a number that undercounts. Putting the report at the top of
`/booked` keeps that invariant and still pays the reward immediately.

**Why `a3` is required.** It doubles as a no-show filter. Anyone who writes a
real answer is a genuine buyer; anyone who writes "website" was never going to
show up. Removing a no-show before they consume a calendar slot is worth more
than a marginally higher booking count.

**Why `a1` carries the lead id.** Prefilled fields stay editable. If the
invitee corrects their email before booking, a join on email breaks silently
and that booking disappears from attribution. The webhook returns custom
answers, so we match on an id they never see.

Every failure path degrades rather than losing the lead: no Supabase → the
email still sends; no Resend key → the payload is logged; audit fails at stage
2 → the lead is still captured and the call still books.

---

## The audit

Seven checks, split on cost rather than on value. The free two are the two that
matter most to the argument the page makes — gating the damning findings and
leading with trivia would be a bait and would read as one.

| # | Check | Tier | Needs |
| --- | --- | --- | --- |
| 1 | Enquiry path — real form, mailto only, or nothing | free | one fetch |
| 2 | Server response — measured TTFB and HTML weight | free | one fetch |
| 3 | Mobile viewport | gated | same fetch |
| 4 | HTTPS | gated | same fetch |
| 5 | Search listing — title and meta description | gated | same fetch |
| 6 | Freshness — copyright year | gated | same fetch |
| 7 | Mobile speed — Google PageSpeed Insights | gated | `PAGESPEED_API_KEY` |

A check that cannot determine something returns `unknown` and says so. It never
guesses, because being contradicted on your own audit is the worst possible
start to a sales call.

### The part to be careful with

`lib/url-safety.ts` exists because stage 1 hands an anonymous visitor's URL to
the server, which then fetches it — a textbook SSRF primitive. On a cloud host
that is serious: the metadata endpoint at `169.254.169.254` hands credentials
to anything that asks from inside the network.

Every hostname is resolved and checked against the reserved ranges **before**
connecting, redirects are followed manually so **every hop** is re-checked, the
body is capped at 2 MB, and only `http`/`https` are allowed. If you touch that
file, run the safety cases in `npm run test:audit` afterwards.

---

## Zero-leakage rules

Every exit that is not the form is a click you already paid for and lost.
**There is no `href` anywhere in either page.**

That rule used to have one exception, the `tel:` number in the header. The
number is gone — it could not be answered reliably during working hours, and a
number that rings out contradicts the argument the page is making. The footer
email is deliberately **plain text, not a `mailto:`**, for the same reason: a
mail client launching is a leak, and it lands the visitor in an empty compose
window that converts worse than the form.

- No navigation, no menu, no home link, no phone number
- **The logo is an image, not a link** — the one people click by reflex
- Privacy and Terms open in a modal on the page (native `<dialog>`), never a new
  page or tab. This is the only exception, and it exists because Google Ads
  disapproves lead-gen pages without an accessible privacy policy
- Client names are plain text, never links
- Every button either scrolls to the check or submits it. There is no second CTA type
- Calendly loads on `/booked` only, never on the landing page, and **inline
  only** — never the popup and never a redirect to calendly.com

Three scripts enforce this:

```bash
npm run test:prefill     # company-name prefill, 18 cases
npm run audit:links      # hrefs, target=_blank, iframes, scripts in server HTML
npm run audit:runtime    # every host each page ACTUALLY contacts at runtime
```

`audit:links` reads server HTML and cannot see `next/script` injections, which
happen after hydration — so `audit:runtime` drives a real browser and is the one
that actually proves the Calendly rule. It needs Chrome on a debugging port:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --remote-debugging-port=9222 \
  --user-data-dir=/tmp/qes-audit about:blank &

AUDIT_BASE=http://localhost:3000/websites-that-answer npm run audit:runtime
```

Expect Google regional ccTLDs (`www.google.com.jm`) in the runtime output — that
is the Ads conversion ping, not a third party.

---

## Setup: Supabase

One table. Run it once:

```bash
psql "$SUPABASE_DB_URL" -f supabase/schema.sql
# or paste it into the Supabase SQL editor
```

**Do not add a bookings table.** A booking is not an entity here, it is a fact
about a lead, so it is a nullable `booked_at` column. The reason is the query
that pays for this page:

```sql
select created_at, name, company, website_url, email
from leads
where booked_at is null
order by created_at desc;
```

Those are the people who ran the audit, saw what their site was doing, handed
over an email, and did not book. That list is worth more than the bookings, and
splitting it across two tables turns it into a left join nobody remembers to
write correctly.

---

## Setup: Calendly

**Calendly Standard is required** ($12/month, $10 billed annually). The free
plan is disqualified twice: no webhooks, so the server half of the booking loop
cannot exist, and Calendly's own branding on the booking widget, which cannot
be removed and which undercuts the page at its highest-trust moment.

### 1. Custom questions on the event type, in this exact order

| Slot | Question | Type | Required |
| --- | --- | --- | --- |
| `a1` | Lead ID | one line, hidden | no |
| `a2` | Website URL | one line, hidden | no |
| `a3` | What do you want the site to do? | multi-line | **yes** |

> ⚠ **`a1`/`a2`/`a3` map positionally.** Reorder these questions, or insert one
> above them, and the prefilled values silently write into the wrong fields —
> no error, just corrupted data that looks fine until you try to use it. The
> order is documented in a comment directly above the config block in
> `components/CalendlyEmbed.tsx`; change both in the same commit.

Leave the native phone field on and optional. That is *their* number, and it
powers Calendly's SMS reminders, which are the main lever against no-shows.
Removing our outbound number does not mean removing theirs.

### 2. Create the webhook subscription

Webhooks are created through the API, not the dashboard:

```bash
curl -X POST https://api.calendly.com/webhook_subscriptions \
  -H "Authorization: Bearer $CALENDLY_PERSONAL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://<your-domain>/websites-that-answer/api/calendly/webhook",
    "events": ["invitee.created"],
    "organization": "https://api.calendly.com/organizations/XXXX",
    "user": "https://api.calendly.com/users/XXXX",
    "scope": "user"
  }'
```

The response contains a signing key **once**. Put it in
`CALENDLY_WEBHOOK_SIGNING_KEY`. Without it the route rejects everything with a
503 — an unauthenticated endpoint that writes to your database is worse than no
endpoint.

Note the `basePath`: the route is under `/websites-that-answer/api/...`.

---

## Tracking

| Event | Where |
| --- | --- |
| `audit_run` | stage 1 returned findings — micro-conversion, not a conversion |
| `form_submit` | `/booked` on mount — GA4 primary |
| `conversion` | `/booked` on mount, `transaction_id` = lead id — Google Ads |
| `scroll_75` | 75% depth, once |
| `call_booked` | Calendly `event_scheduled` postMessage |

`audit_run` is worth watching against `form_submit`. A healthy audit rate with a
poor submit rate means the findings are not compelling enough to be worth an
email — a copy problem, not a traffic problem.

The booking loop is closed **twice, and both halves are required**:

- **Client** — `calendly.event_scheduled` postMessage fires `call_booked`
  immediately. Fast and reliable, and what the ad platform optimises on.
- **Server** — the `invitee.created` webhook sets `booked_at` in Supabase.
  Durable: it still lands if the browser closes the moment they confirm, if a
  script blocker eats the postMessage, or if JS is off entirely.

Neither is a fallback for the other. Test them separately — disable the webhook
and confirm the event fires, then disable JS and confirm `booked_at` still gets
set.

Both conversion events fire on `/booked` rather than at submit time, because the
server action redirects and there is no client-side success moment to hook.
Reaching `/booked` with a lead id means the submission passed server validation,
which is a stricter definition of a conversion than "clicked submit."

Note for anyone editing `lib/tracking.ts`: the tag loads `afterInteractive`, so
`window.gtag` does **not** exist when the `/booked` effect runs. Events go
through `whenGtagReady()`. A naive `if (!window.gtag) return` drops the
conversion silently and Google Ads gets no signal while you keep paying for
clicks.

---

## Deployment

`next.config.ts` sets `basePath: "/websites-that-answer"`.

The main QES site is a separate Vite app in a separate repo, so the two are
joined at the edge: host this app wherever you like, then add a rewrite from
`<main-domain>/websites-that-answer/*` to it. `basePath` makes every route,
asset and font path resolve correctly on the far side of that rewrite — the
Calendly webhook route included.

`public/robots.txt` must keep allowing `AdsBot-Google`. Blocking it causes ad
disapproval — the ads simply stop serving. Both pages are `noindex` so they do
not compete with the main site organically; that does not affect AdsBot.

---

## Ad alignment

Message match is not optional — the ad headline must carry the same language as
the H1, or Quality Score drops and cost per click rises. Write the ads from this
page, not the other way around.

- "Your Website Takes Enquiries. Does It Answer Them?"
- "Free Check — See What Your Site Does With A Lead"
- "They Filled In Your Form At Midnight. Then What?"

**Buy problem-aware terms only.** Exact and phrase match. No broad match on a
small budget.

- `website not getting leads`
- `website leads slow`
- `contact form not working`
- `why is my website not converting`
- `website redesign quote`

**Negative-match, and this matters more than usual:**

- `new website`, `build a website`, `how much does a website cost`
- `web design for [industry]`, `small business website`
- plus the standing set: `free`, `template`, `tutorial`, `course`, `jobs`,
  `salary`, `wordpress plugin`, `diy`

Without those negatives a searcher with no website clicks your ad, lands on a
page demanding a URL they do not have, and bounces on your money. The hero is
a single URL field — there is no version of this page that serves them.

---

## Page B — not built

A second page for the no-website segment is planned and **is not being built
now**. Recorded so it is not lost:

- Same audit engine, different input: they enter a **competitor's** URL. Every
  owner knows who is beating them. Audit that site and show them what they are
  up against — and when the competitor scores badly, which is usual, the
  argument writes itself.
- Paired with an instant scope-and-price estimate: four questions, a real range
  and timeline immediately. Their blocker is not knowing the cost.
- Launch after Page A has data. No-website keywords are the most contested and
  tyre-kicker-heavy in the category; learn on cheap traffic first.

**Do not add partial hooks for it.** Any attempt to serve both audiences from
one page makes it vague, and vague is what kills paid traffic.
