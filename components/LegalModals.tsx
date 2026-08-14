"use client";

import { useEffect, useRef, useState } from "react";
import { PRIVACY_POLICY, TERMS, type LegalDocument } from "@/lib/legal";

/**
 * Privacy and Terms open in a modal ON THIS PAGE — never a new page, never a
 * new tab. This is the only permitted exception to the no-links rule, and it
 * exists because Google Ads disapproves lead-gen pages without an accessible
 * privacy policy.
 *
 * Native <dialog> gives focus trapping, Esc-to-close, inert background and
 * correct screen-reader semantics without a line of trap logic.
 */

function LegalDialog({
  doc,
  open,
  onClose,
}: {
  doc: LegalDocument;
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      // Lock background scroll while the modal owns the screen.
      document.body.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      // Click the backdrop to dismiss.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby={`${doc.id}-title`}
      className="m-auto max-h-[85vh] w-[min(46rem,calc(100vw-2rem))] rounded-xl border border-line bg-white p-0 text-ink backdrop:bg-ink-deep/55"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
        <div>
          <h2
            id={`${doc.id}-title`}
            className="display-sm text-lead text-navy"
          >
            {doc.title}
          </h2>
          <p className="eyebrow mt-1 text-ink/60">Updated {doc.updated}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${doc.title}`}
          className="shrink-0 rounded-lg p-3 text-ink/65 transition-colors hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
        {doc.sections.map((section) => (
          <section key={section.heading} className="mb-6 last:mb-0">
            <h3 className="font-display text-base font-bold text-navy">
              {section.heading}
            </h3>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className="mt-2 text-base text-ink/75">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </dialog>
  );
}

export function LegalModals() {
  const [openDoc, setOpenDoc] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenDoc(PRIVACY_POLICY.id)}
        className="-my-3 inline-flex min-w-11 justify-center py-3 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
      >
        <span className="underline underline-offset-4">{PRIVACY_POLICY.title}</span>
      </button>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        onClick={() => setOpenDoc(TERMS.id)}
        className="-my-3 inline-flex min-w-11 justify-center py-3 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60"
      >
        <span className="underline underline-offset-4">{TERMS.title}</span>
      </button>

      <LegalDialog
        doc={PRIVACY_POLICY}
        open={openDoc === PRIVACY_POLICY.id}
        onClose={() => setOpenDoc(null)}
      />
      <LegalDialog
        doc={TERMS}
        open={openDoc === TERMS.id}
        onClose={() => setOpenDoc(null)}
      />
    </>
  );
}
