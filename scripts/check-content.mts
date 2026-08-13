/**
 * PREBUILD CONTENT GUARD
 *
 * Refuses to build while any placeholder in lib/content.ts still has brackets
 * in it. Google Ads prohibits unsubstantiated claims, and a page whose proof
 * section reads "[CLIENT NAME]" is both a disapproval risk and a worse page
 * than no page at all.
 *
 * WHY THIS IS A SEPARATE SCRIPT rather than a throw inside lib/content.ts:
 *
 * A module-scope throw fires while Next collects page data, so Next catches and
 * re-wraps it. The deploy then fails with
 *
 *     [Error: Failed to collect page data for /_not-found] { type: 'Error' }
 *
 * as its LAST line — which is what Vercel surfaces and what anyone reads first.
 * It names an unrelated route (/_not-found is just the first route that imports
 * the content file) and says nothing about the cause. The actual reason ends up
 * buried in a [cause] block far above.
 *
 * npm runs `prebuild` automatically before `build`, and Vercel runs
 * `npm run build`, so this fires on every deploy with no extra configuration.
 * Failing here means the reason is the first and last thing in the log, it
 * cannot be re-wrapped, and it costs milliseconds instead of a full compile.
 *
 * Imports the real unfilledPlaceholders() so the required-field list can never
 * drift from the content file itself.
 */

import {
  PLACEHOLDER_BUILD_ALLOWED,
  placeholderReport,
  unfilledPlaceholders,
} from "../lib/content.ts";

const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

/**
 * Identifying line, printed before any pass/fail branch.
 *
 * This exists because four rounds of debugging were lost to one unanswerable
 * question: WHICH COMMIT is the CI actually building? Vercel was replaying an
 * old deployment, so every fix pushed to main was invisible to it, and an
 * environment variable was being set for code that did not yet contain the
 * flag that reads it.
 *
 * One line settles it. And because this line only exists from this commit
 * onward, its ABSENCE from a build log is itself proof that something older is
 * being built.
 */
const sha = (
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  "local"
).slice(0, 7);

console.log(
  `${DIM}content check · commit ${sha} · ALLOW_PLACEHOLDER_BUILD=${
    process.env.ALLOW_PLACEHOLDER_BUILD ?? "unset"
  } · VERCEL_ENV=${process.env.VERCEL_ENV ?? "none"}${RESET}`
);

const unfilled = unfilledPlaceholders();

if (unfilled.length === 0) {
  console.log("✓ content check: all placeholders filled");
  process.exit(0);
}

const report = placeholderReport(unfilled);

if (PLACEHOLDER_BUILD_ALLOWED) {
  console.warn(
    `${YELLOW}⚠ BUILDING WITH PLACEHOLDERS — ALLOW_PLACEHOLDER_BUILD=1${report}` +
      `This build is for preview or staging only. The page will render a visible\n` +
      `"placeholders unfilled" banner. Do NOT point paid traffic at it.${RESET}\n`
  );
  process.exit(0);
}

console.error(`${RED}BUILD BLOCKED —${report}${RESET}`);
console.error(
  `${RED}Fill them in lib/content.ts, or — for a preview or staging deploy only,\n` +
    `never for paid traffic — set ALLOW_PLACEHOLDER_BUILD=1 in the build\n` +
    `environment. On Vercel: Settings → Environment Variables, then deploy the\n` +
    `LATEST commit (Redeploy re-runs that deployment's old commit).${RESET}\n`
);
process.exit(1);
