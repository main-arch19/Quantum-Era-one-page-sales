"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitEnquiry } from "@/app/actions";
import { EMPTY_ENQUIRY_STATE, type EnquiryFieldName } from "@/lib/form-state";
import { ENQUIRY_COPY, ENQUIRY_FIELDS } from "@/lib/content";
import { useTrackingParams } from "@/lib/use-tracking-params";

/**
 * The only client JS above the fold, by design.
 *
 * Rendered twice — hero and final CTA — from this one component, so the two
 * can never drift apart. Give each instance its own formId: the ids below are
 * derived from it, and duplicate ids would break every label association on
 * the page.
 */
export function EnquiryForm({ formId }: { formId: string }) {
  const [state, formAction] = useActionState(submitEnquiry, EMPTY_ENQUIRY_STATE);
  const tracking = useTrackingParams();

  // Blur errors are held separately from server errors so a server response
  // never gets wiped by a later blur, and vice versa.
  const [blurErrors, setBlurErrors] = useState<
    Partial<Record<EnquiryFieldName, string>>
  >({});

  const errors: Partial<Record<EnquiryFieldName, string>> = {
    ...blurErrors,
    ...(state.fieldErrors ?? {}),
  };

  /**
   * Stamped after mount, never during render.
   *
   * This used to be `useState(() => Date.now())`, which runs once on the
   * server and again on the client and cannot agree: the prerendered HTML
   * carried a build-time timestamp and hydration replaced it with a different
   * one, throwing a mismatch warning on every single page load. The value was
   * also wrong on its own terms — on a statically prerendered page it measured
   * time since the BUILD, so the 3-second bot check had been dead since the
   * first deploy. Every submission passed it.
   *
   * A ref plus an effect keeps it out of the render pass entirely, so the
   * server emits an empty field and the browser fills it the moment the form
   * is really on screen. That is the number the timing check actually wants.
   */
  const renderedAtRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renderedAtRef.current) {
      renderedAtRef.current.value = String(Date.now());
    }
  }, []);

  return (
    <form
      id={formId}
      action={formAction}
      noValidate
      className="rounded-card border border-line bg-white p-5 shadow-card sm:p-6"
    >
      <h3 className="display-sm text-lead text-navy">{ENQUIRY_COPY.heading}</h3>
      <p className="mt-2 text-sm text-ink/70">{ENQUIRY_COPY.subheading}</p>

      <div className="mt-5 space-y-4">
        {ENQUIRY_FIELDS.map((field) => {
          const name = field.name as EnquiryFieldName;
          const error = errors[name];
          const errorId = `${formId}-${name}-error`;
          const inputId = `${formId}-${name}`;

          const shared = {
            id: inputId,
            name,
            autoComplete: field.autoComplete,
            placeholder: field.placeholder,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": error ? errorId : undefined,
            // Validation on blur, never on keystroke. Correcting someone
            // mid-word is the fastest way to make them abandon a form.
            onBlur: (
              event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
            ) => {
              setBlurErrors((prev) => ({
                ...prev,
                [name]: validate(name, event.target.value),
              }));
            },
            // The focus ring matches every button on the page: 2px Electric at
            // 2px offset. A 1px border colour change was the weakest focus
            // indicator here and the only one that was not visible at a glance.
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
                {!field.required && (
                  <span className="ml-2 font-normal text-ink/60">
                    (optional)
                  </span>
                )}
              </label>

              {field.type === "textarea" ? (
                <textarea {...shared} rows={4} className={`${shared.className} resize-y`} />
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

      <Honeypot formId={formId} />
      <input type="hidden" name="rendered_at" ref={renderedAtRef} defaultValue="" />
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

      <p className="mt-3 text-center text-sm text-ink/65">
        {ENQUIRY_COPY.consent}
      </p>
    </form>
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
      {pending ? ENQUIRY_COPY.sending : ENQUIRY_COPY.button}
    </button>
  );
}

/**
 * Client-side mirror of the server rules. The server is the authority — this
 * only exists so the correction arrives on blur instead of after a round trip.
 */
function validate(name: EnquiryFieldName, value: string): string | undefined {
  const trimmed = value.trim();

  switch (name) {
    case "name":
      if (!trimmed) return "Please add your name so we know who we are talking to.";
      return undefined;
    case "company":
      // Optional. Only the length ceiling is enforced, and it mirrors the
      // server schema exactly — a client validator that is stricter than the
      // server rejects input the server would have accepted, and one that is
      // looser costs a filled-in form at submit.
      if (trimmed.length > 100) {
        return "That is longer than we can store — please shorten it.";
      }
      return undefined;
    case "email":
      if (!trimmed) return "We need an email address to reply to.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return "That email address is missing something — check for a typo around the @ sign.";
      }
      return undefined;
    case "phone":
      if (!trimmed) return "We need a number we can reach you on.";
      // Deliberately no format check. Jamaican, US and UK numbers all reach
      // this form, and a regex that rejects a real number the visitor typed
      // correctly costs more than a badly formatted one ever does.
      if (trimmed.length > 40) {
        return "That number is longer than we can store — digits only is fine.";
      }
      return undefined;
    case "description":
      if (trimmed.length < 15) {
        return "A little more detail, please — a sentence or two about what you want the site to do.";
      }
      return undefined;
  }
}

/** Hidden from people, irresistible to bots. */
function Honeypot({ formId }: { formId: string }) {
  return (
    <div
      aria-hidden="true"
      className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
    >
      <label htmlFor={`${formId}-company_website`}>
        Company website — leave this blank
      </label>
      <input
        id={`${formId}-company_website`}
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
      />
    </div>
  );
}
