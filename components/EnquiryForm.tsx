"use client";

import { useActionState, useState } from "react";
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

  // Stamped at render. The server rejects anything submitted within 3s of it.
  const [renderedAt] = useState(() => Date.now());

  return (
    <form
      id={formId}
      action={formAction}
      noValidate
      className="rounded-xl border border-line bg-white p-5 sm:p-6"
    >
      <h3 className="display-sm text-lg text-navy sm:text-xl">
        {ENQUIRY_COPY.heading}
      </h3>
      <p className="mt-1.5 text-[0.9375rem] text-ink/70">
        {ENQUIRY_COPY.subheading}
      </p>

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
            className: `mt-1.5 w-full rounded-lg border bg-white px-3.5 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-navy ${
              error ? "border-amber" : "border-line"
            }`,
          };

          return (
            <div key={name}>
              <label
                htmlFor={inputId}
                className="block text-sm font-medium text-navy"
              >
                {field.label}
                {!field.required && (
                  <span className="ml-1.5 font-normal text-ink/45">
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
                  className="mt-1.5 text-sm text-[#9a5b00]"
                >
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Honeypot formId={formId} />
      <input type="hidden" name="rendered_at" value={renderedAt} />
      {Object.entries(tracking).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}

      {state.formError && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-amber bg-amber/10 px-3.5 py-3 text-sm text-[#9a5b00]"
        >
          {state.formError}
        </p>
      )}

      <div className="mt-5">
        <SubmitButton />
      </div>

      <p className="mt-3 text-center text-[0.8125rem] text-ink/55">
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
      className="w-full rounded-lg bg-electric px-6 py-4 font-display text-base font-bold tracking-[-0.01em] text-white transition-colors hover:bg-royal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric disabled:cursor-not-allowed disabled:opacity-70"
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
    case "email":
      if (!trimmed) return "We need an email address to reply to.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return "That email address is missing something — check for a typo around the @ sign.";
      }
      return undefined;
    case "phone":
      // Optional. Only complain about length, never about absence.
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
