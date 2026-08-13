"use client";

import { useEffect, useState } from "react";
import type { Finding, Verdict } from "@/lib/audit/types";
import { AUDIT_COPY, GATE_COPY } from "@/lib/content";

/**
 * The audit readout.
 *
 * Set as a terminal because that is what it is — a machine reporting what it
 * measured, in a fixed-width column, with no adjectives. The register matters
 * commercially: the same finding delivered in marketing type reads as a sales
 * pitch, and delivered in mono reads as a diagnostic. We want the second one,
 * because the entire argument of the page is that we measure things the owner
 * has never measured.
 *
 * Lines reveal one at a time. The work is already done by the time this
 * renders — every check ran server-side before the response came back — so
 * the stagger is presentation, not theatre pretending to be computation. It
 * exists so the eye can take one finding at a time instead of meeting a block
 * of seven. Under prefers-reduced-motion everything is present immediately.
 */

const STAGGER_MS = 260;

const VERDICT_STYLES: Record<Verdict, { mark: string; className: string; label: string }> = {
  // Amber is permitted here and in exactly one other place. See globals.css —
  // it is the colour of an enquiry that went nowhere, not a generic warning.
  fail: { mark: "✗", className: "text-amber", label: "Problem" },
  warn: { mark: "!", className: "text-amber/80", label: "Costing you" },
  pass: { mark: "✓", className: "text-electric", label: "Fine" },
  unknown: { mark: "–", className: "text-ink/40", label: "Not determined" },
};

function FindingLine({
  finding,
  visible,
  animate,
}: {
  finding: Finding;
  visible: boolean;
  animate: boolean;
}) {
  const style = VERDICT_STYLES[finding.verdict];

  return (
    <li
      className={`border-t border-line/70 py-3.5 first:border-t-0 ${
        visible ? "" : "invisible"
      } ${visible && animate ? "card-arrive" : ""}`}
    >
      <div className="flex items-baseline gap-3">
        <span
          aria-hidden="true"
          className={`font-mono text-sm font-medium ${style.className}`}
        >
          {style.mark}
        </span>

        <span className="font-mono text-[0.8125rem] uppercase tracking-[0.1em] text-ink/50">
          {finding.label}
        </span>

        <span className="ml-auto font-mono text-[0.8125rem] font-medium tabular-nums text-navy">
          {finding.value}
        </span>
      </div>

      <p className="mt-1.5 pl-[1.6rem] text-[0.9375rem] leading-relaxed text-ink/75">
        {/* Screen readers get the verdict as a word, not as a glyph. */}
        <span className="sr-only">{style.label}: </span>
        {finding.detail}
      </p>
    </li>
  );
}

/** The blurred rows standing in for checks that have not been unlocked. */
function LockedLine({ index }: { index: number }) {
  // Varied widths so the block reads as withheld content rather than a bar chart.
  const widths = ["68%", "84%", "55%", "76%", "62%"];

  return (
    <li className="border-t border-line/70 py-3.5" aria-hidden="true">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-sm text-ink/25">·</span>
        <span className="h-2.5 w-24 rounded-full bg-ink/10" />
        <span className="ml-auto font-mono text-[0.8125rem] uppercase tracking-[0.1em] text-ink/30">
          {GATE_COPY.lockedLabel}
        </span>
      </div>
      <div className="mt-2.5 pl-[1.6rem]">
        <span
          className="block h-2.5 rounded-full bg-ink/[0.07]"
          style={{ width: widths[index % widths.length] }}
        />
      </div>
    </li>
  );
}

export function AuditReadout({
  finalUrl,
  findings,
  lockedCount,
  children,
}: {
  finalUrl: string;
  findings: Finding[];
  /** Rows to render as withheld. Zero once the gate has been passed. */
  lockedCount: number;
  /** The email gate, rendered inside the readout's frame. */
  children?: React.ReactNode;
}) {
  const [revealed, setRevealed] = useState(0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      setAnimate(false);
      setRevealed(findings.length);
      return;
    }

    // Clamp rather than reset, so a findings list that grows in place animates
    // only the new rows instead of replaying the whole thing.
    setRevealed((current) => Math.min(current, findings.length));

    const timers: number[] = [];
    for (let index = 0; index < findings.length; index += 1) {
      timers.push(
        window.setTimeout(
          () => setRevealed((current) => Math.max(current, index + 1)),
          index * STAGGER_MS
        )
      );
    }

    return () => timers.forEach(window.clearTimeout);
  }, [findings]);

  const allRevealed = revealed >= findings.length;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_3px_rgba(5,6,28,0.06),0_18px_40px_-24px_rgba(5,6,28,0.25)]">
      {/* Terminal chrome. The address bar is the thing they typed, echoed back. */}
      <div className="flex items-center gap-3 border-b border-line bg-paper px-5 py-3">
        <span className="eyebrow text-electric/70">{AUDIT_COPY.heading}</span>
        <span className="ml-auto max-w-[55%] truncate font-mono text-[0.8125rem] text-ink/50">
          {finalUrl}
        </span>
      </div>

      <ul className="px-5 py-1">
        {findings.map((finding, index) => (
          <FindingLine
            key={finding.id}
            finding={finding}
            visible={index < revealed}
            animate={animate}
          />
        ))}

        {/* Locked rows appear only once the free findings have finished, so the
            reveal does not race the thing that is meant to interrupt it. */}
        {allRevealed &&
          Array.from({ length: lockedCount }, (_, index) => (
            <LockedLine key={`locked-${index}`} index={index} />
          ))}
      </ul>

      {/* Live region: the readout is the page's main state change and a screen
          reader user gets no stagger, so announce completion once. */}
      <p className="sr-only" role="status">
        {allRevealed
          ? `${findings.length} checks complete.${
              lockedCount ? ` ${lockedCount} further checks available in the full report.` : ""
            }`
          : AUDIT_COPY.scanning}
      </p>

      {allRevealed && children ? (
        <div className="border-t border-line bg-paper px-5 py-6 sm:px-6">
          {children}
        </div>
      ) : null}

      <p className="border-t border-line px-5 py-3 text-[0.8125rem] leading-relaxed text-ink/45">
        {AUDIT_COPY.disclaimer}
      </p>
    </div>
  );
}
