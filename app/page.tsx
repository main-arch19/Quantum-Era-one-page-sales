import { Inbox, Map, Search, Smartphone } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Objections } from "@/components/Objections";
import { EnquiryForm } from "@/components/EnquiryForm";
import { StickyBar } from "@/components/StickyBar";
import { ScrollToFormButton } from "@/components/ScrollToFormButton";
import {
  UnansweredCard,
  NotificationExchange,
} from "@/components/NotificationCards";
import {
  HERO,
  NARRATIVE_SECTIONS,
  MECHANISM,
  OFFER,
  FINAL_CTA,
  PRIMARY_PROOF,
  PROOF_READY,
  PROOF_HEADING,
  SECONDARY_PROOFS,
  TRUST_LINE,
  unfilledPlaceholders,
} from "@/lib/content";

/** The check the sticky bar and the offer CTA scroll to. */
const FINAL_FORM_ID = "enquiry-final";

/** Named in lib/content.ts so the copy file stays free of imports. */
const OFFER_ICONS = {
  smartphone: Smartphone,
  inbox: Inbox,
  search: Search,
  map: Map,
} as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow text-electric/70">{children}</p>;
}

/** Shared measure for long copy. Comfortable line length is not decoration. */
function Prose({ paragraphs }: { paragraphs: readonly string[] }) {
  return (
    <div className="mt-5 max-w-[38rem] space-y-5 text-[1.0625rem] text-ink/80 sm:text-[1.125rem]">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}

export default function LandingPage() {
  // Dev-only. In production the page omits anything unfilled rather than
  // showing it, so a live visitor never sees a bracket and does not need a
  // warning bar explaining one. Launch-readiness is checked deliberately,
  // before ads run, with `npm run check:launch`.
  const unfilled =
    process.env.NODE_ENV === "production" ? [] : unfilledPlaceholders();

  return (
    <>
      <Header />

      {unfilled.length > 0 && (
        <div className="border-b-2 border-amber bg-amber/15 px-5 py-3 text-center sm:px-8">
          <p className="text-sm font-medium text-[#7a4700]">
            ⚠ {unfilled.length} placeholder{unfilled.length === 1 ? "" : "s"}{" "}
            unfilled — this page must not run against paid traffic yet.
          </p>
          <p className="mt-1 font-mono text-xs text-[#7a4700]/80">
            {unfilled.join(" · ")}
          </p>
        </div>
      )}

      <main>
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="bg-paper px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
            <div>
              <h1 className="display max-w-[15ch] text-[2.125rem] text-navy sm:text-[3rem] lg:text-[3.5rem]">
                {HERO.h1}
              </h1>
              <p className="mt-5 max-w-[34rem] text-lg text-ink/75 sm:text-xl">
                {HERO.subhead}
              </p>

              {/* The signature element, cold open: one card, sitting inert. */}
              <div className="mt-9 max-w-md">
                <UnansweredCard />
              </div>
            </div>

            {/* On mobile the check moves below the hero copy. */}
            <div className="lg:pt-2">
              <EnquiryForm formId="enquiry" />
            </div>
          </div>
        </section>

        {/* ── 11:47 PM / 11:48 PM / 7:15 AM ─────────────────────────────── */}
        {NARRATIVE_SECTIONS.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className={`px-5 py-14 sm:px-8 sm:py-20 ${
              index % 2 === 0 ? "bg-white" : "bg-paper"
            } border-t border-line`}
          >
            {/* Centred at a reading measure rather than left-aligned in a
                max-w-6xl container. These are three screens of continuous
                prose; pinned left, the right half of a desktop viewport sat
                empty and read as an unfinished layout rather than restraint. */}
            <div className="mx-auto max-w-3xl">
              <Eyebrow>{section.eyebrow}</Eyebrow>
              <h2 className="display-sm mt-3 max-w-[20ch] text-[1.625rem] text-navy sm:text-[2.125rem]">
                {section.heading}
              </h2>
              <Prose paragraphs={section.body} />
            </div>
          </section>
        ))}

        {/* ── THE MECHANISM ─────────────────────────────────────────────── */}
        <section className="border-t border-line bg-navy px-5 py-14 sm:px-8 sm:py-20">
          {/* items-center keeps the cards beside the middle of the argument
              rather than pinned to the top with a void of navy beneath them. */}
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-16">
            <div>
              <Eyebrow>
                <span className="text-white/45">What we build</span>
              </Eyebrow>
              <h2 className="display-sm mt-3 max-w-[18ch] text-[1.625rem] text-white sm:text-[2.125rem]">
                {MECHANISM.heading}
              </h2>
              <div className="mt-5 max-w-[38rem] space-y-5 text-[1.0625rem] text-white/75 sm:text-[1.125rem]">
                {MECHANISM.body.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>

            {/* The pair. Same minute, twice. This is the demonstration. */}
            <div>
              <NotificationExchange />
            </div>
          </div>
        </section>

        {/* ── PROOF ─────────────────────────────────────────────────────── */}
        <section className="border-t border-line bg-white px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <Eyebrow>Proof</Eyebrow>

            {/* The story, the number and the quote are omitted entirely until
                PRIMARY_PROOF is real — a placeholder here would be a fabricated
                claim, which Google Ads prohibits. The trust line below stays
                either way: those three are real clients and naming them is a
                statement of fact, not a performance claim. */}
            {PROOF_READY && (
              <>
                <h2 className="display-sm mt-3 max-w-[24ch] text-[1.625rem] text-navy sm:text-[2.125rem]">
                  {PROOF_HEADING}
                </h2>

                <div className="mt-5 max-w-[38rem] text-[1.0625rem] text-ink/80 sm:text-[1.125rem]">
                  <p>{PRIMARY_PROOF.story}</p>
                </div>

                <blockquote className="mt-8 max-w-[38rem] border-l-2 border-electric pl-5">
                  <p className="display-sm text-[1.25rem] text-navy sm:text-[1.5rem]">
                    “{PRIMARY_PROOF.quote.text}”
                  </p>
                  <footer className="mt-3 text-[0.9375rem] text-ink/60">
                    — {PRIMARY_PROOF.quote.name}, {PRIMARY_PROOF.quote.role},{" "}
                    {PRIMARY_PROOF.quote.company}
                  </footer>
                </blockquote>
              </>
            )}

            {SECONDARY_PROOFS.length > 0 && (
              <ul className="mt-10 max-w-[38rem] divide-y divide-line border-y border-line">
                {SECONDARY_PROOFS.map((proof) => (
                  <li
                    key={proof.client}
                    className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-4"
                  >
                    <span className="font-display text-[0.9375rem] font-bold text-navy sm:w-32 sm:shrink-0">
                      {proof.client}
                    </span>
                    <span className="text-[1.0625rem] text-ink/80">
                      {proof.result}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Plain text. Not links, not linked logos.
                Carries the whole section while PROOF_READY is false, so it is
                set with real presence rather than as a mono footnote — a
                full-width band holding one grey line read as a broken section
                rather than a deliberately quiet one. */}
            <ul
              className={`flex flex-wrap items-baseline gap-x-8 gap-y-3 ${
                PROOF_READY ? "mt-10 border-t border-line pt-8" : "mt-6"
              }`}
            >
              {TRUST_LINE.map((client) => (
                <li
                  key={client}
                  className={
                    PROOF_READY
                      ? "font-mono text-sm text-ink/50"
                      : "display-sm text-[1.25rem] text-navy/80 sm:text-[1.5rem]"
                  }
                >
                  {client}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── THE OFFER ─────────────────────────────────────────────────── */}
        <section className="border-t border-line bg-paper px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <Eyebrow>30 minutes · No cost</Eyebrow>
            <h2 className="display-sm mt-3 text-[1.625rem] text-navy sm:text-[2.125rem]">
              {OFFER.heading}
            </h2>
            <p className="mt-5 max-w-[38rem] text-[1.0625rem] text-ink/80 sm:text-[1.125rem]">
              {OFFER.intro}
            </p>

            {/* Two columns on desktop. The prose measure alone left half the
                viewport empty here, which read as an unfinished layout rather
                than as restraint. */}
            <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
              {OFFER.steps.map((step, index) => {
                const Icon = OFFER_ICONS[step.icon];
                return (
                  <li key={step.label} className="bg-paper p-6 sm:p-7">
                    <div className="flex items-center gap-3">
                      {/* Navy, never Electric — that is the CTA's colour. */}
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy/[0.07] text-navy">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </span>
                      <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink/40">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="display-sm mt-4 text-[1.0625rem] text-navy">
                      {step.label}
                    </h3>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/70">
                      {step.body}
                    </p>
                  </li>
                );
              })}
            </ol>

            <p className="mt-8 max-w-[38rem] text-[1.0625rem] text-ink/80 sm:text-[1.125rem]">
              {OFFER.closer}
            </p>

            <div className="mt-9">
              <ScrollToFormButton targetId={FINAL_FORM_ID} />
            </div>
          </div>
        </section>

        {/* ── OBJECTIONS ────────────────────────────────────────────────── */}
        <section className="border-t border-line bg-white px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <Eyebrow>Before you book</Eyebrow>
            <h2 className="display-sm mb-8 mt-3 text-[1.625rem] text-navy sm:text-[2.125rem]">
              The questions people ask us first
            </h2>
            <Objections />
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
        <section
          id="book"
          className="border-t border-line bg-navy px-5 py-14 sm:px-8 sm:py-20"
        >
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:gap-14">
            <div className="lg:pt-4">
              <h2 className="display max-w-[16ch] text-[1.875rem] text-white sm:text-[2.5rem]">
                {FINAL_CTA.heading}
              </h2>
              <p className="mt-5 max-w-[32rem] text-lg text-white/70">
                {FINAL_CTA.subhead}
              </p>
            </div>

            {/* The second check is the same component, not a dark variant of
                it. The readout is a diagnostic and has to read identically
                wherever it appears — a terminal that changes colour with the
                band it sits on stops looking like an instrument. */}
            <div className="rounded-2xl bg-paper/95 p-4 sm:p-5">
              <EnquiryForm formId={FINAL_FORM_ID} />
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <StickyBar targetId={FINAL_FORM_ID} />
    </>
  );
}
