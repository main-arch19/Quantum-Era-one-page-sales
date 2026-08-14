"use client";

import { ENQUIRY_COPY } from "@/lib/content";
import { scrollToNextStep } from "@/lib/scroll-target";

/**
 * The only non-submit button on the page, and it does the only other permitted
 * thing: scroll to the site check. There is no second CTA type anywhere.
 *
 * A <button> rather than an <a href="#book"> deliberately — the link audit
 * treats every href as suspect, and this keeps the invariant absolute: there
 * are no hrefs in the document at all.
 */
export function ScrollToFormButton({ targetId }: { targetId: string }) {
  return (
    <button
      type="button"
      onClick={() => scrollToNextStep(targetId)}
      className="inline-block rounded-lg bg-electric px-8 py-4 font-display text-base font-bold tracking-[-0.01em] text-white transition-colors hover:bg-royal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric"
    >
      {ENQUIRY_COPY.button}
    </button>
  );
}
