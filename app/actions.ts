"use server";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { COMPANY } from "@/lib/content";
import { TRACKED_PARAMS } from "@/lib/tracking";
import { getSupabase } from "@/lib/supabase";
import type { EnquiryFormState } from "@/lib/form-state";
import type { DiscountFormState } from "@/lib/discount-state";
import {
  DISCOUNT_CODE,
  DISCOUNT_MARKER,
  DISCOUNT_PERCENT,
  DISCOUNT_TERMS,
} from "@/lib/discount";

/** A submit arriving faster than this was not typed by a human. */
const MIN_FILL_MS = 3000;

function clientIp(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

function collectTrackingParams(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  for (const key of TRACKED_PARAMS) {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim()) {
      params[key] = value.trim().slice(0, 300);
    }
  }
  return params;
}

/**
 * Environment variable, or the fallback — treating blank as absent.
 *
 * `process.env.X ?? fallback` looks like it does this and does not. `??` only
 * fires on undefined, so a variable that EXISTS but is empty yields "" and
 * skips the fallback entirely.
 *
 * That is not hypothetical. A blank LEAD_TO_EMAIL handed Resend `to: ""` and
 * every notification failed with "Invalid `to` field" while the Vercel
 * dashboard looked correctly filled in — the row was there, so the fallback
 * never ran. Deleting the row fixed it and blanking it would not have, which
 * is a distinction nobody should have to know at 3am.
 *
 * Trimming matters for the same reason: a value pasted with a trailing space
 * or newline is invisible in a dashboard field and rejected by the API.
 */
function envOr(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Every message names what is wrong AND how to fix it. Never
 * "Something went wrong" — a visitor who cannot tell what to correct is a
 * visitor who leaves, and you already paid for them.
 */
const enquirySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please add your name so we know who we are talking to.")
    .max(100, "That name is longer than we can store — please shorten it."),

  // Optional — the only field on the form that is. A business name is
  // something a rep can fill in on the call; a phone number is not.
  company: z
    .string()
    .trim()
    .max(100, "That is longer than we can store — please shorten it.")
    .optional()
    .default(""),

  email: z
    .string()
    .trim()
    .min(1, "We need an email address to reply to.")
    .max(200, "That email address is longer than we can store.")
    .email(
      "That email address is missing something — check for a typo around the @ sign."
    ),

  // Required. The client validator mirrors this exactly — if the two ever
  // disagree, the browser accepts a blank and the server bounces it, which
  // costs a lead that was already filled in.
  phone: z
    .string()
    .trim()
    .min(1, "We need a number we can reach you on.")
    .max(40, "That number is longer than we can store — digits only is fine."),

  // The qualifying field. A real answer is what makes the lead worth calling.
  description: z
    .string()
    .trim()
    .min(
      15,
      "A little more detail, please — a sentence or two about what you want the site to do."
    )
    .max(4000, "That is longer than we can store — please trim it a little."),
});

/**
 * The whole lead capture. One stage, five fields, of which four are required.
 *
 * Replaced a two-stage flow (audit the visitor's URL, then gate the findings
 * behind an email). The audit modules are still in the tree and still tested;
 * nothing here calls them.
 */
export async function submitEnquiry(
  _prevState: EnquiryFormState,
  formData: FormData
): Promise<EnquiryFormState> {
  const headerList = await headers();

  // ── Spam gates ────────────────────────────────────────────────────────────
  // Both fail SILENTLY as success. A bot that learns it was caught adapts.
  const honeypot = formData.get("company_website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    redirect(`/booked?lid=${randomUUID()}`);
  }

  /**
   * The timing gate. Only applied when the browser actually stamped the form.
   *
   * The field is empty until the client effect fills it in, so a blank value
   * means JavaScript never ran — a no-JS visitor, or a bot that posted the
   * form without executing it. Neither can be judged on fill time, and a
   * genuine no-JS submission must not be silently swallowed, so an unstamped
   * form skips this check and is left to the honeypot and rate limiter.
   *
   * Explicitly, rather than by accident: `Number("")` is 0, not NaN, so the
   * old `Number.isFinite` guard let an empty value through as a timestamp at
   * the epoch. It reached the right outcome for the wrong reason, which is the
   * kind of thing that stops being true the moment somebody edits it.
   */
  const stamp = formData.get("rendered_at");
  const renderedAt = typeof stamp === "string" && stamp !== "" ? Number(stamp) : null;
  if (
    renderedAt !== null &&
    Number.isFinite(renderedAt) &&
    Date.now() - renderedAt < MIN_FILL_MS
  ) {
    redirect(`/booked?lid=${randomUUID()}`);
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  const limit = checkRateLimit(`enquiry:${clientIp(headerList)}`);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      ok: false,
      formError: `That enquiry has already been sent. If it did not come through, wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again — or email ${COMPANY.email} and we will pick it up by hand.`,
    };
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  const parsed = enquirySchema.safeParse({
    name: formData.get("name"),
    company: formData.get("company") ?? "",
    email: formData.get("email"),
    phone: formData.get("phone"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    const fieldErrors: EnquiryFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<
        EnquiryFormState["fieldErrors"]
      >;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const lead = {
    name: parsed.data.name,
    company: parsed.data.company?.trim() ?? "",
    email: parsed.data.email,
    phone: parsed.data.phone?.trim() ?? "",
    description: parsed.data.description,
  };

  const leadId = randomUUID();
  const tracking = collectTrackingParams(formData);

  // ── Persist ───────────────────────────────────────────────────────────────
  // Best-effort. A database outage must not cost us a lead we paid for, so a
  // failure here is logged loudly and the flow continues to the email.
  //
  // One RPC rather than two inserts: the lead row and its opening activity
  // have to land together or the CRM shows a lead whose timeline starts with
  // a hole. supabase-js cannot batch two inserts into one transaction, so the
  // transaction lives in the database. See insert_lead_with_activity in
  // supabase/crm-migration.sql in the QESCRM repo, which owns the schema.
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.rpc("insert_lead_with_activity", {
      p_id: leadId,
      p_name: lead.name,
      p_email: lead.email,
      p_phone: lead.phone || null,
      p_company: lead.company || null,
      p_project_description: lead.description,
      p_utm_source: tracking.utm_source ?? null,
      p_utm_medium: tracking.utm_medium ?? null,
      p_utm_campaign: tracking.utm_campaign ?? null,
      p_utm_content: tracking.utm_content ?? null,
      p_utm_term: tracking.utm_term ?? null,
      p_gclid: tracking.gclid ?? null,
      // status 'new', touch_count 0, owner_id null and next_touch_at
      // now() + 2 days are all set inside the function. Unassigned is
      // deliberate: new leads land in a queue and somebody claims them.
      // booked_at stays NULL. Calendly's webhook sets it.
    });

    if (error) {
      console.error("[enquiry] supabase insert failed — lead follows", error);
      console.error(JSON.stringify({ leadId, ...lead, ...tracking }));
    }
  } else {
    console.warn("[enquiry] Supabase not configured — not persisted:", leadId);
  }

  // ── Deliver ───────────────────────────────────────────────────────────────
  const message = buildEnquiryEmail(lead, tracking, leadId);
  const apiKey = process.env.RESEND_API_KEY;
  const to = envOr(process.env.LEAD_TO_EMAIL, COMPANY.email);
  // quantumera.tech, because that is the domain verified in Resend. The old
  // default named quantumerasolutions.com, which Resend refuses to send from —
  // a fallback that failed in exactly the case it existed to cover.
  const from = envOr(process.env.LEAD_FROM_EMAIL, "leads@quantumera.tech");

  if (!apiKey) {
    // No key configured (local dev). Log rather than lose the lead, and let
    // the visitor through — their time is not worth our misconfiguration.
    console.warn(
      "[enquiry] RESEND_API_KEY not set — not emailed:\n",
      message.text
    );
    redirect(`/booked?lid=${leadId}`);
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: lead.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    // Never lose a paid lead to a mail outage. The row is already in Supabase;
    // log the full payload too so it is recoverable either way.
    console.error("[enquiry] send failed — lead payload follows", error);
    console.error(message.text);
    return {
      ok: false,
      formError: `We could not send that just now — this is our problem, not yours. Please email ${COMPANY.email} and we will pick it up straight away.`,
    };
  }

  redirect(`/booked?lid=${leadId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// THE EXIT OFFER
//
// A second capture for somebody who is already leaving. Three fields instead
// of five, no phone, in exchange for 10% off setup.
//
// Deliberately its own action rather than a flag on submitEnquiry. That schema
// requires a phone number — correctly, because the page's whole argument is
// about answering people quickly — and adding a required field to a form shown
// at the moment of abandonment defeats the point of showing it. Two actions
// with two schemas is honest about the fact that these capture two different
// things.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Messages are lifted verbatim from enquirySchema.
 *
 * Not paraphrased, not "improved". A visitor who fails validation in the modal
 * and again in the main form must see the same sentence both times, or the
 * page looks like two different products stitched together.
 */
const discountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please add your name so we know who we are talking to.")
    .max(100, "That name is longer than we can store — please shorten it."),

  email: z
    .string()
    .trim()
    .min(1, "We need an email address to reply to.")
    .max(200, "That email address is longer than we can store.")
    .email(
      "That email address is missing something — check for a typo around the @ sign."
    ),

  description: z
    .string()
    .trim()
    .min(
      15,
      "A little more detail, please — a sentence or two about what you want the site to do."
    )
    .max(4000, "That is longer than we can store — please trim it a little."),
});

export async function submitDiscountClaim(
  _prevState: DiscountFormState,
  formData: FormData
): Promise<DiscountFormState> {
  const headerList = await headers();

  // ── Spam gates ────────────────────────────────────────────────────────────
  // Same two gates as the enquiry, same silent-success behaviour.
  const honeypot = formData.get("company_website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    redirect(`/booked?lid=${randomUUID()}&claim=1`);
  }

  const stamp = formData.get("rendered_at");
  const renderedAt = typeof stamp === "string" && stamp !== "" ? Number(stamp) : null;
  if (
    renderedAt !== null &&
    Number.isFinite(renderedAt) &&
    Date.now() - renderedAt < MIN_FILL_MS
  ) {
    redirect(`/booked?lid=${randomUUID()}&claim=1`);
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  // Its own bucket. Sharing the enquiry's key would mean a visitor who fumbled
  // the modal a few times then found the real form had already spent the
  // budget for the submission we actually wanted.
  const limit = checkRateLimit(`discount:${clientIp(headerList)}`);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      ok: false,
      formError: `That claim has already been sent. If it did not come through, wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again — or email ${COMPANY.email} and we will pick it up by hand.`,
    };
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  const parsed = discountSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    description: formData.get("description"),
  });

  if (!parsed.success) {
    const fieldErrors: DiscountFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<
        DiscountFormState["fieldErrors"]
      >;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const claim = {
    name: parsed.data.name,
    email: parsed.data.email,
    description: parsed.data.description,
  };

  const leadId = randomUUID();
  const tracking = collectTrackingParams(formData);

  // ── Persist ───────────────────────────────────────────────────────────────
  // Same RPC as the enquiry, with nulls where this form does not ask. The
  // function signature is owned by the QESCRM repo and is fixed at eleven
  // parameters — the discount is recorded around it, never by widening it.
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.rpc("insert_lead_with_activity", {
      p_id: leadId,
      p_name: claim.name,
      p_email: claim.email,
      p_phone: null,
      p_company: null,
      // The marker rides inside the row. If the tagging update below fails,
      // this is still visible to whoever opens the lead.
      p_project_description: `${DISCOUNT_MARKER}\n\n${claim.description}`,
      p_utm_source: tracking.utm_source ?? null,
      p_utm_medium: tracking.utm_medium ?? null,
      p_utm_campaign: tracking.utm_campaign ?? null,
      p_utm_content: tracking.utm_content ?? null,
      p_utm_term: tracking.utm_term ?? null,
      p_gclid: tracking.gclid ?? null,
    });

    if (error) {
      console.error("[discount] supabase insert failed — claim follows", error);
      console.error(JSON.stringify({ leadId, ...claim, ...tracking }));
    } else {
      // Best-effort tagging, in a second statement because the RPC cannot
      // carry it. A failure here costs a queryable flag, not the lead, so it
      // is logged and stepped over like everything else on this path.
      const { error: tagError } = await supabase
        .from("leads")
        .update({ discount_claimed: true, discount_code: DISCOUNT_CODE })
        .eq("id", leadId);

      if (tagError) {
        console.error(
          "[discount] lead saved but not tagged — see marker in description",
          tagError
        );
      }
    }
  } else {
    console.warn("[discount] Supabase not configured — not persisted:", leadId);
  }

  // ── Deliver ───────────────────────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  const to = envOr(process.env.LEAD_TO_EMAIL, COMPANY.email);
  // quantumera.tech, because that is the domain verified in Resend. The old
  // default named quantumerasolutions.com, which Resend refuses to send from —
  // a fallback that failed in exactly the case it existed to cover.
  const from = envOr(process.env.LEAD_FROM_EMAIL, "leads@quantumera.tech");
  const internal = buildDiscountEmail(claim, tracking, leadId);

  if (!apiKey) {
    console.warn(
      "[discount] RESEND_API_KEY not set — not emailed:\n",
      internal.text
    );
    redirect(`/booked?lid=${leadId}&claim=1`);
  }

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: claim.email,
      subject: internal.subject,
      html: internal.html,
      text: internal.text,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error("[discount] internal send failed — payload follows", error);
    console.error(internal.text);
    return {
      ok: false,
      formError: `We could not send that just now — this is our problem, not yours. Please email ${COMPANY.email} and we will pick it up straight away.`,
    };
  }

  /**
   * The claimer's copy, in its own try/catch.
   *
   * A failure here must not fail the action. By this point the lead is in the
   * database and the notification is in our inbox — the claim is real and we
   * can honour it whether or not this particular message lands. Bouncing the
   * visitor back to a form they already completed, to re-enter details we
   * already hold, would be the only genuinely lost outcome on this path.
   *
   * They also see the code on the next screen, so a silent failure here still
   * leaves them holding it.
   */
  try {
    const claimer = buildClaimerEmail(claim);
    const { error } = await resend.emails.send({
      from,
      to: claim.email,
      replyTo: to,
      subject: claimer.subject,
      html: claimer.html,
      text: claimer.text,
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    console.error(
      `[discount] code email to claimer failed (lead ${leadId} is safe)`,
      error
    );
  }

  redirect(`/booked?lid=${leadId}&claim=1`);
}

// ─────────────────────────────────────────────────────────────────────────────
// The internal notification. Goes to us, not to the lead.
// ─────────────────────────────────────────────────────────────────────────────

function buildEnquiryEmail(
  lead: {
    name: string;
    company: string;
    email: string;
    phone: string;
    description: string;
  },
  tracking: Record<string, string>,
  leadId: string
): { subject: string; html: string; text: string } {
  const rows: [string, string][] = [
    ["Name", lead.name],
    ["Business", lead.company || "— not given"],
    ["Email", lead.email],
    ["Phone", lead.phone || "— not given"],
  ];

  const trackingRows = Object.entries(tracking);

  const text = [
    "NEW ENQUIRY",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "WHAT THEY WANT BUILT",
    lead.description,
    "",
    trackingRows.length
      ? ["Campaign source", ...trackingRows.map(([k, v]) => `${k}: ${v}`)].join(
          "\n"
        )
      : "Campaign source: none captured (direct visit)",
    "",
    `Lead ID: ${leadId}`,
  ].join("\n");

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;color:#12121A;max-width:640px">
      <h2 style="font-size:18px;color:#0A0E52;margin:0 0 16px">New enquiry</h2>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:8px 12px 8px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
            <td style="padding:8px 0;font-weight:500">${escapeHtml(value)}</td>
          </tr>`
          )
          .join("")}
      </table>

      <h3 style="font-size:14px;color:#0A0E52;margin:24px 0 8px">What they want built</h3>
      <p style="font-size:14px;line-height:1.6;white-space:pre-wrap;margin:0;padding:12px;background:#FAFAFA;border-left:2px solid #0E14F0">${escapeHtml(
        lead.description
      )}</p>

      <h3 style="font-size:14px;color:#0A0E52;margin:24px 0 8px">Campaign source</h3>
      ${
        trackingRows.length
          ? `<table style="border-collapse:collapse;font-size:13px">${trackingRows
              .map(
                ([k, v]) => `
          <tr>
            <td style="padding:4px 12px 4px 0;color:#6b7280">${escapeHtml(k)}</td>
            <td style="padding:4px 0">${escapeHtml(v)}</td>
          </tr>`
              )
              .join("")}</table>`
          : `<p style="font-size:13px;color:#6b7280;margin:0">None captured (direct visit)</p>`
      }

      <p style="font-size:12px;color:#9ca3af;margin:24px 0 0">Lead ID: ${escapeHtml(leadId)}</p>
    </div>
  `.trim();

  return {
    subject: `New enquiry — ${lead.name}`,
    html,
    text,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// The two discount emails.
// ─────────────────────────────────────────────────────────────────────────────

type DiscountClaim = { name: string; email: string; description: string };

/**
 * Ours. Subject is distinct on purpose — a claim is a weaker lead than an
 * enquiry (no phone number, caught on the way out) and wants triaging as one.
 */
function buildDiscountEmail(
  claim: DiscountClaim,
  tracking: Record<string, string>,
  leadId: string
): { subject: string; html: string; text: string } {
  const rows: [string, string][] = [
    ["Name", claim.name],
    ["Email", claim.email],
    ["Phone", "— not asked (exit offer)"],
    ["Discount", `${DISCOUNT_PERCENT}% off setup · code ${DISCOUNT_CODE}`],
  ];

  const trackingRows = Object.entries(tracking);

  const text = [
    `DISCOUNT CLAIM — ${DISCOUNT_PERCENT}% OFF SETUP`,
    "",
    "Caught by the exit offer. They have the code already.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "WHAT THEY WANT BUILT",
    claim.description,
    "",
    trackingRows.length
      ? ["Campaign source", ...trackingRows.map(([k, v]) => `${k}: ${v}`)].join(
          "\n"
        )
      : "Campaign source: none captured (direct visit)",
    "",
    `Terms quoted to them: ${DISCOUNT_TERMS}`,
    "",
    `Lead ID: ${leadId}`,
  ].join("\n");

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;color:#12121A;max-width:640px">
      <h2 style="font-size:18px;color:#0A0E52;margin:0 0 4px">Discount claim — ${DISCOUNT_PERCENT}% off setup</h2>
      <p style="font-size:13px;color:#6b7280;margin:0 0 16px">Caught by the exit offer. They have the code already.</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:8px 12px 8px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
            <td style="padding:8px 0;font-weight:500">${escapeHtml(value)}</td>
          </tr>`
          )
          .join("")}
      </table>

      <h3 style="font-size:14px;color:#0A0E52;margin:24px 0 8px">What they want built</h3>
      <p style="font-size:14px;line-height:1.6;white-space:pre-wrap;margin:0;padding:12px;background:#FAFAFA;border-left:2px solid #0E14F0">${escapeHtml(
        claim.description
      )}</p>

      <h3 style="font-size:14px;color:#0A0E52;margin:24px 0 8px">Campaign source</h3>
      ${
        trackingRows.length
          ? `<table style="border-collapse:collapse;font-size:13px">${trackingRows
              .map(
                ([k, v]) => `
          <tr>
            <td style="padding:4px 12px 4px 0;color:#6b7280">${escapeHtml(k)}</td>
            <td style="padding:4px 0">${escapeHtml(v)}</td>
          </tr>`
              )
              .join("")}</table>`
          : `<p style="font-size:13px;color:#6b7280;margin:0">None captured (direct visit)</p>`
      }

      <p style="font-size:13px;color:#6b7280;margin:24px 0 0;padding-top:12px;border-top:1px solid #E5E7EB">Terms quoted to them: ${escapeHtml(
        DISCOUNT_TERMS
      )}</p>
      <p style="font-size:12px;color:#9ca3af;margin:8px 0 0">Lead ID: ${escapeHtml(leadId)}</p>
    </div>
  `.trim();

  return {
    subject: `Discount claim — ${claim.name}`,
    html,
    text,
  };
}

/**
 * Theirs. The code in writing, plus the terms.
 *
 * The terms are in here rather than only on screen because this is the copy
 * they keep. An offer whose conditions live only on a page they have already
 * left is one they will remember differently to us, and the call is where
 * that disagreement would surface.
 */
function buildClaimerEmail(claim: DiscountClaim): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = claim.name.trim().split(/\s+/)[0] ?? "";
  const greeting = firstName ? `${firstName},` : "Hello,";

  const text = [
    greeting,
    "",
    `Here is your code: ${DISCOUNT_CODE}`,
    "",
    `It takes ${DISCOUNT_PERCENT}% off the setup fee. ${DISCOUNT_TERMS}`,
    "",
    "Nothing else is needed from you now. We have what you sent about the",
    "project and a real person is reading it — we will come back by email",
    "with a number that already has the discount in it.",
    "",
    "If you would rather not wait, the booking page you were just on has our",
    "calendar on it. Thirty minutes is usually enough to cover the whole thing.",
    "",
    COMPANY.name,
    COMPANY.email,
  ].join("\n");

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;color:#12121A;max-width:560px;line-height:1.6">
      <p style="font-size:16px;margin:0 0 20px">${escapeHtml(greeting)}</p>

      <div style="padding:20px;background:#FAFAFA;border-left:3px solid #0E14F0;margin:0 0 20px">
        <p style="font-size:13px;color:#6b7280;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.06em">Your code</p>
        <p style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:24px;font-weight:700;color:#0A0E52;margin:0;letter-spacing:0.04em">${escapeHtml(
          DISCOUNT_CODE
        )}</p>
      </div>

      <p style="font-size:15px;margin:0 0 20px">It takes ${DISCOUNT_PERCENT}% off the setup fee. ${escapeHtml(
        DISCOUNT_TERMS
      )}</p>

      <p style="font-size:15px;margin:0 0 20px">Nothing else is needed from you now. We have what you sent about the project and a real person is reading it — we will come back by email with a number that already has the discount in it.</p>

      <p style="font-size:15px;margin:0 0 24px">If you would rather not wait, the booking page you were just on has our calendar on it. Thirty minutes is usually enough to cover the whole thing.</p>

      <p style="font-size:14px;color:#6b7280;margin:0;padding-top:16px;border-top:1px solid #E5E7EB">
        ${escapeHtml(COMPANY.name)}<br>
        ${escapeHtml(COMPANY.email)}
      </p>
    </div>
  `.trim();

  return {
    subject: `Your ${DISCOUNT_PERCENT}% code — ${DISCOUNT_CODE}`,
    html,
    text,
  };
}
