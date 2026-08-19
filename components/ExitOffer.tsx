"use client";

import { useState } from "react";
import { DiscountModal } from "@/components/DiscountModal";
import { useExitIntent } from "@/lib/use-exit-intent";

/**
 * Mounts the exit offer and nothing else.
 *
 * Split from DiscountModal so the trigger and the thing it triggers can be
 * reasoned about separately — the hook decides WHEN, the modal decides WHAT,
 * and page.tsx mounts one component either way.
 *
 * The modal is not rendered until the moment it opens. That keeps a <dialog>
 * out of the DOM for every visitor who never abandons, which matters because
 * the exit hook itself checks for `dialog[open]` and because the legal modals
 * already occupy that space.
 */
export function ExitOffer() {
  const triggered = useExitIntent();
  const [dismissed, setDismissed] = useState(false);

  if (!triggered || dismissed) return null;

  // Unmounting on close is deliberate. The hook fires once per session, so
  // there is no second open to preserve state for, and leaving a closed
  // dialog mounted leaves its form in the tab order of a page it is no
  // longer part of.
  return <DiscountModal onClose={() => setDismissed(true)} />;
}
