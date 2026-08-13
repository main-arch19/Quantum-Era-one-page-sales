import "server-only";

import { safeFetch, UnsafeUrlError, type SafeFetchResult } from "../url-safety";
import type { AuditResult, Finding } from "./types";
import {
  checkEnquiryPath,
  checkFirstResponse,
  checkFreshness,
  checkMobileReady,
  checkPageSpeed,
  checkSearchListing,
  checkSecureConnection,
} from "./checks";

/**
 * Runs the audit in two passes, split on cost rather than on value.
 *
 * The free pass is everything derivable from a single HTML fetch: it returns
 * in a second or two, needs no API key, and is what the visitor sees before
 * being asked for anything. The gated pass adds the checks that are slow
 * (PageSpeed loads the site on Google's hardware) or that only make sense once
 * we have somewhere to send a report.
 *
 * The split is deliberately NOT "show them the good news, charge for the bad."
 * The free two are the two that matter most to the argument this page makes.
 * Gating the damning findings and leading with trivia would be a bait, and it
 * would read as one.
 */

/** The two checks shown before the gate. Exported so the UI can size the list. */
export const FREE_CHECK_COUNT = 2;
export const GATED_CHECK_COUNT = 5;

export class AuditFailedError extends Error {}

/** Stage 1. Cheap, keyless, and safe to run for anyone who types a domain. */
export async function runFreeAudit(
  input: string
): Promise<{ fetched: SafeFetchResult; free: Finding[] }> {
  let fetched: SafeFetchResult;

  try {
    fetched = await safeFetch(input);
  } catch (error) {
    if (error instanceof UnsafeUrlError) throw new AuditFailedError(error.message);
    throw new AuditFailedError(
      "We could not reach that address. Check it for a typo and try again."
    );
  }

  // A 4xx/5xx is itself a finding, but not one we can build a report on — the
  // body we would be auditing is an error page, not their site.
  if (fetched.status >= 400) {
    throw new AuditFailedError(
      `That address returned an error (HTTP ${fetched.status}) rather than a page. If the address is right, your site may be down — which is worth knowing on its own.`
    );
  }

  const free = [
    checkEnquiryPath(fetched.body),
    checkFirstResponse(fetched),
  ];

  return { fetched, free };
}

/**
 * Stage 2. Re-fetches rather than trusting anything from the browser.
 *
 * The client sends back the URL it was given, and the client is not
 * trustworthy — anything it hands us has been through a form the visitor can
 * edit. Re-running the free checks server-side costs one fetch and means the
 * emailed report is always about a site we actually looked at.
 */
export async function runFullAudit(input: string): Promise<AuditResult> {
  const { fetched, free } = await runFreeAudit(input);
  const finalUrl = fetched.finalUrl.toString();

  const gated: Finding[] = [
    checkMobileReady(fetched.body),
    checkSecureConnection(finalUrl),
    checkSearchListing(fetched.body),
    checkFreshness(fetched.body, fetched.headers),
    // Slowest, and the only one that can fail on its own. Last so a PSI outage
    // never delays the four findings that do not depend on it.
    await checkPageSpeed(finalUrl),
  ];

  return {
    finalUrl,
    free,
    gated,
    ranAt: new Date().toISOString(),
  };
}
