"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitDiscountClaim } from "@/app/actions";
import { Honeypot, validate } from "@/components/EnquiryForm";
import {
  EMPTY_DISCOUNT_STATE,
  type DiscountFieldName,
} from "@/lib/discount-state";
import { DISCOUNT_COPY, DISCOUNT_FIELDS, DISCOUNT_TERMS } from "@/lib/discount";
import { trackDiscountClaim, trackExitOfferShown } from "@/lib/tracking";
import { useTrackingParams } from "@/lib/use-tracking-params";

const FORM_ID = "discount-claim";

/**
 * The exit offer, in a native <dialog>.
 *
 * Structure is lifted from LegalModals rather than reinvented: showModal()
 * gives focus trapping, Esc-to-close, an inert background and correct
 * screen-reader semantics without a line of trap logic. The fields are
 * rendered with the same markup as EnquiryForm, and the blur validator is
 * literally the same function — three fields here are a subset of the five
 * there, and a second copy would drift.
 */
export function DiscountModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const renderedAtRef = useRef<HTMLInputElement>(null);

  const [state, formAction] = useActionState(
    submitDiscountClaim,
    EMPTY_DISCOUNT_STATE
  );
  const tracking = useTrackingParams();

  const [blurErrors, setBlurErrors] = useState<
    Partial<Record<DiscountFieldName, string>>
  >({});

  const errors: Partial<Record<DiscountFieldName, string>> = {
    ...blurErrors,
    ...(state.fieldErrors ?? {}),
  };

  // Open on mount. The hook that renders this component has already decided
  // the visitor is leaving; there is nothing further to wait for.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    dialog.showModal();
    trackExitOfferShown();
  }, []);

  /**
   * Background scroll lock, in its OWN effect.
   *
   * Not folded into the open effect above, and the separation is load-bearing.
   * That effect guards on `dialog.open` so it cannot call showModal twice — so
   * under StrictMode's deliberate mount/unmount/remount, its second pass
   * early-returns while the FIRST pass's cleanup has already run. Anything
   * cleaned up there stays cleaned up, and the lock silently never applies.
   *
   * With one concern per effect the pair balances no matter how many times
   * React re-runs them: this one always re-applies what its own cleanup
   * removed. LegalModals does not hit this because its effect depends on an
   * `open` prop and re-runs with it.
   */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Same reasoning as EnquiryForm: stamped after mount, never during render,
  // so the server emits an empty field and the browser fills it once the form
  // is really on screen. That is the number the 3-second bot check wants.
  useEffect(() => {
    if (renderedAtRef.current) {
      renderedAtRef.current.value = String(Date.now());
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-labelledby={`${FORM_ID}-title`}
      className="m-auto max-h-[85vh] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-card border border-line bg-white p-0 text-ink backdrop:bg-ink-deep/55"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6 sm:py-5">
        <div>
          <p className="eyebrow text-electric/70">{DISCOUNT_COPY.eyebrow}</p>
          <h2
            id={`${FORM_ID}-title`}
            className="display-sm mt-1 text-lead text-navy"
          >
            {DISCOUNT_COPY.heading}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={DISCOUNT_COPY.closeLabel}
          className="shrink-0 rounded-control p-3 text-ink/65 transition-colors hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
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

      <form
        ref={formRef}
        id={FORM_ID}
        action={formAction}
        noValidate
        // Read by the exit-intent hook, which must never raise this modal over
        // a form that is already on its way to the server.
        onSubmit={() => {
          formRef.current?.setAttribute("data-submitting", "true");
          trackDiscountClaim();
        }}
        className="px-5 py-5 sm:px-6"
      >
        <p className="text-base text-ink/75">{DISCOUNT_COPY.body}</p>

        <div className="mt-5 space-y-4">
          {DISCOUNT_FIELDS.map((field) => {
            const name = field.name as DiscountFieldName;
            const error = errors[name];
            const errorId = `${FORM_ID}-${name}-error`;
            const inputId = `${FORM_ID}-${name}`;

            const shared = {
              id: inputId,
              name,
              autoComplete: field.autoComplete,
              placeholder: field.placeholder,
              "aria-invalid": error ? true : undefined,
              "aria-describedby": error ? errorId : undefined,
              onBlur: (
                event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
              ) => {
                setBlurErrors((prev) => ({
                  ...prev,
                  [name]: validate(name, event.target.value),
                }));
              },
              className: `mt-2 w-full rounded-control border bg-white px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-electric ${
                error ? "border-amber" : "border-field"
              }`,
            };

            return (
              <div key={name}>
                <label
                  htmlFor={inputId}
                  className="block text-sm font-bold text-navy"
                >
                  {field.label}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    {...shared}
                    rows={3}
                    className={`${shared.className} resize-y`}
                  />
                ) : (
                  <input {...shared} type={field.type} />
                )}

                {error && (
                  <p
                    id={errorId}
                    role="alert"
                    className="mt-2 text-sm text-amber-ink"
                  >
                    {error}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <Honeypot formId={FORM_ID} />
        <input
          type="hidden"
          name="rendered_at"
          ref={renderedAtRef}
          defaultValue=""
        />
        {Object.entries(tracking).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}

        {state.formError && (
          <p
            role="alert"
            className="mt-4 rounded-control border border-amber bg-amber/10 px-4 py-3 text-sm text-amber-ink"
          >
            {state.formError}
          </p>
        )}

        <div className="mt-5">
          <SubmitButton />
        </div>

        {/* The dismiss says what it costs. A page arguing for straight
            dealing cannot bury its own decline behind a coy label. */}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-control px-4 py-3 text-sm text-ink/65 transition-colors hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          {DISCOUNT_COPY.dismiss}
        </button>

        <p className="mt-3 text-sm text-ink/65">{DISCOUNT_TERMS}</p>
        <p className="mt-2 text-sm text-ink/65">{DISCOUNT_COPY.consent}</p>
      </form>
    </dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-control bg-electric px-6 py-4 font-display text-base font-bold tracking-[-0.01em] text-white transition-colors hover:bg-royal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? DISCOUNT_COPY.sending : DISCOUNT_COPY.button}
    </button>
  );
}
