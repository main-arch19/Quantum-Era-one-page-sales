"use client";

import { useEffect } from "react";
import { trackAdsConversion, trackFormSubmit } from "@/lib/tracking";

const FIRED_KEY = "qes_conversion_fired";

/**
 * Fires the conversion pair once per lead.
 *
 * Both events land here rather than at submit time because the server action
 * redirects — there is no client-side "success" moment to hook. Reaching this
 * page with a lead id means a submission genuinely passed server validation,
 * which is a stricter definition of a conversion than "clicked submit."
 *
 * Deduped on the lead id so a refresh or a back-forward cache restore cannot
 * double-count. transaction_id gives Google Ads the same guarantee server-side.
 *
 * `variant` separates the two populations that land here. A discount claim
 * comes from the exit offer and carries no phone number, which makes it a
 * weaker lead than a full enquiry — reporting that cannot tell them apart
 * overstates both. It rides on the GA4 event only; the Ads conversion fires
 * for both, so the platform still optimises on every submission. If claim
 * quality turns out poor, skipping trackAdsConversion for "discount" is the
 * single line to change.
 */
export function BookedTracking({
  leadId,
  variant = "enquiry",
}: {
  leadId: string;
  variant?: "enquiry" | "discount";
}) {
  useEffect(() => {
    if (!leadId) return;

    try {
      const fired = sessionStorage.getItem(FIRED_KEY);
      if (fired === leadId) return;
      sessionStorage.setItem(FIRED_KEY, leadId);
    } catch {
      // Storage unavailable — fire anyway. An occasional duplicate beats a
      // silently missing conversion.
    }

    trackFormSubmit({ lead_id: leadId, lead_variant: variant });
    trackAdsConversion(leadId);
  }, [leadId, variant]);

  return null;
}
