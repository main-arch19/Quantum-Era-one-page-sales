"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "qes_exit_offer_seen";

/**
 * Minimum time on page before the offer may fire.
 *
 * Two jobs. On desktop it stops the modal ambushing somebody who has not read
 * a word — the cursor crosses the top edge constantly in the first seconds
 * while people reach for a tab or the address bar. On mobile it absorbs the
 * scroll jitter that browser chrome causes as it collapses on first scroll,
 * which otherwise reads as a fast upward flick.
 */
const MIN_DWELL_MS = 8000;

/** Mobile: how far down the page before leaving is a real signal, not a bounce. */
const MIN_DEPTH_RATIO = 0.25;

/**
 * Mobile: the flick, measured as DISTANCE OVER A WINDOW rather than
 * per-event velocity.
 *
 * There is no mouseout on a touch screen, so the closest available proxy is a
 * hard flick back toward the top — the gesture that precedes reaching for the
 * back button. A gentle scroll up to re-read something must not trigger.
 *
 * Per-event velocity was tried first and does not work. Scroll events are
 * asynchronous and coalesced: a hard flick arrives as a long run of small
 * deltas, while momentum settling after a jump produces one large spike. Under
 * emulation that inverted the two — a slow scroll peaked at 54px/frame and a
 * fast flick at 9 — so the gate fired on exactly the gesture it was meant to
 * ignore.
 *
 * Total upward travel inside a short window is what a flick actually is, and
 * it survives coalescing because the deltas sum either way.
 *
 * The two numbers are set from measurement, not taste. A deliberate slow
 * re-read accumulates nothing — every pause reverses or stalls the run, which
 * resets the window — while a sustained flick clears 160px well inside 600ms.
 * Widening the window costs nothing because a reset still ends the run the
 * moment the visitor stops going up.
 */
const FLICK_WINDOW_MS = 600;
const FLICK_DISTANCE = 160;

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Private mode or disabled storage. Fall through and allow one fire —
    // without storage the worst case is the offer reappearing on a later
    // navigation, which is better than it never showing at all.
    return false;
  }
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Non-fatal.
  }
}

/**
 * True once, when the visitor looks like they are leaving.
 *
 * Once per session, deliberately. An offer that reappears every time the
 * cursor nears the top is not persuasion, it is harassment, and it makes the
 * page feel like the kind of site this one is arguing against.
 */
export function useExitIntent(): boolean {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (alreadySeen()) return;

    const mountedAt = Date.now();
    let lastY = window.scrollY;
    let done = false;

    /**
     * High-water mark, not the current position.
     *
     * The depth gate has to describe how far they GOT, not where they are when
     * the flick ends — the flick itself carries them back toward the top, so
     * reading current depth at fire time would fail the gate precisely when
     * the gesture succeeded.
     */
    let deepestRatio = 0;

    // Start of the current upward run — the window the flick is measured over.
    let windowStartedAt = mountedAt;
    let windowStartY = lastY;

    function fire() {
      if (done) return;
      if (Date.now() - mountedAt < MIN_DWELL_MS) return;

      // Never stack on top of another dialog. The legal modals are the reason
      // this check exists: a visitor reading the privacy policy — which Google
      // Ads requires be reachable — must not have it buried under an offer.
      if (document.querySelector("dialog[open]")) return;

      // They already converted. The submit navigates away, but a slow network
      // leaves the page on screen in the meantime, and an offer that appears
      // over a form somebody just submitted is pure damage.
      if (document.querySelector("form[data-submitting='true']")) return;

      done = true;
      markSeen();
      setTriggered(true);
    }

    /**
     * Desktop. `clientY <= 0` means the pointer crossed the TOP edge — toward
     * the tab strip, the back button and the address bar. Leaving by the sides
     * or the bottom is not intent to go, it is a second monitor.
     *
     * The relatedTarget check rejects mouseouts fired when the pointer moves
     * between elements inside the page; only a genuine exit to the browser
     * chrome has no related target.
     */
    function onMouseOut(event: MouseEvent) {
      if (event.clientY > 0) return;
      if (event.relatedTarget) return;
      fire();
    }

    function onScroll() {
      const now = Date.now();
      const y = window.scrollY;

      const scrollable = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      );
      deepestRatio = Math.max(deepestRatio, y / scrollable);

      // Restart the window whenever travel stalls or reverses downward. Only a
      // sustained upward run counts; scrolling up a little, pausing to read,
      // then up a little more never accumulates into a flick.
      const goingUp = y < lastY;
      if (!goingUp || now - windowStartedAt > FLICK_WINDOW_MS) {
        windowStartedAt = now;
        windowStartY = y;
      }

      lastY = y;

      const travelled = windowStartY - y;
      if (travelled >= FLICK_DISTANCE && deepestRatio >= MIN_DEPTH_RATIO) fire();
    }

    // A coarse pointer with no hover is a touch device: watch the scroll
    // gesture. Anything else has a real cursor: watch the viewport edge.
    //
    // One or the other, never both. A touchscreen laptop reports a fine
    // pointer and so takes the mouseout path, which is the correct one for
    // it — the flick heuristic exists only because touch has no mouseout.
    const touch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

    if (!touch) document.addEventListener("mouseout", onMouseOut);
    if (touch) window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return triggered;
}
