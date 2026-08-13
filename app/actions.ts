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
import {
  AuditFailedError,
  GATED_CHECK_COUNT,
  runFreeAudit,
  runFullAudit,
} from "@/lib/audit/run";
import type { AuditResponse, AuditResult } from "@/lib/audit/types";
import type { GateFormState } from "@/lib/form-state";

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

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 — the audit. No personal data, no email, no database row.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the free half of the audit and hands back two findings.
 *
 * Rate limited on its own budget, separately from the gate: this endpoint makes
 * an outbound request to a URL the caller chooses, which is the most abusable
 * thing on the page. The limit is deliberately tighter than the form's.
 */
export async function runAuditAction(
  _prevState: AuditResponse | null,
  formData: FormData
): Promise<AuditResponse> {
  const headerList = await headers();

  // Honeypot — fails silently as a plausible-looking error rather than
  // announcing that we spotted it.
  const honeypot = formData.get("company_website");
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    return { ok: false, message: "We could not reach that address. Check it and try again." };
  }

  const limit = checkRateLimit(`audit:${clientIp(headerList)}`);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      ok: false,
      message: `You have run a few of these in a row. Give it ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`,
    };
  }

  const raw = formData.get("url");
  if (typeof raw !== "string" || !raw.trim()) {
    return { ok: false, message: "Please enter your website address." };
  }

  try {
    const { fetched, free } = await runFreeAudit(raw);
    return {
      ok: true,
      finalUrl: fetched.finalUrl.toString(),
      free,
      lockedCount: GATED_CHECK_COUNT,
      ranAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AuditFailedError) {
      return { ok: false, message: error.message };
    }
    console.error("[audit] unexpected failure", error);
    return {
      ok: false,
      message:
        "Something went wrong at our end running that check — not at yours. Try again in a moment.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 — the email gate. This is the conversion.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Error messages name the problem and the fix. Never a generic
 * "Something went wrong" — a visitor who cannot tell what to correct
 * is a visitor who leaves, and you already paid for them.
 */
const gateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please add your name so we know who we are talking to.")
    .max(100, "That name is longer than we can store — please shorten it."),

  email: z
    .string()
    .trim()
    .min(1, "We need an email address to send the report to.")
    .max(200, "That email address is longer than we can store.")
    .email(
      "That email address is missing something — check for a typo around the @ sign."
    ),

  company: z
    .string()
    .trim()
    .min(2, "We need your company name — it goes on the report.")
    .max(120, "That name is longer than we can store — please shorten it."),

  url: z.string().trim().min(1, "We seem to have lost your website address — please start again."),
});

export async function submitGate(
  _prevState: GateFormState,
  formData: FormData
): Promise<GateFormState> {
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
  const limit = checkRateLimit(`gate:${clientIp(headerList)}`);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryAfterSeconds / 60);
    return {
      ok: false,
      formError: `That request has already been sent. If it did not come through, wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again — or email ${COMPANY.email} and we will send your report by hand.`,
    };
  }

  // ── Validate ──────────────────────────────────────────────────────────────
  const parsed = gateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company"),
    url: formData.get("url"),
  });

  if (!parsed.success) {
    const fieldErrors: GateFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof NonNullable<GateFormState["fieldErrors"]>;
      if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const lead = {
    name: parsed.data.name,
    email: parsed.data.email,
    company: parsed.data.company,
  };

  // ── Re-run the audit server-side ──────────────────────────────────────────
  // The URL arrives from a form field the visitor can edit, so it is re-checked
  // and re-fetched rather than trusted. This also means the emailed report is
  // always about a site we actually looked at, not one we were told about.
  let audit: AuditResult | null = null;
  try {
    audit = await runFullAudit(parsed.data.url);
  } catch (error) {
    // The site went down between stage 1 and stage 2, or the visitor edited the
    // hidden field into something unreachable. Neither is worth losing the lead
    // over — capture them and say so honestly.
    console.warn("[gate] full audit failed, continuing with lead capture", error);
  }

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
      company: lead.company,
      website_url: audit?.finalUrl ?? parsed.data.url,
      audit,
      utm: Object.keys(tracking).length ? tracking : null,
      // booked_at stays NULL. Calendly's webhook sets it.
    });

    if (error) {
      console.error("[gate] supabase insert failed — lead follows", error);
      console.error(JSON.stringify({ leadId, ...lead, url: parsed.data.url }));
    }
  } else {
    console.warn("[gate] Supabase not configured — lead not persisted:", leadId);
  }

  // ── Deliver ───────────────────────────────────────────────────────────────
  const message = buildReportEmail(lead, audit, tracking, leadId, parsed.data.url);
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_TO_EMAIL ?? COMPANY.email;
  const from = process.env.LEAD_FROM_EMAIL ?? "leads@quantumerasolutions.com";

  if (!apiKey) {
    // No key configured (local dev). Log rather than lose the lead, and let
    // the visitor through — their time is not worth our misconfiguration.
    console.warn("[gate] RESEND_API_KEY not set — not emailed:\n", message.text);
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
    console.error("[gate] send failed — lead payload follows", error);
    console.error(message.text);
    return {
      ok: false,
      formError: `We could not send that just now — this is our problem, not yours. Please email ${COMPANY.email} and we will send your report straight over.`,
    };
  }

  redirect(`/booked?lid=${leadId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// The internal notification. Goes to us, not to the lead.
// ─────────────────────────────────────────────────────────────────────────────

function buildReportEmail(
  lead: { name: string; email: string; company: string },
  audit: AuditResult | null,
  tracking: Record<string, string>,
  leadId: string,
  requestedUrl: string
): { subject: string; html: string; text: string } {
  const rows: [string, string][] = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Company", lead.company],
    ["Website", audit?.finalUrl ?? requestedUrl],
  ];

  const findings = audit ? [...audit.free, ...audit.gated] : [];
  const trackingRows = Object.entries(tracking);

  const text = [
    "NEW REPORT REQUEST",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "AUDIT",
    findings.length
      ? findings
          .map(
            (f) =>
              `[${f.verdict.toUpperCase().padEnd(7)}] ${f.label} — ${f.value}\n            ${f.detail}`
          )
          .join("\n")
      : "Audit did not complete — run it manually before the call.",
    "",
    trackingRows.length
      ? ["Campaign source", ...trackingRows.map(([k, v]) => `${k}: ${v}`)].join("\n")
      : "Campaign source: none captured (direct visit)",
    "",
    `Lead ID: ${leadId}`,
  ].join("\n");

  const verdictColour: Record<string, string> = {
    fail: "#B45309",
    warn: "#B45309",
    pass: "#0E14F0",
    unknown: "#9ca3af",
  };

  const html = `
    <div style="font-family:ui-sans-serif,system-ui,sans-serif;color:#12121A;max-width:640px">
      <h2 style="font-size:18px;color:#0A0E52;margin:0 0 16px">New report request</h2>
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

      <h3 style="font-size:13px;color:#6b7280;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.08em">Audit</h3>
      ${
        findings.length
          ? findings
              .map(
                (f) => `
        <div style="border-left:3px solid ${verdictColour[f.verdict] ?? "#9ca3af"};padding:4px 0 4px 12px;margin:0 0 12px">
          <div style="font-family:ui-monospace,monospace;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em">
            ${escapeHtml(f.label)} — ${escapeHtml(f.value)}
          </div>
          <div style="font-size:14px;margin-top:2px">${escapeHtml(f.detail)}</div>
        </div>`
              )
              .join("")
          : `<p style="font-size:14px;color:#B45309;margin:0">Audit did not complete — run it manually before the call.</p>`
      }

      <h3 style="font-size:13px;color:#6b7280;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.08em">Campaign source</h3>
      ${
        trackingRows.length
          ? `<table style="border-collapse:collapse;width:100%;font-size:13px">
              ${trackingRows
                .map(
                  ([k, v]) => `
                <tr>
                  <td style="padding:4px 12px 4px 0;color:#6b7280;font-family:ui-monospace,monospace">${escapeHtml(k)}</td>
                  <td style="padding:4px 0;font-family:ui-monospace,monospace">${escapeHtml(v)}</td>
                </tr>`
                )
                .join("")}
            </table>`
          : `<p style="font-size:13px;color:#6b7280;margin:0">None captured — direct visit.</p>`
      }
      <p style="font-size:12px;color:#9ca3af;margin:24px 0 0">Lead ID ${escapeHtml(leadId)}</p>
    </div>
  `;

  return {
    subject: `Report request — ${lead.name} (${lead.company})`,
    html,
    text,
  };
}
