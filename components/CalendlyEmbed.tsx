"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { trackCallBooked } from "@/lib/tracking";

const CALENDLY_SCRIPT = "https://assets.calendly.com/assets/external/widget.js";
const PARENT_ID = "calendly-inline";

type CalendlyPrefill = {
  name?: string;
  email?: string;
  customAnswers?: Record<string, string>;
};

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget(options: {
        url: string;
        parentElement: HTMLElement;
        prefill?: CalendlyPrefill;
        utm?: Record<string, string | undefined>;
      }): void;
    };
  }
}

/**
 * Calendly, INLINE and on /booked only.
 *
 * Never the popup and never a redirect. Sending anyone to calendly.com is the
 * exact leak this page exists to prevent: it lands them on somebody else's
 * branding at the highest-trust moment on the site, breaks Google Ads
 * conversion tracking across the domain boundary, and loses UTM attribution.
 *
 * Requires Calendly STANDARD. The free plan is disqualified twice over — no
 * webhooks, so the server half of the booking loop cannot exist, and Calendly's
 * own branding on the booking page, which cannot be removed.
 */
export function CalendlyEmbed({
  url,
  leadId,
  websiteUrl,
  name,
  email,
  utm,
}: {
  url: string;
  leadId: string;
  websiteUrl: string;
  name: string;
  email: string;
  utm: Record<string, string>;
}) {
  const [failed, setFailed] = useState(false);
  const initialised = useRef(false);

  // ── Client half of the booking loop ──────────────────────────────────────
  // Fires the moment a time is chosen. Fast and reliable, which is what the ad
  // platform needs. The server half is the invitee.created webhook, which is
  // durable and survives the browser closing mid-flow. Both are required;
  // neither is a fallback for the other.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (
        typeof event.origin === "string" &&
        event.origin.includes("calendly.com") &&
        event.data?.event === "calendly.event_scheduled"
      ) {
        trackCallBooked();
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const initialise = useCallback(() => {
    if (initialised.current) return;

    const parentElement = document.getElementById(PARENT_ID);
    if (!parentElement || !window.Calendly) {
      setFailed(true);
      return;
    }

    initialised.current = true;

    // ═════════════════════════════════════════════════════════════════════
    // ⚠  CUSTOM QUESTION ORDER ON THE CALENDLY EVENT TYPE.
    //
    //    a1  Lead ID                            (hidden)
    //    a2  Website URL                        (hidden)
    //    a3  What do you want the site to do?   (REQUIRED)
    //
    //    a1/a2/a3 map POSITIONALLY to the custom questions as they are
    //    ordered on the event type. Reorder or insert a question in the
    //    Calendly UI and these values silently write into the wrong fields —
    //    no error, no warning, just corrupted data that looks fine until
    //    somebody tries to use it. If you change the questions, change this
    //    block and this comment in the same commit.
    //
    //    a1 carries the lead ID rather than joining on email because prefilled
    //    fields stay EDITABLE. If the invitee corrects their email before
    //    booking, an email join breaks silently and that booking disappears
    //    from attribution. The webhook returns custom answers, so we match on
    //    an ID the invitee never sees and cannot change.
    // ═════════════════════════════════════════════════════════════════════
    window.Calendly.initInlineWidget({
      url,
      parentElement,
      prefill: {
        name,
        email,
        customAnswers: {
          a1: leadId,
          a2: websiteUrl,
        },
      },
      // An object, not URL params — nothing to encode wrongly.
      utm: {
        utmSource: utm.utm_source,
        utmMedium: utm.utm_medium,
        utmCampaign: utm.utm_campaign,
        utmContent: utm.utm_content,
        utmTerm: utm.utm_term,
      },
    });
  }, [url, leadId, websiteUrl, name, email, utm]);

  // The script may already be cached and executed from a previous mount, in
  // which case onReady never fires again.
  useEffect(() => {
    if (window.Calendly) initialise();
  }, [initialise]);

  if (failed) return <CalendlyFallback />;

  return (
    <>
      <div
        id={PARENT_ID}
        className="w-full overflow-hidden rounded-xl border border-line bg-white"
        style={{ minWidth: "320px", height: "700px" }}
      />
      <Script
        src={CALENDLY_SCRIPT}
        strategy="afterInteractive"
        onReady={initialise}
        onError={() => setFailed(true)}
      />
    </>
  );
}

/**
 * Blocked script or bad URL — never leave the visitor at a dead end.
 *
 * No link and no phone number, because there are none left on this page. The
 * lead is already captured and already emailed by the time anybody sees this,
 * so the honest thing to say is that we will come to them.
 */
function CalendlyFallback() {
  return (
    <div className="rounded-xl border border-line bg-white p-6 text-center">
      <p className="text-[1.0625rem] leading-relaxed text-ink/80">
        The scheduler could not load — that is on us, not you. We already have
        your details and your report, and we will email you to fix a time.
        Nothing further is needed from you.
      </p>
    </div>
  );
}
