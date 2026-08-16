import { TRUST_BADGE } from "@/lib/content";

/**
 * The one guarantee on the page, stated where a visitor is deciding.
 *
 * It is not a "100% satisfaction guaranteed" seal, on purpose. A self-issued
 * badge asserting something unverifiable is discounted instantly by a buyer
 * spending thousands, and it would be the only unfalsifiable claim on a page
 * that has been careful not to make any. This states a promise the offer
 * section already makes — you keep the plan whether or not you hire us —
 * which costs the reader nothing to test and is true the moment they book.
 *
 * Inline SVG rather than an image file: no network request, no intrinsic
 * dimensions to get wrong, no CLS risk, and it inherits currentColor so the
 * dark variant needs no second asset.
 *
 * Renders on two very different backgrounds, so the palette is a prop rather
 * than an assumption. NO LINK — this is a statement, not a destination.
 */
export function TrustBadge({ tone = "light" }: { tone?: "light" | "dark" }) {
  const isDark = tone === "dark";

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-card border px-4 py-3 ${
        isDark ? "border-white/20 bg-white/5" : "border-line bg-white"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={`h-5 w-5 shrink-0 ${
          isDark ? "text-white/80" : "text-electric"
        }`}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* A shield with a check. Drawn rather than imported so it carries the
            same 1.75 stroke weight as the offer step icons. */}
        <path d="M12 2.75 4.75 5.5v6.1c0 4.2 2.9 7.6 7.25 9.65 4.35-2.05 7.25-5.45 7.25-9.65V5.5Z" />
        <path d="m9 11.9 2.1 2.1L15.2 10" />
      </svg>

      <span className="leading-tight">
        <span
          className={`block font-display text-sm font-bold ${
            isDark ? "text-white" : "text-navy"
          }`}
        >
          {TRUST_BADGE.headline}
        </span>
        <span
          className={`block text-sm ${isDark ? "text-white/70" : "text-ink/70"}`}
        >
          {TRUST_BADGE.sub}
        </span>
      </span>
    </div>
  );
}
