"use client";

import { useEffect, useRef, useState } from "react";
import { HERO_FORM_COPY } from "@/lib/content";
import { trackScroll75 } from "@/lib/tracking";
import { scrollToNextStep } from "@/lib/scroll-target";

/**
 * Mobile sticky CTA, plus the scroll_75 engagement event. Both ride one
 * rAF-throttled passive scroll listener — 60%+ of Google Ads traffic is
 * mobile and a second listener is a second thing to jank.
 *
 * The bar appears after 40% scroll and scrolls to the final CTA form, which is
 * ahead of the visitor. Sending them back up to the hero form would be the
 * wrong direction.
 */
export function StickyBar({ targetId }: { targetId: string }) {
  const [visible, setVisible] = useState(false);
  const scroll75Fired = useRef(false);
  const ticking = useRef(false);

  useEffect(() => {
    function measure() {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const progress = window.scrollY / scrollable;

      setVisible(progress >= 0.4);

      if (!scroll75Fired.current && progress >= 0.75) {
        scroll75Fired.current = true;
        trackScroll75();
      }

      ticking.current = false;
    }

    function onScroll() {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(measure);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    measure();

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToForm() {
    scrollToNextStep(targetId);
  }

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 backdrop-blur-sm transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      // Hidden from assistive tech and keyboard order while off-screen.
      aria-hidden={!visible}
      // 4pt safe-area padding on notched devices.
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={scrollToForm}
        tabIndex={visible ? 0 : -1}
        className="w-full rounded-lg bg-electric px-6 py-3.5 font-display text-[0.9375rem] font-bold text-white transition-colors hover:bg-royal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric"
      >
        {HERO_FORM_COPY.button}
      </button>
    </div>
  );
}
