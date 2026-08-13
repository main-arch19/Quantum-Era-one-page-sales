#!/usr/bin/env node
/**
 * URL SAFETY + AUDIT CHECK TESTS
 *
 * Stage 1 hands an anonymous visitor's URL to the server, which then fetches
 * it. That is an SSRF primitive, and on a cloud host the metadata endpoint at
 * 169.254.169.254 will hand credentials to anything that asks from inside the
 * network. These cases are the reason lib/url-safety.ts exists — run them
 * after touching it.
 *
 *   npm run test:audit
 *
 * The blocked-address cases are offline and deterministic. The two that need
 * DNS are marked and skip cleanly when there is no network.
 */

import { normaliseUrl, safeFetch, UnsafeUrlError } from "../lib/url-safety.ts";
import {
  checkEnquiryPath,
  checkFreshness,
  checkMobileReady,
  checkSearchListing,
  checkSecureConnection,
} from "../lib/audit/checks.ts";

let failures = 0;
let skipped = 0;

function ok(label: string) {
  console.log(`  ✓ ${label}`);
}

function bad(label: string, detail: string) {
  failures += 1;
  console.error(`  ✗ ${label}`);
  console.error(`      ${detail}`);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\nURL NORMALISATION\n");
// ─────────────────────────────────────────────────────────────────────────────

const NORMALISE_OK: [string, string][] = [
  ["yourbusiness.com", "https://yourbusiness.com/"],
  ["http://example.com", "http://example.com/"],
  ["HTTPS://Example.com/Path", "https://example.com/Path"],
  ["example.com/contact?x=1", "https://example.com/contact?x=1"],
  // Credentials are stripped: they are never legitimate and confuse redirects.
  ["https://user:pass@example.com/", "https://example.com/"],
];

for (const [input, expected] of NORMALISE_OK) {
  try {
    const actual = normaliseUrl(input).toString();
    actual === expected
      ? ok(`${input} → ${actual}`)
      : bad(input, `expected ${expected}, got ${actual}`);
  } catch (error) {
    bad(input, `threw: ${(error as Error).message}`);
  }
}

const NORMALISE_REJECT = [
  "file:///etc/passwd",
  "ftp://example.com",
  "javascript:alert(1)",
  "data:text/html,<h1>hi</h1>",
  "gopher://example.com",
  "localhost",       // no dot — not a public domain
  "",
];

for (const input of NORMALISE_REJECT) {
  try {
    const result = normaliseUrl(input).toString();
    bad(input || "(empty)", `should have been rejected, got ${result}`);
  } catch (error) {
    error instanceof UnsafeUrlError
      ? ok(`rejected ${input || "(empty)"}`)
      : bad(input, `wrong error type: ${(error as Error).name}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\nSSRF — RESERVED ADDRESS SPACE\n");
// ─────────────────────────────────────────────────────────────────────────────

/** Bare IPs need no DNS, so these run offline and are the important ones. */
const BLOCKED = [
  ["http://169.254.169.254/latest/meta-data/", "cloud metadata — THE one"],
  ["http://127.0.0.1:3000/", "loopback"],
  ["http://10.0.0.1/", "RFC1918 10/8"],
  ["http://192.168.1.1/", "RFC1918 192.168/16"],
  ["http://172.16.5.4/", "RFC1918 172.16/12"],
  ["http://[::1]/", "IPv6 loopback"],
  ["http://[::ffff:169.254.169.254]/", "IPv4-mapped metadata"],
  ["http://100.64.0.1/", "carrier-grade NAT"],
  ["http://0.0.0.0/", "this network"],
];

for (const [url, why] of BLOCKED) {
  try {
    await safeFetch(url!);
    bad(url!, `SSRF — this should never have connected (${why})`);
  } catch (error) {
    error instanceof UnsafeUrlError
      ? ok(`blocked ${url} (${why})`)
      : bad(url!, `blocked, but with the wrong error: ${(error as Error).message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\nSSRF — DNS RESOLUTION (needs network)\n");
// ─────────────────────────────────────────────────────────────────────────────

// localhost.localdomain-style names that resolve to 127.0.0.1 are the classic
// bypass for a check that only looks at the literal string.
for (const host of ["http://localhost.localdomain/", "http://127.0.0.1.nip.io/"]) {
  try {
    await safeFetch(host);
    bad(host, "resolved into private space and was allowed");
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      ok(`blocked ${host}`);
    } else {
      skipped += 1;
      console.log(`  – skipped ${host} (no DNS)`);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("\nCHECKS\n");
// ─────────────────────────────────────────────────────────────────────────────

type CheckCase = { label: string; actual: string; expected: string };
const CHECK_CASES: CheckCase[] = [];

function expectVerdict(label: string, actual: string, expected: string) {
  CHECK_CASES.push({ label, actual, expected });
}

// — enquiry path —
expectVerdict(
  "form with email input → pass",
  checkEnquiryPath(`<form action="/send"><input type="email"></form>`).verdict,
  "pass"
);
expectVerdict(
  "search form only → not counted as an enquiry path",
  checkEnquiryPath(`<form role="search"><input type="text"></form>`).verdict,
  "fail"
);
expectVerdict(
  "mailto only → fail",
  checkEnquiryPath(`<a href="mailto:x@y.com">Email us</a>`).verdict,
  "fail"
);
expectVerdict("nothing → fail", checkEnquiryPath(`<p>hello</p>`).verdict, "fail");

// — mobile —
expectVerdict("no viewport → fail", checkMobileReady(`<head></head>`).verdict, "fail");
expectVerdict(
  "device-width → pass",
  checkMobileReady(`<meta name="viewport" content="width=device-width, initial-scale=1">`)
    .verdict,
  "pass"
);
expectVerdict(
  "zoom disabled → warn",
  checkMobileReady(
    `<meta name="viewport" content="width=device-width, user-scalable=no">`
  ).verdict,
  "warn"
);

// — https —
expectVerdict("https → pass", checkSecureConnection("https://x.com/").verdict, "pass");
expectVerdict("http → fail", checkSecureConnection("http://x.com/").verdict, "fail");

// — search listing —
expectVerdict(
  "no title, no description → fail",
  checkSearchListing(`<html><head></head></html>`).verdict,
  "fail"
);
expectVerdict(
  "generic title → warn",
  checkSearchListing(
    `<title>Home</title><meta name="description" content="We do things well.">`
  ).verdict,
  "warn"
);
expectVerdict(
  "both set → pass",
  checkSearchListing(
    `<title>Bennett Kitchens — Fitted Kitchens, Kingston</title><meta name="description" content="Fitted kitchens across Kingston since 1998.">`
  ).verdict,
  "pass"
);

// — freshness —
const year = new Date().getFullYear();
expectVerdict(
  "current year → pass",
  checkFreshness(`<footer>© ${year} Acme</footer>`, new Headers()).verdict,
  "pass"
);
expectVerdict(
  "last year → warn",
  checkFreshness(`<footer>© ${year - 1} Acme</footer>`, new Headers()).verdict,
  "warn"
);
expectVerdict(
  "four years ago → fail",
  checkFreshness(`<footer>© ${year - 4} Acme</footer>`, new Headers()).verdict,
  "fail"
);
expectVerdict(
  "no copyright line → unknown, never a guess",
  checkFreshness(`<footer>Acme</footer>`, new Headers()).verdict,
  "unknown"
);

for (const { label, actual, expected } of CHECK_CASES) {
  actual === expected ? ok(label) : bad(label, `expected "${expected}", got "${actual}"`);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log("");
if (failures > 0) {
  console.error(`FAILED — ${failures} case(s).\n`);
  process.exit(1);
}
console.log(`PASSED${skipped ? ` — ${skipped} skipped (no network)` : ""}.\n`);
