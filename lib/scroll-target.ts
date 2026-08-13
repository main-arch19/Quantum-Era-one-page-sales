/**
 * Where the CTAs actually send people.
 *
 * The page renders the site check twice — once in the hero, once in the final
 * CTA — and the two are independent. That was harmless when both were empty
 * forms. It stops being harmless the moment one of them has results in it:
 * a visitor who has run the audit in the hero, and is looking at two real
 * findings and an email gate, must not be scrolled down to a second empty
 * URL field. That is scrolling them away from the conversion.
 *
 * So the CTAs ask the DOM what the live next step is. If an email gate is on
 * screen anywhere, that is the target. Otherwise it is the check at the bottom,
 * which is ahead of them and is the right destination for somebody who has not
 * started yet.
 *
 * querySelector returns the first match in document order, so a visitor who has
 * somehow run both checks is sent to the higher one — the one they saw first.
 */
export function scrollToNextStep(fallbackId: string): void {
  const gate = document.querySelector<HTMLElement>("[data-audit-gate]");
  const target = gate ?? document.getElementById(fallbackId);

  target?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Move focus as well as the viewport. A smooth scroll that leaves the
  // keyboard where it was is a scroll that never happened for anybody
  // navigating by tab.
  const field = target?.querySelector<HTMLElement>("input:not([tabindex='-1'])");
  if (field) {
    field.focus({ preventScroll: true });
  }
}
