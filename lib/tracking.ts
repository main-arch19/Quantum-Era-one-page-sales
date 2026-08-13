/**
 * gtag helpers. Every call is a no-op when the tag has not loaded (ad blocker,
 * local dev without IDs), so tracking never breaks the page.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID ?? "";
export const ADS_CONVERSION_ID = process.env.NEXT_PUBLIC_ADS_CONVERSION_ID ?? "";
export const ADS_CONVERSION_LABEL =
  process.env.NEXT_PUBLIC_ADS_CONVERSION_LABEL ?? "";

export const TRACKING_ENABLED = Boolean(GA4_ID || ADS_CONVERSION_ID);

/**
 * Runs `task` once gtag is actually available.
 *
 * This matters more than it looks. The tag loads with strategy
 * "afterInteractive", so on /booked the conversion effect runs BEFORE
 * window.gtag exists — a naive `if (!window.gtag) return` drops the conversion
 * silently, and Google Ads then has no signal to optimise on while you keep
 * paying for clicks.
 *
 * Queuing straight into dataLayer would fire but land ahead of the `config`
 * command, so the event may never be attributed to a tag. Waiting for gtag
 * keeps the ordering correct.
 */
function whenGtagReady(task: () => void, timeoutMs = 10_000): void {
  if (typeof window === "undefined") return;

  if (typeof window.gtag === "function") {
    task();
    return;
  }

  const startedAt = Date.now();
  const poll = window.setInterval(() => {
    if (typeof window.gtag === "function") {
      window.clearInterval(poll);
      task();
    } else if (Date.now() - startedAt > timeoutMs) {
      // Ad blocker, offline, or no IDs configured. Give up quietly — a missing
      // analytics event must never break the page.
      window.clearInterval(poll);
    }
  }, 150);
}

function gtag(...args: unknown[]): void {
  whenGtagReady(() => window.gtag!(...args));
}

/** GA4 primary engagement event, fired the moment a submit succeeds. */
export function trackFormSubmit(params?: Record<string, unknown>): void {
  gtag("event", "form_submit", { event_category: "lead", ...params });
}

/**
 * Stage 1 completed — somebody typed a URL and got findings back.
 *
 * Not a conversion. It is the micro-conversion that tells you whether the
 * hero is working independently of whether the gate is: a healthy audit_run
 * rate with a poor form_submit rate means the findings are not compelling
 * enough to be worth an email, which is a copy problem, not a traffic problem.
 */
export function trackAuditRun(): void {
  gtag("event", "audit_run", { event_category: "engagement" });
}

/** Engagement signal — long-copy page, 75% depth means they actually read it. */
export function trackScroll75(): void {
  gtag("event", "scroll_75", { event_category: "engagement" });
}

/**
 * The Google Ads conversion. Fired on /booked rather than at submit time so a
 * re-submit cannot double-count, and deduped on transaction_id so a page
 * refresh cannot either.
 */
export function trackAdsConversion(leadId: string): void {
  if (!ADS_CONVERSION_ID || !ADS_CONVERSION_LABEL) return;
  gtag("event", "conversion", {
    send_to: `${ADS_CONVERSION_ID}/${ADS_CONVERSION_LABEL}`,
    transaction_id: leadId,
  });
}

/**
 * Secondary conversion — Calendly's postMessage when a time is chosen.
 *
 * This is the CLIENT half of a deliberately doubled loop. The server half is
 * the invitee.created webhook, which writes booked_at in Supabase. This one is
 * immediate and is what the ad platform optimises on; the webhook is durable
 * and survives the browser closing mid-flow. Neither replaces the other.
 */
export function trackCallBooked(): void {
  gtag("event", "call_booked", { event_category: "lead" });
}

/** UTM/click params carried through to the lead email, so you can see which keyword paid off. */
export const TRACKED_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
] as const;

export type TrackedParam = (typeof TRACKED_PARAMS)[number];
