import type { Finding } from "./types";
import type { SafeFetchResult } from "../url-safety";

/**
 * The checks.
 *
 * Every one of these has to survive being read aloud to the site's owner on a
 * call, so each measures something we actually observed rather than something
 * we inferred. Where we cannot tell, the verdict is "unknown" and says so —
 * a check that guesses is a check that gets contradicted live, and being
 * contradicted on your own audit is the worst possible start to a sales call.
 *
 * The verdict copy lives here rather than in lib/content.ts, against that
 * file's usual rule, because each string is bound to the branch that produces
 * it. Copy that drifts away from the logic it describes is how you end up
 * telling somebody their form is broken when the check actually timed out.
 */

// ─────────────────────────────────────────────────────────────────────────────
// FREE TIER — from one HTML fetch, no API key, sub-2s.
// These two are shown before the email gate.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CHECK 1 — the enquiry path.
 *
 * This leads because it is the check the whole page argues about. We are
 * looking for whether a visitor at midnight has any way to reach them that
 * does not require opening a mail client.
 */
export function checkEnquiryPath(html: string): Finding {
  const forms = [...html.matchAll(/<form\b[^>]*>/gi)].map((m) => m[0]);

  // A search box is not an enquiry path. Exclude the obvious ones so we do not
  // credit a site for having a site-search widget.
  const realForms = forms.filter((tag) => {
    const isSearch = /role=["']search["']|(?:id|class|name)=["'][^"']*search/i.test(tag);
    return !isSearch;
  });

  const hasEmailInput = /<input\b[^>]*type=["']email["']/i.test(html);
  const hasTextarea = /<textarea\b/i.test(html);
  const mailtos = [...html.matchAll(/href=["']mailto:/gi)].length;

  if (realForms.length > 0 && (hasEmailInput || hasTextarea)) {
    return {
      id: "enquiry-path",
      label: "enquiry form",
      verdict: "pass",
      value: `${realForms.length} form${realForms.length === 1 ? "" : "s"}`,
      detail:
        "A visitor can reach you without opening their email. What happens to that enquiry next is the part we go through on the call.",
    };
  }

  if (realForms.length > 0) {
    return {
      id: "enquiry-path",
      label: "enquiry form",
      verdict: "warn",
      value: "incomplete",
      detail:
        "There is a form, but no email or message field on this page — so whatever it collects, it is not an enquiry anyone can act on.",
    };
  }

  if (mailtos > 0) {
    return {
      id: "enquiry-path",
      label: "enquiry form",
      verdict: "fail",
      value: "mailto only",
      detail:
        "The only way to contact you from this page is a mailto: link. That opens an empty mail client and asks a stranger to compose a letter — most people close it.",
    };
  }

  return {
    id: "enquiry-path",
    label: "enquiry form",
    verdict: "fail",
    value: "not found",
    detail:
      "We found no way to contact you from this page at all. Anyone ready to buy at midnight has nowhere to put that.",
  };
}

/**
 * CHECK 2 — first response.
 *
 * Measured on our own request, not modelled. We can quote this back to them
 * exactly, which is what makes it useful: "your server took 2.4 seconds to
 * say hello to us, from a data centre, on a wired connection."
 */
export function checkFirstResponse(fetched: SafeFetchResult): Finding {
  const seconds = fetched.ttfbMs / 1000;
  const value = `${seconds.toFixed(1)}s`;
  const kb = Math.round(fetched.bytes / 1024);

  if (fetched.ttfbMs < 800) {
    return {
      id: "first-response",
      label: "server response",
      verdict: "pass",
      value,
      detail: `Your server answered in ${value} and sent ${kb} KB of HTML. That is a healthy start — nobody is leaving over this.`,
    };
  }

  if (fetched.ttfbMs < 2500) {
    return {
      id: "first-response",
      label: "server response",
      verdict: "warn",
      value,
      detail: `Your server took ${value} to answer us from a data centre on a wired connection. On a phone on mobile data at night, that is meaningfully worse.`,
    };
  }

  return {
    id: "first-response",
    label: "server response",
    verdict: "fail",
    value,
    detail: `Your server took ${value} to answer us — and we are a data centre on a wired connection. Your customer on a handset is waiting considerably longer than that before anything appears.`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GATED TIER — behind the email.
// ─────────────────────────────────────────────────────────────────────────────

/** CHECK 3 — is this thing built for the device most enquiries arrive on. */
export function checkMobileReady(html: string): Finding {
  const viewport = html.match(
    /<meta\b[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["']/i
  );

  if (!viewport) {
    return {
      id: "mobile-ready",
      label: "mobile viewport",
      verdict: "fail",
      value: "missing",
      detail:
        "There is no viewport tag, so phones render your site at desktop width and shrink it. Everything is tiny and the form is close to unusable — and this is where most enquiries come from.",
    };
  }

  const content = viewport[1]!.toLowerCase();
  const scalable = !/user-scalable\s*=\s*(no|0)/.test(content);
  const hasDeviceWidth = /width\s*=\s*device-width/.test(content);

  if (hasDeviceWidth && scalable) {
    return {
      id: "mobile-ready",
      label: "mobile viewport",
      verdict: "pass",
      value: "set",
      detail:
        "The page is set up to lay out properly on a phone. Whether it actually reads well on one is a design question we look at on the call.",
    };
  }

  return {
    id: "mobile-ready",
    label: "mobile viewport",
    verdict: "warn",
    value: hasDeviceWidth ? "zoom disabled" : "misconfigured",
    detail: hasDeviceWidth
      ? "Pinch-zoom is disabled. If anything is too small to read, your visitor has no way to fix it and no reason to stay."
      : "The viewport tag is present but not set to the device width, so phones will not lay the page out correctly.",
  };
}

/** CHECK 4 — the padlock. A warning screen ends the visit. */
export function checkSecureConnection(finalUrl: string): Finding {
  const isHttps = finalUrl.startsWith("https:");

  return isHttps
    ? {
        id: "secure",
        label: "https",
        verdict: "pass",
        value: "valid",
        detail:
          "Your site serves over a valid HTTPS certificate. No browser warnings standing between a buyer and your form.",
      }
    : {
        id: "secure",
        label: "https",
        verdict: "fail",
        value: "not secure",
        detail:
          "Your site is served over plain HTTP. Every modern browser marks it “Not secure” in the address bar, and some will warn before letting anyone submit a form.",
      };
}

/** CHECK 5 — what the search result actually says. */
export function checkSearchListing(html: string): Finding {
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "";
  const description =
    html
      .match(
        /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i
      )?.[1]
      ?.trim() ?? "";

  const genericTitles = /^(home|welcome|untitled|index|new page|my site|home page)$/i;
  const titleIsGeneric = !title || genericTitles.test(title);

  if (titleIsGeneric && !description) {
    return {
      id: "search-listing",
      label: "search listing",
      verdict: "fail",
      value: title ? `“${title}”` : "no title",
      detail:
        "Your page has no usable title and no description, so Google invents both. The one line that decides whether anybody clicks you is being written by a machine that has never seen your business.",
    };
  }

  if (titleIsGeneric) {
    return {
      id: "search-listing",
      label: "search listing",
      verdict: "warn",
      value: `“${title}”`,
      detail:
        "Your page title says nothing about what you do or where you are. In a list of ten results that is the one nobody clicks.",
    };
  }

  if (!description) {
    return {
      id: "search-listing",
      label: "search listing",
      verdict: "warn",
      value: "no description",
      detail:
        "You have a title but no meta description, so Google will scrape whatever text it finds first as your search snippet. Sometimes that is a cookie banner.",
    };
  }

  return {
    id: "search-listing",
    label: "search listing",
    verdict: "pass",
    value: `${description.length} chars`,
    detail:
      "Title and description are both set, so you control the two lines a stranger reads before deciding whether to click you.",
  };
}

/** CHECK 6 — does the site look abandoned. */
export function checkFreshness(
  html: string,
  headers: Headers
): Finding {
  const thisYear = new Date().getFullYear();

  // The copyright line in the footer is the signal a human actually reads.
  const years = [...html.matchAll(/(?:©|&copy;|copyright)[^0-9]{0,20}(\d{4})/gi)]
    .map((m) => Number(m[1]))
    .filter((year) => year >= 1995 && year <= thisYear + 1);

  const newest = years.length ? Math.max(...years) : null;
  const lastModified = headers.get("last-modified");

  if (newest === null) {
    return {
      id: "freshness",
      label: "last updated",
      verdict: "unknown",
      value: lastModified ? "no © line" : "unknown",
      detail:
        "We could not find a copyright year on the page. That is not a fault in itself — it just means a visitor has no easy signal that you are still trading.",
    };
  }

  const age = thisYear - newest;

  if (age <= 0) {
    return {
      id: "freshness",
      label: "last updated",
      verdict: "pass",
      value: String(newest),
      detail:
        "Your copyright year is current, so nothing on the page suggests the business has gone quiet.",
    };
  }

  if (age === 1) {
    return {
      id: "freshness",
      label: "last updated",
      verdict: "warn",
      value: String(newest),
      detail: `Your footer still says ${newest}. It is a small thing, and it is the kind of small thing a cautious buyer notices when they are deciding whether you are still around.`,
    };
  }

  return {
    id: "freshness",
    label: "last updated",
    verdict: "fail",
    value: String(newest),
    detail: `Your footer says ${newest}, which is ${age} years ago. To somebody who does not know you, that reads as a business that may have stopped trading.`,
  };
}

/**
 * CHECK 7 — PageSpeed Insights, mobile.
 *
 * The only check that leaves our server for a third party, and the only one
 * that needs a key. It goes LAST and it degrades: an unset key returns
 * "unknown", never a fabricated score. Google's own measurement carries more
 * weight with a sceptical owner than ours does, which is why it is worth the
 * dependency at all.
 */
export async function checkPageSpeed(url: string): Promise<Finding> {
  const apiKey = process.env.PAGESPEED_API_KEY;

  if (!apiKey) {
    return {
      id: "pagespeed",
      label: "mobile speed",
      verdict: "unknown",
      value: "not run",
      detail:
        "The mobile performance check did not run this time. We will do it live on the call instead.",
    };
  }

  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
  );
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("key", apiKey);

  try {
    // PSI genuinely loads the page on Google's hardware, so it is slow.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    const response = await fetch(endpoint, { signal: controller.signal }).finally(
      () => clearTimeout(timer)
    );

    if (!response.ok) throw new Error(`PSI ${response.status}`);

    const data = (await response.json()) as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } };
        audits?: Record<string, { displayValue?: string; numericValue?: number }>;
      };
    };

    const rawScore = data.lighthouseResult?.categories?.performance?.score;
    if (typeof rawScore !== "number") throw new Error("no score");

    const score = Math.round(rawScore * 100);
    const lcpMs = data.lighthouseResult?.audits?.["largest-contentful-paint"]
      ?.numericValue;
    const lcp = typeof lcpMs === "number" ? `${(lcpMs / 1000).toFixed(1)}s` : null;

    const lcpClause = lcp
      ? ` The main content finishes appearing after ${lcp}.`
      : "";

    if (score >= 90) {
      return {
        id: "pagespeed",
        label: "mobile speed",
        verdict: "pass",
        value: `${score}/100`,
        detail: `Google scores your site ${score} out of 100 on a mid-range phone.${lcpClause} Speed is not what is costing you enquiries.`,
      };
    }

    if (score >= 50) {
      return {
        id: "pagespeed",
        label: "mobile speed",
        verdict: "warn",
        value: `${score}/100`,
        detail: `Google scores your site ${score} out of 100 on a mid-range phone.${lcpClause} Some people are giving up before your page finishes loading.`,
      };
    }

    return {
      id: "pagespeed",
      label: "mobile speed",
      verdict: "fail",
      value: `${score}/100`,
      detail: `Google scores your site ${score} out of 100 on a mid-range phone.${lcpClause} At that speed a meaningful share of your traffic never sees the page at all — they are gone before it renders.`,
    };
  } catch {
    return {
      id: "pagespeed",
      label: "mobile speed",
      verdict: "unknown",
      value: "no result",
      detail:
        "Google's speed test did not return in time for your site. We will run it live on the call instead.",
    };
  }
}
