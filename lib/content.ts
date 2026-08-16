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
 * THIS IS PAGE A. Every ARGUMENT below assumes an existing site with an
 * existing contact form. Do NOT broaden that argument to accommodate people
 * with no website — that is a separate page with a separate ad group, and
 * serving both makes this one vague. Vague is what kills paid traffic.
 *
 * THE OFFER IS DELIBERATELY ONE STEP AHEAD OF THE ARGUMENT. The argument
 * proves their current site loses enquiries; the ask is what they want BUILT,
 * and what they receive is a scoped plan with a price and a date. That is not
 * a contradiction — it is the conclusion. Somebody persuaded their site is
 * costing them money does not want a diagnosis, they want the replacement
 * costed. The offer section still opens on the 11:47 PM buyer and step 03
 * still shows them who is collecting those searches; only the starting
 * material changed, from the site they have to the thing they want.
 *
 * So: OFFER, FINAL_CTA and ENQUIRY_COPY speak to build intent. HERO,
 * NARRATIVE_SECTIONS, MECHANISM and OBJECTIONS speak to an existing failing
 * site. Keep that split. Moving build language up into the narrative is what
 * would make this page vague, and it is the specific mistake this note exists
 * to prevent.
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

/** True when a value has been filled in — i.e. no [BRACKETS] left. */
export function isFilled(value: string): boolean {
  return value.length > 0 && !/\[.+\]/.test(value);
}

/**
 * Must match the Google Ads display URL domain exactly, before ads run.
 *
 * Falls back to VERCEL_URL so a deployment always has a usable hostname for
 * metadata without anyone editing this file. Set NEXT_PUBLIC_PRIMARY_DOMAIN,
 * or hardcode the real domain here, once the custom domain is attached.
 */
export const PRIMARY_DOMAIN =
  process.env.NEXT_PUBLIC_PRIMARY_DOMAIN ??
  process.env.VERCEL_URL ??
  "[PRIMARY-DOMAIN]";

/**
 * Shown in the footer as PLAIN TEXT, never a mailto: link.
 *
 * DELIBERATELY NOT derived from PRIMARY_DOMAIN. It used to be
 * `main@${PRIMARY_DOMAIN}`, which meant any staging host published a contact
 * address that does not exist — "main@qes-websites-that-answer.vercel.app" —
 * on the one part of the page whose job is to look legitimate. The real
 * mailbox does not change when the deployment host does.
 *
 * There is no phone number anywhere on this page. It was removed because it
 * could not be answered reliably during working hours, and a number that rings
 * out is worse than no number at all on a page whose entire argument is that
 * slow response loses business.
 */
export const CONTACT_EMAIL = "main@quantumerasolutions.com";

/** Actual project floor price, e.g. "US$4,500". */
export const PRICE_FLOOR = "[FIGURE]";

/** Actual typical build duration, e.g. "Four to six weeks". */
export const BUILD_TIMEFRAME = "[TIMEFRAME]";

/** Markets actually served, e.g. "Jamaica, the wider Caribbean and the US". */
export const MARKETS = "[MARKETS]";

/** The Calendly event link for the build call. Embedded on /booked only. */
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

/**
 * Whether the proof section renders at all.
 *
 * A page with no proof section is weaker. A page that prints "[CLIENT NAME]"
 * is broken, and a page that prints an invented number is a Google Ads policy
 * violation. Omission is the only honest option while the real story does not
 * exist, and it is strictly better than blocking every deploy until it does.
 *
 * Fill PRIMARY_PROOF and the section reappears on its own — nothing else to change.
 */
export const PROOF_READY =
  isFilled(PRIMARY_PROOF.client) &&
  isFilled(PRIMARY_PROOF.story) &&
  isFilled(PRIMARY_PROOF.quote.text) &&
  isFilled(PRIMARY_PROOF.quote.name) &&
  isFilled(PRIMARY_PROOF.quote.role) &&
  isFilled(PRIMARY_PROOF.quote.company);

/**
 * The proof section's eyebrow, which depends on what the section actually
 * contains.
 *
 * Until PRIMARY_PROOF is filled the section is the client roster and nothing
 * else, and "Proof" overpromises against that — it announces evidence and
 * delivers a list of names. Once a real story with a real number sits above
 * the logos, "Proof" is accurate and the roster becomes its supporting cast.
 *
 * Switching on PROOF_READY rather than hardcoding either one means filling
 * PRIMARY_PROOF relabels the section on its own, with nothing else to
 * remember at the point where somebody is busy writing the story.
 *
 * Must stay below PROOF_READY — it reads it at module scope.
 */
export const PROOF_EYEBROW = PROOF_READY
  ? "Proof"
  : "Brands we have worked with";

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

/**
 * The client roster — every client on the portfolio, all ten.
 *
 * Names only here. The artwork lives in components/ClientLogos as static
 * imports, because next/image needs the real file to emit width and height,
 * and a roster that shifts the page as it loads is worse than no roster.
 * Never links, and never a logo that links: a logo is the single most
 * reflexively clicked thing on a paid page, and every click on one is a lead
 * leaving.
 *
 * Seven have a mark that survives being flattened to one ink. Three do not,
 * and they are named in type instead:
 *
 *   Yaadflexx      an illustrated badge — Statue of Liberty, palm trees and
 *                  two lines of its own small type — which at roster size is
 *                  a dark blob.
 *   Pherson's      a blue illustrated card with the background painted in, so
 *                  one ink makes it a navy rectangle.
 *   Power Concepts a photograph of a gold bulb on black. A photo is not a
 *                  logo and cannot be made into one.
 *
 * Setting those three in Sora rather than dropping them keeps every client
 * named and keeps the row one ink. Three images that failed to load would look
 * like a bug; three names set consistently look like a decision.
 *
 * `opticalScale` is the fudge that makes a logo row read level. Sizing every
 * mark to the same pixel height does not do it — a one-line wordmark reads far
 * larger than a three-line lockup of identical height. Eyeballed against the
 * rendered row, not calculated.
 *
 * Order is deliberate: the strongest marks lead, and the three wordmarks are
 * spaced apart. Clustered at the end they would read as a leftover group.
 */
export type ClientMark =
  | { name: string; kind: "logo"; opticalScale: number }
  | { name: string; kind: "wordmark" };

export const TRUST_LINE: readonly ClientMark[] = [
  { name: "Parafount", kind: "logo", opticalScale: 0.78 },
  { name: "Shark Box", kind: "logo", opticalScale: 0.92 },
  { name: "Yaadflexx", kind: "wordmark" },
  { name: "Vivid Walls", kind: "logo", opticalScale: 1.14 },
  // A compact icon with no wordmark beside it. At a height matched to the
  // lockups it reads as a stray leaf, so it gets sized to match their
  // presence rather than their height.
  { name: "Sannovia Skincare", kind: "logo", opticalScale: 1.55 },
  { name: "Power Concepts", kind: "wordmark" },
  { name: "Jamaica Centre for Advanced Medicine", kind: "logo", opticalScale: 1.14 },
  // Fine hairlines and a very small wordmark under the monogram. Sized up so
  // the script reads as a script rather than as a grey smear.
  { name: "Nykefah Nairne", kind: "logo", opticalScale: 1.2 },
  { name: "Pherson's Kellan Estates", kind: "wordmark" },
  { name: "Shop Extreme JA on Wheels", kind: "logo", opticalScale: 1.2 },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// COPY — verbatim. Do not shorten. Do not add adjectives.
// ─────────────────────────────────────────────────────────────────────────────

export const HERO = {
  h1: "At 11:47 last night, someone filled in your contact form.",
  subhead:
    "What your website did in the ninety seconds after that is the reason you never heard from them again.",
} as const;

/**
 * THE ENQUIRY FORM. One stage, four fields.
 *
 * This replaced a two-stage flow that ran a live audit on the visitor's URL
 * and gated the findings behind an email. That traded a lower barrier for a
 * longer path; this trades a higher barrier for a lead that arrives complete
 * and callable.
 *
 * The description is the expensive field — a free-text box in front of an
 * uncommitted visitor is the costliest thing you can ask for. It is required
 * anyway, because it is what makes the lead worth calling and it filters
 * anyone who was never going to show up. Phone is optional for the opposite
 * reason: most people fill it without prompting, so making it mandatory only
 * loses you the privacy-cautious.
 */
export const ENQUIRY_COPY = {
  heading: "Tell us what you want built",
  subheading:
    "Four questions, one minute. A real person reads every one of these and comes back with a real answer, not an auto-reply.",
  button: "Get my build plan",
  sending: "Sending…",
  consent:
    "No list, no sequence. We reply once, by email, and only about this.",
} as const;

/**
 * Field order is deliberate: identity first, contact second, and the field
 * that takes actual thought last, once they are already committed.
 */
export const ENQUIRY_FIELDS = [
  {
    name: "name",
    label: "Your name",
    type: "text",
    autoComplete: "name",
    placeholder: "Marcia Bennett",
    required: true,
  },
  {
    name: "email",
    label: "Work email",
    type: "email",
    autoComplete: "email",
    placeholder: "you@yourbusiness.com",
    required: true,
  },
  {
    name: "phone",
    label: "Phone / WhatsApp",
    type: "tel",
    autoComplete: "tel",
    placeholder: "876 555 0123",
    required: true,
  },
  {
    name: "description",
    label: "What you want built",
    type: "textarea",
    autoComplete: "off",
    placeholder:
      "A few lines is plenty — what the business does, and what you want the new site to do for it.",
    required: true,
  },
] as const;

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
      "Nobody fills in a contact form at 11:47 PM to browse. They have decided, and they are looking for somewhere to put that decision.",
      "They are also the easiest sale you will ever be offered. No haggling, no comparison spreadsheet, no procurement. Just a person who wants somebody to take it from here.",
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
      "They have seen that sentence a thousand times. It does not say when, it does not say who, it does not say what happens next, and it was obviously not written by anyone who read what they sent.",
      "So they did the rational thing, and it took four minutes. They went back to the search results and filled in two more forms. Not because they preferred those companies — they had never heard of them either — but because at 11:47 PM the only sensible strategy is to ask everybody and see who turns up.",
      "You are now in a race you did not know you had entered. The gun went off while you were asleep, and the finish line is whoever replies first with something that sounds like a person who read the message.",
      "Here is the part that should bother you. You were probably the best of the three. Better work, fairer prices, years of doing this. None of it was on the table. The only thing being measured was who answered.",
    ],
  },
  {
    id: "morning",
    eyebrow: "7:15 AM",
    heading: "You will never count this one as a loss.",
    body: [
      "By the time you opened the laptop, one of the other two had already replied — automatically, with something that asked a real question. By mid-morning they had a call booked.",
      "You replied at 9:40. Perfectly good reply. Friendly, professional, offered to talk it through. It landed on somebody who had already spoken to a competitor, and was now comparing your first message to a conversation three hours old.",
      "Sometimes you still win those. Mostly you get no reply, and it goes down as a tyre-kicker.",
      "That is the expensive part, and it is not the lost job. It is that the enquiry is still in your inbox, and it looks exactly like a lead. Not like a loss. No missed-call badge, no bounce rate, no red number in any dashboard. You have a record of it arriving and no record of why it died.",
      "So you conclude that the enquiries you get are mostly time-wasters. It is the only conclusion the evidence allows. And it is wrong, which is why nothing changes.",
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
      "Take your average project value. Not your biggest, not your smallest. Hold that number.",
      "Now count the enquiries that came through the site last year. Then be honest about how many you answered within the hour, on the day, with something that asked a question rather than acknowledging receipt.",
      "The gap between those two numbers is what this page is about. Every one in it had already decided to spend money and was waiting to be told where to put it.",
      "You do not need to know how many you would have won. Only whether it is more than one a month — because one a month, times your average, is a bigger number than fixing this costs. And it recurs every year until something changes.",
    ],
  },
] as const;

export const MECHANISM = {
  heading: "We build the website that answers.",
  body: [
    "Start with the thing that is actually broken, because it is rarely the design. Your site takes an enquiry and puts it in a queue, and everything after that depends on a human being who is asleep, on a job, or on holiday. That is the whole failure, and restyling the homepage does not touch it.",
    "So the site answers. Not an auto-responder — not “Thank you, we have received your message.” Everyone knows what that means, and what it means is nobody read it.",
    "A real conversation, in the ninety seconds while they are still sitting there. It asks what they need, what kind of project, what timeline, what they are working with. It works out whether they are a serious buyer or somebody pricing a hobby, and puts the serious ones straight into your calendar. When you wake up, the whole exchange is in your inbox — what they want, when, and whether they are worth your Tuesday.",
    "Notice what that does to the race. You are no longer competing on who checks their email first. You answered at 11:48, and by the time anybody else replies you already have the call booked.",
    "Then the rest has to hold up, because the same person is still deciding. It has to load on a phone on mobile data — most enquiries arrive that way, at night, on whatever signal is going. It has to say what you charge, or enough that a serious buyer knows they are in the right place and a hobbyist knows they are not.",
    "And it has to look like the more serious operation. When someone is choosing between three suppliers, the one whose site looks like a real company gets the benefit of the doubt before a word is read.",
    "You already know the alternative, because it is what you have. A site that was fine when it was built, that nobody has touched in three years, quietly forwarding enquiries to an inbox and hoping somebody gets there in time. It is not that it does not work. It is that it does exactly half the job and stops at the point where the money is.",
    "We build for the ninety seconds after somebody decides. That is the whole business.",
  ],
} as const;

/**
 * The copy always described four sequential things that happen on the call —
 * "We start… Then we… Then we… Then we map the fix" — but rendered them as
 * six undifferentiated paragraphs, so the sequence was invisible and the
 * reader had to reconstruct it. The words are unchanged; only the shape is.
 *
 * `icon` names map to lucide-react in app/page.tsx. Monochrome Quantum Navy,
 * never Electric — that stays reserved for the CTA.
 */
export const OFFER = {
  heading: "The free 30-minute build call",
  intro: "Thirty minutes, on a call, screen shared. Here is exactly what happens.",
  steps: [
    {
      icon: "lightbulb",
      label: "What you have in mind",
      body: "You talk, we listen, and we write it down as you say it. Most people arrive with the shape of the thing rather than a spec, and that is the right amount to arrive with. The half hour is for turning it into something buildable.",
    },
    {
      icon: "target",
      label: "What it has to do",
      body: "Then we get specific about the job. Who it is for, what has to happen when somebody lands on it, and what counts as it working. A site that looks right and does nothing is the most expensive thing you can buy.",
    },
    {
      icon: "search",
      label: "What the searches return",
      body: "Then we look at what the searches for what you sell return — the ones somebody runs when they do not have your name yet, only your trade and their town — and you see who is collecting those people.",
    },
    {
      icon: "map",
      label: "The build, costed and dated",
      body: "Then we map it. What it takes, what it costs, and the date it would go live. Real numbers and a real date, not a range.",
    },
  ],
  closer:
    "You keep the recording and the plan whether you hire us or not. There is no pitch on this call. If what you want does not need us, we will tell you that, and that will be the end of it.",
} as const;

/**
 * Ordered by how loudly each objection blocks the sale: price first, then the
 * three beliefs that keep this particular buyer on a site that half-works
 * (it is nearly new / my developer could bolt it on / we do reply), then the rest.
 */
/**
 * Raw list. Entries carrying a `requires` value drop out of OBJECTIONS below
 * while that value is unfilled, rather than answering a buyer's question with
 * "[FIGURE]". An objection you cannot answer honestly yet is better left
 * unasked than answered with a placeholder.
 */
const ALL_OBJECTIONS: readonly {
  q: string;
  a: string;
  requires?: string;
}[] = [
  {
    q: "What does a site like this cost?",
    // Anchors on value rather than apologising for the number. A hedged price
    // answer invites negotiation; a flat one invites the value conversation.
    requires: PRICE_FLOOR,
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
    requires: BUILD_TIMEFRAME,
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
    requires: MARKETS,
    a: `Kingston, Jamaica. We work with clients in ${MARKETS}. Worth saying plainly: we are not an offshore shop competing on price. Our rates are what they are because of the work. Most of our clients have never been to our office and do not need to be — everything runs over video and shared documents, and you will always know exactly who is building your site.`,
  },
];

/** Only the objections we can currently answer without a placeholder. */
export const OBJECTIONS = ALL_OBJECTIONS.filter(
  (item) => item.requires === undefined || isFilled(item.requires)
);

export const FINAL_CTA = {
  heading: "Tell us what you want built, and what it should do at midnight.",
  subhead:
    "Thirty minutes, live on a call, and it costs nothing. You leave with a real number and a real date, whether you hire us or not.",
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
 * Deliberate escape hatch for deploying with placeholders still in.
 *
 * Enforcement conflates two different things: BUILDING the page and RUNNING ADS
 * against it. Only the second is actually forbidden. Standing up a preview to
 * test the Supabase, Resend and Calendly wiring is legitimate work, and making
 * that impossible pushes you toward the genuinely bad workaround — inventing a
 * client result to get the build green.
 *
 * So: set ALLOW_PLACEHOLDER_BUILD=1 and the build proceeds. The unfilled banner
 * then renders in production too, so a placeholder deploy is impossible to
 * mistake for a finished one at a glance.
 */
export const PLACEHOLDER_BUILD_ALLOWED =
  process.env.ALLOW_PLACEHOLDER_BUILD === "1";

/** The human-readable list. Shared so the message is identical everywhere. */
export function placeholderReport(unfilled: string[]): string {
  return (
    `\n${unfilled.length} placeholder(s) in lib/content.ts are still unfilled:\n` +
    unfilled.map((key) => `  · ${key}`).join("\n") +
    `\n\nGoogle Ads prohibits unsubstantiated claims. Fill these before running ads.\n`
  );
}

/**
 * NOTHING THROWS AT MODULE SCOPE HERE — deliberately.
 *
 * This used to call an assert that threw during a production build. The throw
 * happened while Next collected page data, so Next caught and re-wrapped it,
 * and the deploy failed with:
 *
 *     [Error: Failed to collect page data for /_not-found] { type: 'Error' }
 *
 * which names a route that has nothing to do with the problem — /_not-found is
 * merely the first route that transitively imports this file. The real reason
 * was buried in a [cause] twenty lines up, and Vercel summarises the last line.
 *
 * Enforcement now lives in scripts/check-content.mts, run by the `prebuild`
 * npm script. It fails BEFORE Next starts, so the reason is the first and last
 * thing in the log and cannot be re-wrapped by anything.
 *
 * What remains here is a dev-time nag that never blocks.
 */
// CONTENT_CHECK_RUNNING suppresses this when scripts/check-content.mts is the
// caller — it prints the same report itself, and two copies of it in one build
// log reads like a bug.
if (
  process.env.NODE_ENV !== "production" &&
  !process.env.CONTENT_CHECK_RUNNING
) {
  const unfilled = unfilledPlaceholders();
  if (unfilled.length > 0) {
    console.warn(
      `\x1b[33m⚠ CONTENT INCOMPLETE —${placeholderReport(unfilled)}\x1b[0m`
    );
  }
}
