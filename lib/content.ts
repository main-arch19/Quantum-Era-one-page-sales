/**
 * EVERY piece of copy on the page lives here.
 *
 * Values still wrapped in [BRACKETS] are unfilled. A production build FAILS
 * while any required value still contains them — see assertNoPlaceholders() at
 * the bottom of this file. Google Ads policy prohibits unsubstantiated claims,
 * and a page with placeholder proof is both a disapproval risk and a worse page
 * than no page at all.
 *
 * WHO THIS PAGE IS WRITTEN FOR
 * A business that ALREADY HAS A WEBSITE and is not getting enough out of it.
 * Years of trading, real revenue, and a site somebody built for them at some
 * point that now sits there taking the occasional enquiry into a mailbox
 * nobody watches. Their pain is present-tense and their willingness to spend
 * is already proven by what they spent last time.
 *
 * The loss this page names is the enquiry that arrived and went cold: somebody
 * ready to buy filled in the form at 11:47 PM, got an auto-reply that told them
 * nothing, filled in two competitors' forms while they were still sitting
 * there, and hired whoever answered first. The enquiry is still in the inbox.
 * It looks like a lead rather than a loss, which is exactly why it has never
 * been counted.
 *
 * THIS IS PAGE A. It requires the visitor to have a URL to type, and every
 * argument below assumes an existing site with an existing contact form. Do NOT
 * broaden this copy to accommodate people with no website — that is a separate
 * page with a separate ad group, and serving both makes this one vague. Vague
 * is what kills paid traffic.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BUSINESS CONSTANTS — confirmed
// ─────────────────────────────────────────────────────────────────────────────

export const COMPANY = {
  name: "Quantum Era Solutions",
  location: "Kingston, Jamaica",
  email: "main@quantumerasolutions.com",
  year: 2026,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// UNFILLED — required before this page sees a single paid click
// ─────────────────────────────────────────────────────────────────────────────

/** Must match the Google Ads display URL domain exactly. */
export const PRIMARY_DOMAIN = "[PRIMARY-DOMAIN]";

/**
 * Shown in the footer as PLAIN TEXT, never a mailto: link.
 *
 * There is no phone number anywhere on this page. It was removed because it
 * could not be answered reliably during working hours, and a number that rings
 * out is worse than no number at all on a page whose entire argument is that
 * slow response loses business. Location plus a domain-matched address carries
 * the legitimacy signal the number was carrying.
 */
export const CONTACT_EMAIL = `main@${PRIMARY_DOMAIN}`;

/** Actual project floor price, e.g. "US$4,500". */
export const PRICE_FLOOR = "[FIGURE]";

/** Actual typical build duration, e.g. "Four to six weeks". */
export const BUILD_TIMEFRAME = "[TIMEFRAME]";

/** Markets actually served, e.g. "Jamaica, the wider Caribbean and the US". */
export const MARKETS = "[MARKETS]";

/** The Calendly event link for the teardown. Embedded on /booked only. */
export const CALENDLY_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL ?? "[CALENDLY-URL]";

export type PrimaryProof = {
  /** Client company name. Appears in the section heading. */
  client: string;
  /**
   * ONE paragraph, and it must be an UPGRADE story — this page is read by
   * someone who already has a website, and a "they had nothing, then they had
   * a site" story argues nothing to them. They already cleared that bar.
   *
   * What their old site did and how long they had it. How enquiries arrived
   * and what happened to them — how long a reply actually took, and how many
   * went cold. What we changed. The specific number after, over a stated time
   * window. If you do not have that number, do not launch this page.
   */
  story: string;
  quote: {
    /** One sentence from the client, with a number in it. */
    text: string;
    name: string;
    role: string;
    company: string;
  };
};

export const PRIMARY_PROOF: PrimaryProof = {
  client: "[CLIENT NAME]",
  story:
    "[ONE PARAGRAPH. What their old site was and how long they had it. How enquiries reached them, how long a reply actually took, and how many went cold. What we changed. The specific number after, over a stated time window.]",
  quote: {
    text: "[ONE SENTENCE FROM THE CLIENT, WITH A NUMBER IN IT.]",
    name: "[NAME]",
    role: "[ROLE]",
    company: "[COMPANY]",
  },
};

/** Rendered as the proof section's H2. Kept here so page.tsx holds no copy. */
export const PROOF_HEADING = `${PRIMARY_PROOF.client} already had a website. Here is what changed when it started answering.`;

export type SecondaryProof = {
  client: string;
  /** One line. Must contain a real number and a stated time window. */
  result: string;
};

/**
 * Zero to two entries. Rendered as compact one-line results beneath the primary
 * proof — no paragraphs, no quotes. Three co-equal testimonials read as
 * decoration; one story with a real number reads as evidence. Leave empty and
 * the section renders the primary proof alone without a layout break.
 */
export const SECONDARY_PROOFS: SecondaryProof[] = [];

/** Plain text. Never links. Never logos that link. */
export const TRUST_LINE = ["Vivid Walls", "Yaadflexx", "Parafount"] as const;

// ─────────────────────────────────────────────────────────────────────────────
// COPY — verbatim. Do not shorten. Do not add adjectives.
// ─────────────────────────────────────────────────────────────────────────────

export const HERO = {
  h1: "At 11:47 last night, someone filled in your contact form.",
  subhead:
    "What your website did in the ninety seconds after that is the reason you never heard from them again.",
} as const;

/**
 * STAGE 1 — the hero. ONE field, and it is the URL.
 *
 * No email, no name, nothing else. A project-description textarea in front of
 * an uncommitted visitor is the single most expensive field on the internet.
 * Everything we need to start, we can get from the domain they type.
 */
export const HERO_FORM_COPY = {
  heading: "Check what your site does with an enquiry",
  subheading:
    "Type your address. We run the same checks a buyer's patience runs, and show you the first two findings straight away.",
  label: "Your website",
  placeholder: "yourbusiness.com",
  button: "Check my site",
  subLabel: "No email needed to start.",
  running: "Checking…",
} as const;

/**
 * STAGE 2 — the email gate, shown AFTER two real findings are on screen.
 *
 * The same three fields cost almost nothing here and would have cost most of
 * the conversions in the hero. They have seen something true about their own
 * site by this point; the email is a trade, not a toll.
 */
export const GATE_COPY = {
  heading: "The rest of the report",
  subheading:
    "Five more checks, including how your site performs on a phone on mobile data — which is how most of your enquiries arrive.",
  button: "Send me the full report",
  sending: "Sending…",
  consent:
    "We'll email you the report and may follow up about it. Unsubscribe any time.",
  /** Sits over the blurred, un-run checks. */
  lockedLabel: "Locked",
} as const;

/**
 * The terminal readout. Static framing only — the per-check verdicts live in
 * lib/audit/checks.ts, bound to the logic that produces them, because a verdict
 * that drifts from its check is worse than a verdict written twice.
 */
export const AUDIT_COPY = {
  heading: "What we found",
  scanning: "Running checks",
  freeCount: "2 checks shown · 5 more in the full report",
  disclaimer:
    "These are automated checks against your live site, run just now. They are the cheap half of what we look at on a call.",
  failedHeading: "We could not reach that address",
  failedBody:
    "That happens for three reasons: a typo, a site that is down, or a server that blocks automated checks. Try the address again, and if it still will not run, book the call and we will go through it live instead.",
} as const;

/**
 * Eyebrows are TIMESTAMPS, not numbers. They narrate one night in sequence and
 * that sequence is the argument of the page. Never replace with 01 / 02 / 03.
 */
export const NARRATIVE_SECTIONS = [
  {
    id: "enquiry",
    eyebrow: "11:47 PM",
    heading: "The best lead you will ever get is one that arrives at midnight.",
    body: [
      "Somebody sat on a sofa with a laptop, decided tonight was the night they were finally going to sort this, and went looking. They found you. They read enough to think you might be the ones. Then they filled in your form.",
      "Understand what that person is. They are not browsing. Nobody fills in a contact form at 11:47 PM to browse. They have made a decision and they are now looking for somewhere to put it.",
      "They are also, at that exact moment, the easiest sale you will ever be offered. No haggling yet, no comparison spreadsheet, no procurement process. Just a person who has decided and wants somebody to take it from here.",
      "Your website has about ninety seconds to be that somebody.",
    ],
  },
  {
    id: "auto-reply",
    eyebrow: "11:48 PM",
    heading:
      "Everybody knows what “we will be in touch shortly” means. It means nobody read it.",
    body: [
      "One minute later your site sent them this: “Thank you for your message. We have received your enquiry and will be in touch shortly.”",
      "They have seen that sentence a thousand times. It answers nothing. It does not say when, it does not say who, it does not say what happens next, and it very obviously was not written by a person who has just looked at what they sent.",
      "So they did the rational thing, and it took them four minutes. They went back to the search results and filled in two more forms. Possibly three. Not because they preferred those companies — they had never heard of them either — but because at 11:47 PM the only sensible strategy is to ask everybody and see who turns up.",
      "You are now in a race you do not know you have entered. The starting gun went off while you were asleep, and the finish line is whoever replies first with something that sounds like a human being who read the message.",
      "Here is the part that should bother you. You were probably the best of the three. You have been doing this for years, your work is better, your prices are fairer. None of that was on the table. The only thing being measured was who answered.",
    ],
  },
  {
    id: "morning",
    eyebrow: "7:15 AM",
    heading: "You will never count this one as a loss.",
    body: [
      "By the time you opened the laptop, one of the other two had already replied — most likely automatically, with something that asked a real question. By mid-morning they had a call booked.",
      "You replied at 9:40. Perfectly good reply. Friendly, professional, offered to talk it through. It landed on somebody who had already spoken to a competitor and was now, without quite realising it, comparing your first message to a conversation that was three hours old.",
      "Sometimes you still win those. Mostly you get no reply, and it goes down as a tyre-kicker.",
      "That is the expensive part, and it is not the lost job. It is that the enquiry is still sitting in your inbox, and it looks exactly like a lead. Not like a loss. There is no missed-call badge, no bounce rate, no red number anywhere in any dashboard. You have a record of it arriving and no record at all of why it died.",
      "So the conclusion you reach is that the enquiries you get are mostly time-wasters. It is the only conclusion available from the evidence you can see. And it is wrong, which is why nothing changes.",
    ],
  },
  {
    // The value anchor. Everything before this is one lost enquiry; this is the
    // lost enquiry multiplied, and it is what makes the price a small number.
    // The reader supplies the figures — that is more persuasive than we are.
    id: "arithmetic",
    eyebrow: "11:47 PM × 52",
    heading: "Now do it for a year.",
    body: [
      "Take your average project value. Not your biggest, not your smallest — your average. Hold that number.",
      "Now count the enquiries that came through the site last year. You have that figure, or you can get it in about a minute. Then be honest about how many of them you replied to within the hour, on the day they arrived, with something that asked them a question rather than acknowledging receipt.",
      "The gap between those two numbers is what this page is about. Every one in that gap was a person who had already decided to spend money and was waiting to be told where to put it.",
      "You do not need to know exactly how many of them you would have won. You only need to decide whether it is more than one a month — because one a month, multiplied by your average, is almost certainly larger than the cost of fixing this by a wide margin. And it recurs every year until something changes.",
    ],
  },
] as const;

export const MECHANISM = {
  heading: "We build the website that answers.",
  body: [
    "Start with the thing that is actually broken, because it is rarely the design. Your site takes an enquiry and puts it in a queue. Everything after that depends on a human being who is asleep, on a job, or on holiday. That is the whole failure, and no amount of restyling the homepage touches it.",
    "So the site answers. Not an auto-responder — not “Thank you, we have received your message, we will be in touch.” Everyone knows what that means, and what it means is nobody read it.",
    "A real conversation, in the ninety seconds while they are still sitting there. The site asks what they need. It asks what kind of project, what sort of timeline, roughly what they are working with. It works out whether they are a serious buyer or somebody pricing a hobby. It puts the serious ones straight into your calendar. And when you wake up, the whole exchange is in your inbox — what they want, when they want it, and whether they are worth your Tuesday.",
    "Notice what that does to the race. You are no longer competing on who checks their email first. You answered at 11:48, while the other two were still queuing, and by the time anybody else replies you already have the call booked.",
    "Then the rest of it has to hold up, because the same person is still deciding. Your site has to load on a phone on mobile data without them giving up — most of your enquiries arrive that way, at night, on a handset, on whatever signal is going. It has to say what you charge, or enough about it that a serious buyer knows they are in the right place and a hobbyist knows they are not. It has to look like the more serious operation, because when someone is choosing between three suppliers, the one whose site looks like it belongs to a real company gets the benefit of the doubt before a word is read.",
    "And you already know the alternative, because it is what you have. A site that was fine when it was built, that nobody has touched in three years, quietly forwarding enquiries to an inbox and hoping somebody gets there in time. It is not that it does not work. It is that it does exactly half the job and stops at the point where the money is.",
    "We build for the ninety seconds after somebody decides. That is the whole business.",
  ],
} as const;

export const OFFER = {
  heading: "The free 30-minute teardown",
  body: [
    "Thirty minutes, on a call, screen shared. Here is exactly what happens.",
    "We start with your site on a phone, on throttled mobile data, the way the person at 11:47 PM had it. You watch it load. Most people have never once seen their own site load under the conditions their customers actually use, and in our experience that is the most useful thirty seconds most business owners spend all quarter.",
    "Then we fill in your own contact form together, live, and watch what comes back. Whatever it is, we read it the way a stranger reads it.",
    "Then we look at what the searches for what you sell return — the ones somebody runs when they do not have your name yet, only your trade and their town — and you see who is collecting those people instead of you.",
    "Then we map the fix. What has to change, what it costs, and the date it would go live. Real numbers and a real date, not a range.",
    "You keep the recording and the plan whether you hire us or not. There is no pitch on this call. If your site is doing its job and the enquiries genuinely are the problem, we will tell you that, and that will be the end of it.",
  ],
} as const;

/**
 * Ordered by how loudly each objection blocks the sale: price first, then the
 * three beliefs that keep this particular buyer on a site that half-works
 * (it is nearly new / my developer could bolt it on / we do reply), then the rest.
 */
export const OBJECTIONS = [
  {
    q: "What does a site like this cost?",
    // Anchors on value rather than apologising for the number. A hedged price
    // answer invites negotiation; a flat one invites the value conversation.
    a: `Projects start at ${PRICE_FLOOR}. That is a real number, not an opening position we negotiate up from. Whether it is worth it depends entirely on what one job is worth to you, which is the arithmetic we do together on the call. If the numbers do not justify it, we will tell you, and you will have spent thirty minutes.`,
  },
  {
    // The defining objection for someone who has already paid for a site once.
    // Agree with the premise, then move the argument one step downstream.
    q: "We only had this site built two years ago.",
    a: "Then it was probably built correctly for what it was asked to do, which was to exist and to look right. That is the brief almost every website gets, and yours may well have met it. The brief nobody gave it was to handle a buyer at midnight without you. Two years is not old for a website — it is old for a website that has never been asked to do anything except sit there.",
  },
  {
    q: "Could my developer not just add that?",
    a: "For the auto-reply, yes, and if that is all you want then have them do it and keep the money. What is harder to bolt on is the part that decides which enquiries are worth your Tuesday, because that is not a plugin — it is a set of questions written specifically for what you sell and how you price it, and then the judgement about what to do with each answer. If your developer wants to build that, we will happily tell them on the call exactly how we would do it.",
  },
  {
    q: "We do reply — just not at midnight.",
    a: "Of course, and nobody is suggesting you should be awake. That is the entire point of building the thing that is. The question is not whether you reply, it is what has already happened by the time you do. If a competitor's site asked that person a sensible question at 11:48 and yours acknowledged receipt, you are replying into a conversation that started without you.",
  },
  {
    q: "Can you not just fix the contact form?",
    a: "Sometimes, and we will say so on the call if it is true — occasionally the whole problem is one broken form handler and it is a small job. More often the form is working perfectly and doing precisely what it was built to do, which is the problem. We would rather tell you it is a small fix and do a small fix than sell you a rebuild you did not need.",
  },
  {
    q: "How long does a build take?",
    a: `${BUILD_TIMEFRAME}. We will give you a real date on the call, not a range.`,
  },
  {
    q: "Who actually does the work?",
    a: "We do. There is no account manager relaying messages to a subcontractor you never meet. You will be talking to the people building it, which is also why we cannot take many projects at once.",
  },
  {
    q: "Where are you based?",
    // Selling high-ticket into overseas markets from Kingston invites the
    // "offshore, therefore cheap" assumption. Meet it head on rather than
    // leaving the reader to draw it themselves.
    a: `Kingston, Jamaica. We work with clients in ${MARKETS}. Worth saying plainly: we are not an offshore shop competing on price. Our rates are what they are because of the work. Most of our clients have never been to our office and do not need to be — everything runs over video and shared documents, and you will always know exactly who is building your site.`,
  },
] as const;

export const FINAL_CTA = {
  heading: "Find out what your site does with an enquiry at midnight.",
  subhead:
    "Thirty minutes, live on a call, and it costs nothing. Worst case, you learn your site is fine as it is.",
} as const;

/**
 * The signature element. One orchestrated moment, nothing else animated.
 *
 * Same enquiry, twice. The first card is the one that went into the queue and
 * died there; the second is the same minute with a site that answered.
 */
export const NOTIFICATION_CARDS = {
  unanswered: {
    source: "Contact form",
    stamp: "11:47 PM",
    title: "New enquiry — kitchen refit, Norbrook",
    body: "Auto-reply sent: “Thank you for your message, we will be in touch shortly.” Opened by you at 9:40 AM.",
    status: "They hired whoever answered first",
  },
  answered: {
    source: "Your website",
    stamp: "11:47 PM",
    title: "Enquiry qualified — kitchen refit, Norbrook",
    body: "Asked what room, what timeline, and roughly what they are working with. All three answered. Serious buyer.",
    status: "Call booked for Tuesday, 10:00 AM",
  },
  caption: "Same enquiry. Same minute. That is the whole difference.",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// BUILD GUARD
// ─────────────────────────────────────────────────────────────────────────────

const REQUIRED_VALUES: Record<string, string> = {
  PRIMARY_DOMAIN,
  PRICE_FLOOR,
  BUILD_TIMEFRAME,
  MARKETS,
  CALENDLY_URL,
  "PRIMARY_PROOF.client": PRIMARY_PROOF.client,
  "PRIMARY_PROOF.story": PRIMARY_PROOF.story,
  "PRIMARY_PROOF.quote.text": PRIMARY_PROOF.quote.text,
  "PRIMARY_PROOF.quote.name": PRIMARY_PROOF.quote.name,
  "PRIMARY_PROOF.quote.role": PRIMARY_PROOF.quote.role,
  "PRIMARY_PROOF.quote.company": PRIMARY_PROOF.quote.company,
};

/** Unfilled placeholders, by name. Empty means the page is launch-ready. */
export function unfilledPlaceholders(): string[] {
  return Object.entries(REQUIRED_VALUES)
    .filter(([, value]) => /\[.+\]/.test(value))
    .map(([key]) => key);
}

/**
 * Turns "do not build with the brackets still in" into a build error rather
 * than a hope. Runs at module load; in dev it warns so you can keep working.
 */
function assertNoPlaceholders(): void {
  const unfilled = unfilledPlaceholders();
  if (unfilled.length === 0) return;

  const message =
    `\n${unfilled.length} placeholder(s) in lib/content.ts are still unfilled:\n` +
    unfilled.map((key) => `  · ${key}`).join("\n") +
    `\n\nGoogle Ads prohibits unsubstantiated claims. Fill these before running ads.\n`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(`BUILD BLOCKED —${message}`);
  }
  console.warn(`\x1b[33m⚠ CONTENT INCOMPLETE —${message}\x1b[0m`);
}

assertNoPlaceholders();
