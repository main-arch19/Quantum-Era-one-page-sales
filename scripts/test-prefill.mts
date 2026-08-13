#!/usr/bin/env node
/**
 * COMPANY PREFILL TEST
 *
 * The company field is prefilled from the domain the visitor typed. A field
 * that is already correct reads as competence; a field that is confidently
 * wrong reads as the opposite, so this is worth a test rather than a glance.
 *
 *   npm run test:prefill
 *
 * Node runs the TypeScript directly — no build step, no test framework.
 */

import { companyFromDomain } from "../lib/company-from-domain.ts";

type Case = { input: string; expect: string; why?: string };

const CASES: Case[] = [
  // ── The ordinary cases ────────────────────────────────────────────────────
  { input: "acme-plumbing.co.uk", expect: "Acme Plumbing", why: "hyphens + multi-part suffix" },
  { input: "www.bennett-kitchens.com", expect: "Bennett Kitchens", why: "www stripped" },
  { input: "smiths.io", expect: "Smiths", why: "short TLD" },
  { input: "a-b-c.com.au", expect: "A B C", why: "multi-part suffix, short tokens" },
  { input: "https://shop.acme.com/contact", expect: "Acme", why: "path and subdomain ignored" },
  { input: "https://www.acme-roofing.co.uk/x?y=1", expect: "Acme Roofing", why: "query ignored" },

  // ── The dictionary split. This is the part the brief got wrong. ───────────
  { input: "acmeplumbing.com", expect: "Acme Plumbing", why: "trailing trade word split" },
  { input: "bennettkitchens.com", expect: "Bennett Kitchens", why: "trailing trade word split" },
  { input: "norbrookdental.com.jm", expect: "Norbrook Dental", why: "split + multi-part suffix" },
  { input: "quantumerasolutions.com", expect: "Quantumera Solutions", why: "split" },

  // ── Cases where a split would be WRONG and must not happen ────────────────
  { input: "outlaw.com", expect: "Outlaw", why: "3-char head is a coincidence, not a name" },
  { input: "coleslaw.com", expect: "Coleslaw", why: "why 'law' is not in the list at all" },
  { input: "cheating.com", expect: "Cheating", why: "'heating' is a suffix; 1-char head must not split" },
  { input: "solutions.com", expect: "Solutions", why: "the word alone is not a split" },
  { input: "abcplumbing.com", expect: "Abcplumbing", why: "3-char head: unsplit beats wrongly split" },

  // ── Degenerate input: an empty field beats a wrong one ────────────────────
  { input: "192.168.1.1", expect: "", why: "all-digit label" },
  { input: "xn--80ak6aa92e.com", expect: "", why: "punycode is not a name" },
  { input: "", expect: "", why: "nothing in, nothing out" },
];

let failures = 0;

console.log("COMPANY PREFILL\n");

for (const { input, expect, why } of CASES) {
  const actual = companyFromDomain(input);
  const ok = actual === expect;
  if (!ok) failures += 1;

  const mark = ok ? "✓" : "✗";
  const shown = input === "" ? "(empty)" : input;
  console.log(`  ${mark} ${shown.padEnd(40)} → ${JSON.stringify(actual)}`);
  if (!ok) {
    console.error(`      expected ${JSON.stringify(expect)}${why ? ` — ${why}` : ""}`);
  }
}

console.log("");
if (failures > 0) {
  console.error(`FAILED — ${failures} of ${CASES.length} case(s).\n`);
  process.exit(1);
}
console.log(`PASSED — ${CASES.length} case(s).\n`);
