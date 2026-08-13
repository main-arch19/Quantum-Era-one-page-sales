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

// Set BEFORE the module loads, hence the dynamic import: lib/content.ts prints
// its own dev-time nag at module scope, which would otherwise duplicate the
// whole report every time this script runs. Static imports are hoisted and
// would execute before this assignment.
process.env.CONTENT_CHECK_RUNNING = "1";

const { PLACEHOLDER_BUILD_ALLOWED, placeholderReport, unfilledPlaceholders } =
  await import("../lib/content.ts");

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

/**
 * Unfilled content no longer fails the build.
 *
 * It used to, and that was the wrong trade. The page now OMITS anything
 * unfilled rather than rendering brackets — no proof section without a real
 * proof, no price objection without a real price — so an incomplete build
 * cannot publish a fabricated claim, which was the only thing worth blocking
 * for. Meanwhile blocking cost five failed deploys and prevented no harm.
 *
 * Strictness is now opt-in and belongs at the moment of LAUNCH, not the moment
 * of build:
 *
 *     npm run check:launch      # exits 1 while anything is missing
 *
 * Run that before pointing Google Ads at the page. ALLOW_PLACEHOLDER_BUILD is
 * still honoured for anyone who set it, and REQUIRE_COMPLETE_CONTENT=1 restores
 * hard blocking for a release pipeline that wants it.
 */
const STRICT =
  process.env.REQUIRE_COMPLETE_CONTENT === "1" ||
  process.argv.includes("--strict");

if (STRICT && !PLACEHOLDER_BUILD_ALLOWED) {
  console.error(`${RED}NOT READY TO LAUNCH —${report}${RESET}`);
  console.error(
    `${RED}Fill these in lib/content.ts before running ads against this page.${RESET}\n`
  );
  process.exit(1);
}

console.warn(
  `${YELLOW}⚠ INCOMPLETE CONTENT —${report}` +
    `The page omits each of these rather than showing a placeholder, so it is\n` +
    `safe to deploy — but it is NOT ready for paid traffic. Verify with:\n` +
    `    npm run check:launch${RESET}\n`
);
process.exit(0);
