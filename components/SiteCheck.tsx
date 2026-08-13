"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { runAuditAction, submitGate } from "@/app/actions";
import { AuditReadout } from "./AuditReadout";
import { companyFromDomain } from "@/lib/company-from-domain";
import { EMPTY_GATE_STATE, type GateFieldName, type GateFormState } from "@/lib/form-state";
import { AUDIT_COPY, GATE_COPY, HERO_FORM_COPY } from "@/lib/content";
import { useTrackingParams } from "@/lib/use-tracking-params";
import { trackAuditRun } from "@/lib/tracking";
import type { AuditResponse } from "@/lib/audit/types";

/**
 * The three-stage capture, stages 1 and 2.
 *
 * The whole design rests on one observation: a field costs a completely
 * different amount depending on where it sits. A project-description textarea
 * in front of somebody who has not yet decided we are worth anything is the
 * most expensive field on the internet. The same question asked after they
 * have watched us find something true about their own site is nearly free.
 *
 *   Stage 1  one field, the URL, no email          → two real findings
 *   Stage 2  name / email / company                → the full report
 *   Stage 3  Calendly custom questions, on /booked → the qualifying answer
 *
 * Stage 3 lives in CalendlyEmbed because by then the lead already exists and
 * everything after this component is a bonus rather than the conversion.
 */

function HiddenTracking({ params }: { params: Record<string, string> }) {
  return (
    <>
      {Object.entries(params).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
    </>
  );
}

/** Hidden from people, irresistible to bots. */
function Honeypot({ formId }: { formId: string }) {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
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

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 1 — one field.
// ─────────────────────────────────────────────────────────────────────────────

function CheckButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-electric px-6 py-4 font-display text-base font-bold tracking-[-0.01em] text-white transition-colors hover:bg-royal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? HERO_FORM_COPY.running : HERO_FORM_COPY.button}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAGE 2 — the gate.
// ─────────────────────────────────────────────────────────────────────────────

const GATE_FIELDS: {
  name: Exclude<GateFieldName, "url">;
  label: string;
  type: string;
  autoComplete: string;
  placeholder: string;
}[] = [
  { name: "name", label: "Full name", type: "text", autoComplete: "name", placeholder: "Marcia Bennett" },
  { name: "email", label: "Work email", type: "email", autoComplete: "email", placeholder: "you@yourbusiness.com" },
  { name: "company", label: "Company name", type: "text", autoComplete: "organization", placeholder: "Bennett Kitchens" },
];

const GATE_VALIDATORS: Record<
  Exclude<GateFieldName, "url">,
  (value: string) => string | undefined
> = {
  name: (value) =>
    value.trim() ? undefined : "Please add your name so we know who we are talking to.",
  email: (value) => {
    if (!value.trim()) return "We need an email address to send the report to.";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ? undefined
      : "That email address is missing something — check for a typo around the @ sign.";
  },
  company: (value) =>
    value.trim().length >= 2 ? undefined : "We need your company name — it goes on the report.",
};

function GateButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-electric px-6 py-4 font-display text-base font-bold tracking-[-0.01em] text-white transition-colors hover:bg-royal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-electric disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? GATE_COPY.sending : GATE_COPY.button}
    </button>
  );
}

function EmailGate({
  formId,
  websiteUrl,
  trackingParams,
}: {
  formId: string;
  websiteUrl: string;
  trackingParams: Record<string, string>;
}) {
  const [state, formAction] = useActionState<GateFormState, FormData>(
    submitGate,
    EMPTY_GATE_STATE
  );
  const [blurErrors, setBlurErrors] = useState<
    Partial<Record<GateFieldName, string>>
  >({});

  const renderedAt = useMemo(() => Date.now(), []);

  // CHANGE 3 — they already gave us the domain, so the company field arrives
  // filled in. Editable, because it is a guess: a prefilled field that is
  // already correct reads as attention paid, and one that is confidently wrong
  // reads as the opposite.
  const guessedCompany = useMemo(() => companyFromDomain(websiteUrl), [websiteUrl]);

  const errors: Partial<Record<GateFieldName, string>> = {
    ...blurErrors,
    ...state.fieldErrors,
  };

  return (
    // data-audit-gate marks this as the live next step. The two CTAs look for
    // it before falling back to the form at the bottom of the page — see
    // lib/scroll-target.ts. Without that, somebody who has just run the audit
    // in the hero gets scrolled PAST their own results to an empty check.
    <form id={formId} data-audit-gate action={formAction} noValidate>
      <h3 className="display-sm text-lg text-navy sm:text-xl">{GATE_COPY.heading}</h3>
      <p className="mt-1.5 text-[0.9375rem] text-ink/70">{GATE_COPY.subheading}</p>

      <div className="mt-5 space-y-4">
        {GATE_FIELDS.map((field) => {
          const error = errors[field.name];
          const errorId = `${formId}-${field.name}-error`;

          return (
            <div key={field.name}>
              <label
                htmlFor={`${formId}-${field.name}`}
                className="block text-sm font-medium text-navy"
              >
                {field.label}
              </label>
              <input
                id={`${formId}-${field.name}`}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                defaultValue={field.name === "company" ? guessedCompany : undefined}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                // Validation on blur, never on keystroke.
                onBlur={(event) => {
                  const message = GATE_VALIDATORS[field.name](event.target.value);
                  setBlurErrors((prev) => ({ ...prev, [field.name]: message }));
                }}
                className={`mt-1.5 w-full rounded-lg border bg-white px-3.5 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-navy ${
                  error ? "border-amber" : "border-line"
                }`}
              />
              {error && (
                <p id={errorId} role="alert" className="mt-1.5 text-sm text-[#9a5b00]">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Honeypot formId={formId} />
      <input type="hidden" name="rendered_at" value={renderedAt} />
      {/* Carried from stage 1. Re-validated and re-fetched server-side. */}
      <input type="hidden" name="url" value={websiteUrl} />
      <HiddenTracking params={trackingParams} />

      {state.formError && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-amber/50 bg-amber/10 px-4 py-3 text-sm text-[#9a5b00]"
        >
          {state.formError}
        </p>
      )}

      <div className="mt-5">
        <GateButton />
        <p className="mt-3 text-center text-[0.8125rem] leading-relaxed text-ink/55">
          {GATE_COPY.consent}
        </p>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// The composed flow.
// ─────────────────────────────────────────────────────────────────────────────

export function SiteCheck({ formId }: { formId: string }) {
  const [audit, formAction] = useActionState<AuditResponse | null, FormData>(
    runAuditAction,
    null
  );
  const trackingParams = useTrackingParams();
  const renderedAt = useMemo(() => Date.now(), []);
  const resultsRef = useRef<HTMLDivElement>(null);
  const announcedFor = useRef<string | null>(null);

  const succeeded = audit?.ok === true;

  useEffect(() => {
    if (!audit?.ok) return;
    // Once per audited URL — a re-render must not re-fire the event.
    if (announcedFor.current === audit.finalUrl) return;
    announcedFor.current = audit.finalUrl;
    trackAuditRun();
  }, [audit]);

  return (
    <div className="space-y-6">
      {/* ── Stage 1 ─────────────────────────────────────────────────────── */}
      <form
        id={formId}
        action={formAction}
        noValidate
        className="rounded-xl border border-line bg-white p-6 shadow-[0_1px_3px_rgba(5,6,28,0.06),0_12px_32px_-12px_rgba(5,6,28,0.12)] sm:p-7"
      >
        <h2 className="display-sm text-xl text-navy sm:text-[1.375rem]">
          {HERO_FORM_COPY.heading}
        </h2>
        <p className="mt-2 text-[0.9375rem] text-ink/70">{HERO_FORM_COPY.subheading}</p>

        <div className="mt-6">
          <label
            htmlFor={`${formId}-url`}
            className="block text-sm font-medium text-navy"
          >
            {HERO_FORM_COPY.label}
          </label>
          <input
            id={`${formId}-url`}
            name="url"
            type="url"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            required
            placeholder={HERO_FORM_COPY.placeholder}
            aria-describedby={audit && !audit.ok ? `${formId}-error` : undefined}
            aria-invalid={audit && !audit.ok ? true : undefined}
            className={`mt-1.5 w-full rounded-lg border bg-white px-3.5 py-3 font-mono text-base text-ink outline-none transition-colors placeholder:font-sans placeholder:text-ink/35 focus:border-navy ${
              audit && !audit.ok ? "border-amber" : "border-line"
            }`}
          />
        </div>

        <Honeypot formId={formId} />
        <input type="hidden" name="rendered_at" value={renderedAt} />
        <HiddenTracking params={trackingParams} />

        {audit && !audit.ok && (
          <div
            id={`${formId}-error`}
            role="alert"
            className="mt-5 rounded-lg border border-amber/50 bg-amber/10 px-4 py-3"
          >
            <p className="font-display text-[0.9375rem] font-bold text-[#7a4700]">
              {AUDIT_COPY.failedHeading}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-[#7a4700]/90">
              {audit.message}
            </p>
          </div>
        )}

        <div className="mt-5">
          <CheckButton />
          <p className="mt-3 text-center text-sm text-ink/60">
            {HERO_FORM_COPY.subLabel}
          </p>
        </div>
      </form>

      {/* ── Stage 1 results + Stage 2 gate ──────────────────────────────── */}
      {succeeded && audit.ok && (
        <div ref={resultsRef}>
          <AuditReadout
            finalUrl={audit.finalUrl}
            findings={audit.free}
            lockedCount={audit.lockedCount}
          >
            <EmailGate
              formId={`${formId}-gate`}
              websiteUrl={audit.finalUrl}
              trackingParams={trackingParams}
            />
          </AuditReadout>
        </div>
      )}
    </div>
  );
}
