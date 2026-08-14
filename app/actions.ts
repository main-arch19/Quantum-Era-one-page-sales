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

  email: z
    .string()
    .trim()
    .min(1, "We need an email address to reply to.")
    .max(200, "That email address is longer than we can store.")
    .email(
      "That email address is missing something — check for a typo around the @ sign."
    ),

  // Optional on purpose. Most people fill it without being made to, so
  // requiring it only loses the privacy-cautious for no extra information.
  phone: z
    .string()
    .trim()
    .max(40, "That number is longer than we can store — digits only is fine.")
    .optional()
    .or(z.literal("")),

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
 * The whole lead capture. One stage, four fields.
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

  const renderedAt = Number(formData.get("rendered_at"));
  if (Number.isFinite(renderedAt) && Date.now() - renderedAt < MIN_FILL_MS) {
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
    email: parsed.data.email,
    phone: parsed.data.phone?.trim() ?? "",
    description: parsed.data.description,
  };

  const leadId = randomUUID();
  const tracking = collectTrackingParams(formData);

  // ── Persist ───────────────────────────────────────────────────────────────
  // Best-effort. A database outage must not cost us a lead we paid for, so a
  // failure here is logged loudly and the flow continues to the email.
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from("leads").insert({
      id: leadId,
      name: lead.name,
      email: lead.email,
      phone: lead.phone || null,
      project_description: lead.description,
      utm: Object.keys(tracking).length ? tracking : null,
      // booked_at stays NULL. Calendly's webhook sets it.
    });

    if (error) {
      console.error("[enquiry] supabase insert failed — lead follows", error);
      console.error(JSON.stringify({ leadId, ...lead }));
    }
  } else {
    console.warn("[enquiry] Supabase not configured — not persisted:", leadId);
  }

  // ── Deliver ───────────────────────────────────────────────────────────────
  const message = buildEnquiryEmail(lead, tracking, leadId);
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_TO_EMAIL ?? COMPANY.email;
  const from = process.env.LEAD_FROM_EMAIL ?? "leads@quantumerasolutions.com";

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
// The internal notification. Goes to us, not to the lead.
// ─────────────────────────────────────────────────────────────────────────────

function buildEnquiryEmail(
  lead: { name: string; email: string; phone: string; description: string },
  tracking: Record<string, string>,
  leadId: string
): { subject: string; html: string; text: string } {
  const rows: [string, string][] = [
    ["Name", lead.name],
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
