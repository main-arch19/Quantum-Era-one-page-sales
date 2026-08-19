/**
 * The exit offer — 10% off setup, claimed on the way out.
 *
 * This is the page's second capture. The main form asks for five fields from
 * somebody who is still interested; this asks for three from somebody who has
 * already decided to leave. Every field here was weighed against that: a
 * visitor with one foot out the door does not fill in a phone number, and
 * asking for one costs the whole claim.
 *
 * Copy lives here rather than in lib/content.ts because content.ts is the
 * page's argument — the narrative, the proof, the objections — and it is
 * placeholder-checked as such. The offer is a mechanism, not an argument.
 */

/** Shown to the claimer on screen and in their email. Honoured by hand. */
export const DISCOUNT_CODE = "QES10";

export const DISCOUNT_PERCENT = 10;

/**
 * The terms. Not optional and not decorative.
 *
 * "10% off" with nothing after it is an unqualified claim, and an unqualified
 * claim is the thing that gets a lead-gen page in trouble — with the ASA for
 * being unsubstantiated, and with the visitor who books expecting 10% off a
 * number we never named. One sentence, stating exactly what it applies to,
 * costs nothing and settles both.
 */
export const DISCOUNT_TERMS =
  "10% comes off the setup fee on one project, applied to the figure we quote you on the call. It does not stack with another offer.";

export const DISCOUNT_COPY = {
  eyebrow: "Before you go",
  heading: "Take 10% off the setup.",
  body: "You came here to find out what a new site would cost. Leave us three lines and we will come back with a real number — with 10% already taken off the setup.",
  button: "Claim my 10%",
  sending: "Claiming…",
  /** The dismiss. Named plainly — a coy "no thanks" that hides the cost is a dark pattern. */
  dismiss: "No thanks",
  closeLabel: "Close this offer",
  consent:
    "No list, no sequence. We reply once, by email, and only about this.",
} as const;

/**
 * Three fields, in the same shape as ENQUIRY_FIELDS so the modal can render
 * them with the identical markup the main form uses. Order matches the main
 * form too — identity, contact, then the field that takes thought.
 *
 * No phone and no business name. Both are recoverable on the call; a claim
 * that never gets made is not.
 */
export const DISCOUNT_FIELDS = [
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
 * Prefixed onto the stored description.
 *
 * Belt and braces for the discount_claimed column. That column is set by a
 * second, best-effort UPDATE after the insert RPC returns, so it can fail
 * independently of the row landing. This marker rides inside the row itself
 * and cannot come apart from it — whoever opens the lead in the CRM sees the
 * claim either way.
 */
export const DISCOUNT_MARKER = `[${DISCOUNT_PERCENT}% setup discount claimed — code ${DISCOUNT_CODE}]`;
