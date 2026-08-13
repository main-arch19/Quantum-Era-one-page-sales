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
 */
export function BookedTracking({ leadId }: { leadId: string }) {
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

    trackFormSubmit({ lead_id: leadId });
    trackAdsConversion(leadId);
  }, [leadId]);

  return null;
}
