import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

/**
 * Calendly invitee.created → set booked_at on the lead.
 *
 * This is the SERVER half of a deliberately doubled booking loop. The client
 * half is the calendly.event_scheduled postMessage in CalendlyEmbed, which
 * fires instantly and is what Google Ads optimises on. This half is slower and
 * durable: it still lands if the visitor closes the tab the moment they
 * confirm, if their browser blocks the script, or if an extension eats the
 * postMessage. Neither is a fallback for the other — the fast one feeds the ad
 * platform and the durable one feeds the follow-up list.
 *
 * SETUP. Webhook subscriptions are created through the Calendly API, not the
 * dashboard, and require the STANDARD plan. See README.
 */

export const runtime = "nodejs";
// A webhook must never be served from cache or prerendered.
export const dynamic = "force-dynamic";

/** Reject anything older than this even if the signature is valid. */
const MAX_SIGNATURE_AGE_SECONDS = 300;

type CalendlyPayload = {
  event?: string;
  payload?: {
    uri?: string;
    email?: string;
    event?: string;
    questions_and_answers?: { question?: string; answer?: string; position?: number }[];
  };
};

/**
 * Verifies Calendly's signature header.
 *
 * Format: `t=1234567890,v1=<hex hmac>` over `${t}.${rawBody}`.
 * The raw body is required — re-serialising the parsed JSON changes the bytes
 * and the signature will never match.
 */
function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const [key, ...rest] = piece.trim().split("=");
      return [key, rest.join("=")];
    })
  );

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // Replay window. A captured request must not stay valid indefinitely.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > MAX_SIGNATURE_AGE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  // Constant-time — a fast reject leaks how much of the signature was right.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

/**
 * Pulls the lead ID out of the custom answers.
 *
 * a1 is the FIRST custom question on the event type. Calendly returns answers
 * positionally, so this reads position 0 and falls back to matching on the
 * question text — belt and braces, because the positional contract is exactly
 * the thing that breaks silently when somebody reorders the questions.
 */
function extractLeadId(payload: CalendlyPayload["payload"]): string | null {
  const answers = payload?.questions_and_answers ?? [];
  if (answers.length === 0) return null;

  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const byPosition = answers.find((a) => a.position === 0)?.answer?.trim();
  if (byPosition && uuid.test(byPosition)) return byPosition;

  const byLabel = answers
    .find((a) => /lead\s*id/i.test(a.question ?? ""))
    ?.answer?.trim();
  if (byLabel && uuid.test(byLabel)) return byLabel;

  // Last resort: any answer that looks like our ID. If the questions have been
  // reordered this is what saves the booking from vanishing.
  const anyUuid = answers.map((a) => a.answer?.trim()).find((v) => v && uuid.test(v));
  return anyUuid ?? null;
}

export async function POST(request: Request) {
  const secret = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;

  if (!secret) {
    console.error("[calendly] CALENDLY_WEBHOOK_SIGNING_KEY not set — rejecting");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  // Read the raw bytes BEFORE parsing. Signature is over the exact body.
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get("calendly-webhook-signature"), secret)) {
    // No detail in the response — an attacker probing this gets nothing back.
    console.warn("[calendly] rejected a request with an invalid signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: CalendlyPayload;
  try {
    body = JSON.parse(rawBody) as CalendlyPayload;
  } catch {
    return NextResponse.json({ error: "malformed body" }, { status: 400 });
  }

  // 200 on events we do not handle, so Calendly does not retry them forever.
  if (body.event !== "invitee.created") {
    return NextResponse.json({ ok: true, ignored: body.event ?? "unknown" });
  }

  const leadId = extractLeadId(body.payload);
  if (!leadId) {
    // Somebody booked directly from a Calendly link rather than through the
    // page. Worth knowing about, but not an error we should make Calendly retry.
    console.warn("[calendly] invitee.created with no usable lead id", {
      email: body.payload?.email,
    });
    return NextResponse.json({ ok: true, matched: false });
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.error("[calendly] Supabase not configured — booking not recorded", { leadId });
    // 500 so Calendly retries once the configuration is fixed.
    return NextResponse.json({ error: "storage unavailable" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update({
      booked_at: new Date().toISOString(),
      calendly_event_uri: body.payload?.uri ?? body.payload?.event ?? null,
    })
    .eq("id", leadId)
    // Only the first booking counts. A reschedule must not overwrite the
    // original booking time, which is what the follow-up segment is measured on.
    .is("booked_at", null)
    .select("id");

  if (error) {
    console.error("[calendly] update failed", { leadId, error });
    return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  if (!data || data.length === 0) {
    // Either the id is unknown to us, or it was already marked booked. Both are
    // fine and neither should trigger a retry.
    console.info("[calendly] no row updated", { leadId });
    return NextResponse.json({ ok: true, matched: false });
  }

  return NextResponse.json({ ok: true, matched: true });
}
