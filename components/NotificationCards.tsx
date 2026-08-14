"use client";

import { useEffect, useRef, useState } from "react";
import { NOTIFICATION_CARDS } from "@/lib/content";

/**
 * The signature element, and the only animation on the page.
 *
 * The hero shows the failed lookup alone — 11:47 PM, Signal Amber, sitting
 * inert. At the end of the mechanism section the same card is restated and the
 * answered card arrives beneath it, stamped the same minute. Seeing the
 * identical search at the identical minute twice, once dead and once answered,
 * IS the product demonstration. Nothing else on this page moves.
 */

/**
 * amber-ink, not amber, for the TEXT. #F5A524 on white measures 2.04:1 —
 * it failed WCAG at any size, and it was failing on the single line that
 * carries this page's argument, above the fold. #9A5B00 is 5.43:1 and is
 * the same hue. The swatch itself survives on the dot below.
 */
function Stamp({ time, tone }: { time: string; tone: "amber" | "electric" }) {
  return (
    <span
      className={`eyebrow ${tone === "amber" ? "text-amber-ink" : "text-electric"}`}
    >
      {time}
    </span>
  );
}

export function UnansweredCard({ className = "" }: { className?: string }) {
  const card = NOTIFICATION_CARDS.unanswered;

  return (
    <div
      className={`rounded-xl border border-line bg-white p-5 shadow-[0_1px_3px_rgba(5,6,28,0.06),0_18px_40px_-20px_rgba(5,6,28,0.25)] ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-ink/65">{card.source}</span>
        <Stamp time={card.stamp} tone="amber" />
      </div>

      {/* Mono, not display type. This is the string they typed into the search
          box — set as a headline it just reads as a broken sentence. */}
      <p className="mt-3 font-mono text-base leading-snug text-navy">
        {card.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink/70">{card.body}</p>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
        {/* The only place the Signal Amber swatch itself appears. It is the
            colour of the problem, and as a decorative dot beside its own
            label it carries no contrast requirement. */}
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber"
        />
        <span className="text-sm font-medium text-amber-ink">
          {card.status}
        </span>
      </div>
    </div>
  );
}

function AnsweredCard() {
  const card = NOTIFICATION_CARDS.answered;

  return (
    <div className="rounded-xl border border-electric/25 bg-white p-5 shadow-[0_1px_3px_rgba(5,6,28,0.06),0_18px_40px_-20px_rgba(14,20,240,0.35)]">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-ink/65">{card.source}</span>
        <Stamp time={card.stamp} tone="electric" />
      </div>

      <p className="mt-3 font-display text-base font-bold leading-snug text-navy">
        {card.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink/70">{card.body}</p>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-electric"
        />
        <span className="text-sm font-medium text-electric">
          {card.status}
        </span>
      </div>
    </div>
  );
}

/** The pair. Card B arrives when this scrolls into view. */
export function NotificationExchange() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // Reduced motion: render both immediately, no transition.
    if (prefersReducedMotion) {
      setAnimate(false);
      setRevealed(true);
      return;
    }

    const node = containerRef.current;
    if (!node) return;

    // No IntersectionObserver (very old browser): show it rather than hide it.
    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.25 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="mx-auto max-w-md space-y-3">
      <UnansweredCard />

      <div className="flex justify-center py-1">
        <span
          aria-hidden="true"
          className={`h-6 w-px bg-line transition-opacity duration-500 ${
            revealed ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>

      {/* Reserved height prevents layout shift when the card arrives. */}
      <div className={revealed ? "" : "invisible"}>
        <div className={revealed && animate ? "card-arrive" : ""}>
          <AnsweredCard />
        </div>
      </div>

      {/* This pair only ever sits on the navy mechanism band. */}
      <p className="pt-1 text-center text-sm text-white/70">
        {NOTIFICATION_CARDS.caption}
      </p>
    </div>
  );
}
