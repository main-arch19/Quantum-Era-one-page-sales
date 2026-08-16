import { Lightbulb, Map, Search, Target } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Objections } from "@/components/Objections";
import { EnquiryForm } from "@/components/EnquiryForm";
import { StickyBar } from "@/components/StickyBar";
import { ScrollToFormButton } from "@/components/ScrollToFormButton";
import { ClientLogos } from "@/components/ClientLogos";
import { TrustBadge } from "@/components/TrustBadge";
import {
  UnansweredCard,
  NotificationExchange,
} from "@/components/NotificationCards";
import {
  HERO,
  NARRATIVE_SECTIONS,
  MECHANISM,
  INCLUDED,
  OFFER,
  FINAL_CTA,
  PRIMARY_PROOF,
  PROOF_READY,
  PROOF_HEADING,
  PROOF_EYEBROW,
  SECONDARY_PROOFS,
  unfilledPlaceholders,
} from "@/lib/content";

/** The check the sticky bar and the offer CTA scroll to. */
const FINAL_FORM_ID = "enquiry-final";

/** Named in lib/content.ts so the copy file stays free of imports. */
const OFFER_ICONS = {
  lightbulb: Lightbulb,
  target: Target,
  search: Search,
  map: Map,
} as const;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow text-electric/70">{children}</p>;
}

/**
 * The header block for the CARD sections — offer, proof, objections.
 *
 * Centred, because that is what the reference does and because a card grid
 * below reads as a deliberate composition under a centred header and as a
 * pile under a left-aligned one.
 *
 * Deliberately NOT used on the four narrative sections. Those are an essay at
 * a 62-character measure, and a centred header over left-aligned long prose
 * reads as a mistake rather than as a choice. The reference has no equivalent
 * section, so there is nothing there to copy.
 */
function SectionHeader({
  eyebrow,
  heading,
  children,
}: {
  eyebrow: string;
  heading: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[42rem] text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="display-sm mt-3 text-h2 text-navy">{heading}</h2>
      {children}
    </div>
  );
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
          <p className="text-sm font-bold text-amber-ink">
            ⚠ {unfilled.length} placeholder{unfilled.length === 1 ? "" : "s"}{" "}
            unfilled — this page must not run against paid traffic yet.
          </p>
          <p className="mt-1 font-mono text-micro text-amber-ink/80">
            {unfilled.join(" · ")}
          </p>
        </div>
      )}

      <main>
        {/* ── HERO ──────────────────────────────────────────────────────── */}
        <section className="bg-paper px-5 pb-14 pt-8 sm:px-8 sm:pb-20 sm:pt-16">
          {/* Three grid children, not two, so mobile can order them
              independently of the desktop columns.

              The card used to sit inside the copy column, which meant it
              stacked BETWEEN the subhead and the form on mobile and pushed the
              first input to 834px. Measured against usable viewport — device
              height minus browser chrome — that is 200px of scrolling on an
              iPhone 14 and 341px on an SE, to reach the only action on the
              page, on the ~5x of traffic that is mobile.

              Mobile order is now copy → form → card. Desktop is unchanged:
              lg:col-start-1 puts the card back beneath the copy in the left
              column, and the form spans both rows on the right.

              items-center, like the mechanism band below. The copy column runs
              short of the form beside it, and pinned to the top it left a
              250px empty rectangle bottom-left. */}
          <div className="mx-auto grid max-w-6xl gap-7 sm:gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-gutter">
            <div className="lg:col-start-1 lg:row-start-1">
              <h1 className="display max-w-[15ch] text-h1 text-navy">
                {HERO.h1}
              </h1>
              <p className="mt-4 max-w-[34rem] text-lead text-ink/75 sm:mt-5">
                {HERO.subhead}
              </p>
            </div>

            {/* The ask. First thing after the headline on a phone. */}
            <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <EnquiryForm formId="enquiry-hero" />
            </div>

            {/* The signature element, cold open: one card, sitting inert. */}
            <div className="max-w-md lg:col-start-1 lg:row-start-2 lg:-mt-4">
              <UnansweredCard />
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
              {/* "The fix", not "What we build" — the section below this one
                  is the thing that enumerates what gets built, and two
                  sections cannot share a name. This is also the more accurate
                  label: this band is the turn from four sections of problem
                  into the answer. */}
              <Eyebrow>
                <span className="text-white/60">The fix</span>
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

        {/* ── WHAT IS INCLUDED ──────────────────────────────────────────── */}
        {/* Directly after the mechanism band, which argues WHY. This answers
            the "so what do I actually get?" that the argument provokes, at the
            moment it is provoked, rather than making the reader carry the
            question down to the offer.

            Paper, between the navy mechanism and the white proof, so the band
            alternation survives the insertion. */}
        <section className="border-t border-line bg-paper px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow={INCLUDED.eyebrow}
              heading={INCLUDED.heading}
            >
              <p className="mt-5 text-body text-ink/70">{INCLUDED.intro}</p>
            </SectionHeader>

            {/* Two columns of four, in the same hairline-gap grid the offer
                steps use — gap-px over a bg-line fill draws every separator
                without eight separate borders, and it keeps the page to ONE
                card idiom rather than two.

                No icons, deliberately. Eight of them directly above the
                offer's four would read as decoration rather than as a system:
                the offer icons earn their place by marking a SEQUENCE, and
                these items are a set with no order to signal. */}
            <ul className="mt-10 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
              {INCLUDED.items.map((item) => (
                <li key={item.label} className="bg-white p-6 sm:p-8">
                  <h3 className="display-sm text-lead text-navy">
                    {item.label}
                  </h3>
                  <p className="mt-2 text-base leading-relaxed text-ink/70">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── PROOF ─────────────────────────────────────────────────────── */}
        <section className="border-t border-line bg-white px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <Eyebrow>{PROOF_EYEBROW}</Eyebrow>
            </div>

            {/* The story, the number and the quote are omitted entirely until
                PRIMARY_PROOF is real — a placeholder here would be a fabricated
                claim, which Google Ads prohibits. The roster below stays
                either way: those are real clients and showing their marks is a
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

            {/* Not links, and not logos that link. While PROOF_READY is false
                this row carries the entire section, so it is set at a size
                that can hold it; once there is a real proof story above, it
                steps back to a footnote under a rule. */}
            <div
              className={
                PROOF_READY ? "mt-10 border-t border-line pt-8" : "mt-8"
              }
            >
              <ClientLogos prominent={!PROOF_READY} />
            </div>

            {/* Under the roster, not above it. A trust signal confirms a claim
                rather than announcing one — the logos say "real clients", and
                this says what working with us guarantees. */}
            <div className="mt-8 flex justify-center">
              <TrustBadge />
            </div>
          </div>
        </section>

        {/* ── THE OFFER ─────────────────────────────────────────────────── */}
        <section className="border-t border-line bg-paper px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeader eyebrow="30 minutes · No cost" heading={OFFER.heading}>
              <p className="mt-5 text-body text-ink/70">{OFFER.intro}</p>
            </SectionHeader>

            {/* Two columns on desktop. The prose measure alone left half the
                viewport empty here, which read as an unfinished layout rather
                than as restraint. */}
            <ol className="mt-10 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
              {OFFER.steps.map((step, index) => {
                const Icon = OFFER_ICONS[step.icon];
                return (
                  <li key={step.label} className="bg-white p-6 sm:p-8">
                    <div className="flex items-center gap-3">
                      {/* A filled disc, not a loose digit beside an icon. The
                          numeral is the thing that says "these happen in this
                          order", so it gets the solid shape and the icon gets
                          the quiet one. Navy, never Electric — that is the
                          CTA's colour and it means "click here". */}
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy font-mono text-micro font-medium tabular-nums text-white">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-navy/[0.06] text-navy">
                        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
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

            <p className="mx-auto mt-10 max-w-[42rem] text-center text-body text-ink/80">
              {OFFER.closer}
            </p>

            <div className="mt-8 text-center">
              <ScrollToFormButton targetId={FINAL_FORM_ID} />
            </div>
          </div>
        </section>

        {/* ── OBJECTIONS ────────────────────────────────────────────────── */}
        <section className="border-t border-line bg-white px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeader
              eyebrow="Before you book"
              heading="The questions people ask us first"
            />
            <div className="mx-auto mt-10 max-w-[46rem]">
              <Objections />
            </div>
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

              {/* The last thing before the decision. Friction is highest here,
                  which is where a guarantee is worth the most. */}
              <div className="mt-7">
                <TrustBadge tone="dark" />
              </div>
            </div>

            {/* The second form is the same component, not a dark variant of
                it. It has to read identically wherever it appears — a control
                that changes colour with the band it sits on stops looking
                like the same control. */}
            <div className="rounded-card bg-paper p-4 sm:p-5">
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
