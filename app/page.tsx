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

/**
 * Long copy. The measure lives on the section wrapper, not here — nesting a
 * 38rem block inside a centred 48rem one left every paragraph with 160px of
 * dead space to its right and pushed the whole column off the optical centre
 * while the headings above it looked centred.
 */
function Prose({ paragraphs }: { paragraphs: readonly string[] }) {
  return (
    <div className="mt-5 space-y-5 text-body text-ink/80">
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
          <p className="mt-1 font-mono text-micro text-[#7a4700]/80">
            {unfilled.join(" · ")}
          </p>
        </div>
      )}

      <main>
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="bg-paper px-5 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16">
          {/* items-center, like the mechanism band below. The left column runs
              short of the form beside it, and pinned to the top it left a
              250px empty rectangle bottom-left — the first thing on the page,
              reading as a column that ran out of content. */}
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-gutter">
            <div>
              <h1 className="display max-w-[15ch] text-h1 text-navy">
                {HERO.h1}
              </h1>
              <p className="mt-5 max-w-[34rem] text-lead text-ink/75">
                {HERO.subhead}
              </p>

              {/* The signature element, cold open: one card, sitting inert. */}
              <div className="mt-10 max-w-md">
                <UnansweredCard />
              </div>
            </div>

            {/* On mobile the form moves below the hero copy. */}
            <div>
              <EnquiryForm formId="enquiry-hero" />
            </div>
          </div>
        </section>

        {/* ── 11:47 PM / 11:48 PM / 7:15 AM / 11:47 PM × 52 ─────────────── */}
        {NARRATIVE_SECTIONS.map((section, index) => {
          // The first three are one night, told in order. The fourth
          // multiplies that night by a year and is the turn in the argument —
          // it gets the louder heading treatment and the rule above it. The
          // white/paper alternation this replaced differed by 1% luminance:
          // four screens of prose that were paying for a rhythm device and
          // receiving nothing for it.
          const isTurn = index === NARRATIVE_SECTIONS.length - 1;

          return (
            <section
              key={section.id}
              id={section.id}
              className={`border-t border-line px-5 py-14 sm:px-8 sm:py-20 ${
                isTurn ? "bg-white" : "bg-paper"
              }`}
            >
              {/* One container owns the measure. */}
              <div className="mx-auto max-w-[38rem]">
                {isTurn && (
                  <span
                    aria-hidden="true"
                    className="mb-6 block h-px w-16 bg-navy"
                  />
                )}
                <Eyebrow>{section.eyebrow}</Eyebrow>
                <h2
                  className={`mt-3 max-w-[20ch] text-h2 text-navy ${
                    isTurn ? "display" : "display-sm"
                  }`}
                >
                  {section.heading}
                </h2>
                <Prose paragraphs={section.body} />
              </div>
            </section>
          );
        })}

        {/* ── THE MECHANISM ─────────────────────────────────────────────── */}
        <section className="border-t border-line bg-navy px-5 py-14 sm:px-8 sm:py-20">
          {/* items-center keeps the cards beside the middle of the argument
              rather than pinned to the top with a void of navy beneath them. */}
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-gutter">
            <div>
              <Eyebrow>
                <span className="text-white/60">What we build</span>
              </Eyebrow>
              <h2 className="display-sm mt-3 max-w-[18ch] text-h2 text-white">
                {MECHANISM.heading}
              </h2>
              <div className="mt-5 max-w-[38rem] space-y-5 text-body text-white/75">
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
                <h2 className="display-sm mt-3 max-w-[24ch] text-h2 text-navy">
                  {PROOF_HEADING}
                </h2>

                <div className="mt-5 max-w-[38rem] text-body text-ink/80">
                  <p>{PRIMARY_PROOF.story}</p>
                </div>

                <blockquote className="mt-8 max-w-[38rem] border-l-2 border-electric pl-5">
                  <p className="display-sm text-lead text-navy">
                    “{PRIMARY_PROOF.quote.text}”
                  </p>
                  <footer className="mt-3 text-sm text-ink/60">
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
                    <span className="font-display text-sm font-bold text-navy sm:w-32 sm:shrink-0">
                      {proof.client}
                    </span>
                    <span className="text-body text-ink/80">
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
                      ? "font-mono text-sm text-ink/65"
                      : "display-sm text-lead text-navy/80"
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
            <h2 className="display-sm mt-3 text-h2 text-navy">
              {OFFER.heading}
            </h2>
            <p className="mt-5 max-w-[38rem] text-body text-ink/80">
              {OFFER.intro}
            </p>

            {/* Two columns on desktop. The prose measure alone left half the
                viewport empty here, which read as an unfinished layout rather
                than as restraint. */}
            <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2">
              {OFFER.steps.map((step, index) => {
                const Icon = OFFER_ICONS[step.icon];
                return (
                  <li key={step.label} className="bg-paper p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                      {/* Navy, never Electric — that is the CTA's colour. */}
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy/[0.07] text-navy">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                      </span>
                      <span className="font-mono text-micro uppercase tracking-[0.18em] text-ink/65">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="display-sm mt-4 text-lead text-navy">
                      {step.label}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-ink/70">
                      {step.body}
                    </p>
                  </li>
                );
              })}
            </ol>

            <p className="mt-8 max-w-[38rem] text-body text-ink/80">
              {OFFER.closer}
            </p>

            <div className="mt-10">
              <ScrollToFormButton targetId={FINAL_FORM_ID} />
            </div>
          </div>
        </section>

        {/* ── OBJECTIONS ────────────────────────────────────────────────── */}
        <section className="border-t border-line bg-white px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <Eyebrow>Before you book</Eyebrow>
            <h2 className="display-sm mb-8 mt-3 text-h2 text-navy">
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
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-gutter">
            <div>
              <h2 className="display max-w-[16ch] text-h2 text-white">
                {FINAL_CTA.heading}
              </h2>
              <p className="mt-5 max-w-[32rem] text-lead text-white/70">
                {FINAL_CTA.subhead}
              </p>
            </div>

            {/* The second form is the same component, not a dark variant of
                it. It has to read identically wherever it appears — a control
                that changes colour with the band it sits on stops looking
                like the same control. */}
            <div className="rounded-xl bg-paper/95 p-4 sm:p-5">
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
