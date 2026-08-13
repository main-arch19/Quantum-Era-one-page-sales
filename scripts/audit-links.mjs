#!/usr/bin/env node
/**
 * ZERO-LEAKAGE AUDIT
 *
 * Every exit that is not the form is a click you already paid for and lost.
 * This asserts the invariant the whole page design rests on: there are NO
 * hrefs in the rendered HTML at all.
 *
 * That invariant used to have one exception, the tel: number in the header.
 * The number is gone — it could not be answered reliably, and a number that
 * rings out contradicts the argument the page is making. With it went the last
 * permitted href, so the rule is now absolute and this script enforces it as
 * such. In-page #anchors remain fine; they go nowhere.
 *
 * Run against a dev or production server:
 *   npm run dev
 *   npm run audit:links
 *
 * Override the base with AUDIT_BASE=https://yourdomain.com/websites-that-answer
 */

const BASE =
  process.env.AUDIT_BASE ?? "http://localhost:3000/websites-that-answer";

/** Scripts permitted to reach a third-party host, and where. */
const ALLOWED_SCRIPT_HOSTS = {
  "/": ["www.googletagmanager.com"],
  "/booked": ["www.googletagmanager.com", "assets.calendly.com"],
};

// /booked now takes ONLY a lead id — name and email are read from the stored
// row, not from the URL. A well-formed UUID that matches nothing is the right
// probe: the page must render, and leak nothing, even with no lead behind it.
const AUDIT_LEAD_ID = "00000000-0000-4000-8000-000000000000";
const ROUTES = ["/", `/booked?lid=${AUDIT_LEAD_ID}`];

let failures = 0;

function fail(route, message) {
  failures += 1;
  console.error(`  ✗ ${message}`);
}

function pass(message) {
  console.log(`  ✓ ${message}`);
}

async function auditRoute(route) {
  const url = `${BASE}${route}`;
  console.log(`\n${url}`);

  let html;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      fail(route, `HTTP ${response.status} — is the server running?`);
      return;
    }
    html = await response.text();
  } catch (error) {
    fail(route, `Could not fetch: ${error.message}`);
    return;
  }

  // ── hrefs ──────────────────────────────────────────────────────────────
  const hrefs = [...html.matchAll(/<a\b[^>]*?href=["']([^"']*)["']/gi)].map(
    (match) => match[1]
  );

  // Zero tolerance. Anything that is not an in-page #anchor is a leak,
  // including mailto: — the footer address is deliberately plain text.
  const leaks = hrefs.filter((href) => !href.startsWith("#"));

  if (leaks.length === 0) {
    pass(`${hrefs.length} anchor(s), no leaks`);
  } else {
    for (const leak of new Set(leaks)) {
      fail(route, `LEAK — anchor points off-page: ${leak}`);
    }
  }

  // ── target="_blank" ────────────────────────────────────────────────────
  if (/target=["']_blank["']/i.test(html)) {
    fail(route, `LEAK — target="_blank" opens a new tab`);
  } else {
    pass("no new-tab targets");
  }

  // ── external scripts ───────────────────────────────────────────────────
  const routeKey = route.startsWith("/booked") ? "/booked" : "/";
  const allowedHosts = ALLOWED_SCRIPT_HOSTS[routeKey];

  const scriptSrcs = [
    ...html.matchAll(/<script\b[^>]*?src=["']([^"']*)["']/gi),
  ].map((match) => match[1]);

  const externalScripts = scriptSrcs.filter((src) => /^https?:\/\//i.test(src));
  const disallowed = externalScripts.filter((src) => {
    try {
      return !allowedHosts.includes(new URL(src).hostname);
    } catch {
      return true;
    }
  });

  if (disallowed.length === 0) {
    pass(
      `${externalScripts.length} external script(s), all permitted${
        externalScripts.length ? ` (${allowedHosts.join(", ")})` : ""
      }`
    );
  } else {
    for (const src of new Set(disallowed)) {
      fail(route, `LEAK — unpermitted external script: ${src}`);
    }
  }

  // ── iframes ────────────────────────────────────────────────────────────
  const iframes = [
    ...html.matchAll(/<iframe\b[^>]*?src=["']([^"']*)["']/gi),
  ].map((match) => match[1]);

  const badFrames = iframes.filter((src) => {
    if (!/^https?:\/\//i.test(src)) return false;
    try {
      return !allowedHosts.includes(new URL(src).hostname);
    } catch {
      return true;
    }
  });

  if (badFrames.length === 0) {
    pass(`${iframes.length} iframe(s), none unpermitted`);
  } else {
    for (const src of new Set(badFrames)) {
      fail(route, `LEAK — unpermitted iframe: ${src}`);
    }
  }
}

console.log("ZERO-LEAKAGE AUDIT");
console.log("Permitted hrefs: NONE (in-page #anchors only)");

for (const route of ROUTES) {
  await auditRoute(route);
}

console.log("");
if (failures > 0) {
  console.error(`FAILED — ${failures} leak(s) found.\n`);
  process.exit(1);
}
console.log("PASSED — no leaks.\n");
