import type { Metadata } from "next";
import Image from "next/image";
import { BookedTracking } from "@/components/BookedTracking";
import { CalendlyEmbed } from "@/components/CalendlyEmbed";
import { getSupabase } from "@/lib/supabase";
import { CALENDLY_URL, COMPANY, CONTACT_EMAIL } from "@/lib/content";
import logo from "@/public/qes-logo.png";

export const metadata: Metadata = {
  title: "Enquiry received — pick a time",
  robots: { index: false, follow: false },
};

// The row is written moments before this page renders; a cached response would
// show a stranger's name to whoever loads it next.
export const dynamic = "force-dynamic";

/**
 * The reward page. Fires the conversion, confirms, books the call.
 *
 * ZERO LINKS. Not one href on this page — no navigation, no return link, no
 * mailto. The Calendly iframe is not a link and the legal modals are buttons.
 */
export default async function BookedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const leadId = typeof params.lid === "string" ? params.lid : "";

  const lead = await loadLead(leadId);
  const firstName = (lead?.name ?? "").trim().split(/\s+/)[0] ?? "";

  const calendlyReady = Boolean(CALENDLY_URL) && !CALENDLY_URL.includes("[");

  return (
    <>
      <BookedTracking leadId={leadId} />

      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-4xl items-center px-5 py-4 sm:px-8">
          <Image
            src={logo}
            alt={COMPANY.name}
            priority
            sizes="120px"
            className="h-8 w-auto sm:h-9"
          />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="eyebrow text-electric/70">Enquiry received</p>

        <h1 className="display mt-3 max-w-[20ch] text-[2rem] text-navy sm:text-[2.75rem]">
          {firstName ? `Thanks, ${firstName}.` : "Thanks — we have it."}
        </h1>

        <p className="mt-5 max-w-[38rem] text-lg text-ink/75">
          Your enquiry is with us and a real person is reading it, not a filter.
          We will come back to you by email either way.
        </p>

        <div className="mt-14 border-t border-line pt-10">
          <p className="eyebrow text-electric/70">30 minutes · No cost</p>
          <h2 className="display-sm mt-3 max-w-[24ch] text-[1.625rem] text-navy sm:text-[2.125rem]">
            Want to skip the back and forth? Pick a time now.
          </h2>
          <p className="mt-5 max-w-[38rem] text-[1.0625rem] text-ink/70">
            Thirty minutes on a call is worth a week of emails. We will go
            through what you want built, what it takes, and what it costs — with
            a real figure and a real date. No pitch. You keep the plan either
            way.
          </p>
        </div>

        <div className="mt-10">
          {calendlyReady ? (
            <CalendlyEmbed
              url={CALENDLY_URL}
              leadId={leadId}
              description={lead?.project_description ?? ""}
              name={lead?.name ?? ""}
              email={lead?.email ?? ""}
              utm={(lead?.utm as Record<string, string> | null) ?? {}}
            />
          ) : (
            <div className="rounded-xl border-2 border-dashed border-amber bg-amber/10 p-6">
              <p className="font-display text-[0.9375rem] font-bold text-[#7a4700]">
                Scheduler not configured
              </p>
              <p className="mt-2 text-[0.9375rem] text-[#7a4700]/85">
                Set <code className="font-mono">NEXT_PUBLIC_CALENDLY_URL</code>{" "}
                to your event link. Until then this page cannot book anyone —
                enquiries still arrive by email, but you will be scheduling them
                by hand.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="px-5 py-10 text-center sm:px-8">
        <p className="text-sm text-ink/45">
          © {COMPANY.year} {COMPANY.name} · {COMPANY.location}
        </p>
        <p className="mt-1 font-mono text-sm text-ink/35">{CONTACT_EMAIL}</p>
      </footer>
    </>
  );
}

/**
 * Loads the lead so Calendly can be prefilled.
 *
 * Returns null rather than throwing on every failure path. Someone arriving
 * here has already converted — a database hiccup must degrade to "calendar
 * without a prefill", never to an error page in front of a lead we paid for.
 */
async function loadLead(leadId: string) {
  if (!leadId) return null;

  // Reject anything that is not a UUID before it reaches the database.
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      leadId
    )
  ) {
    return null;
  }

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("leads")
    .select("name, email, project_description, utm")
    .eq("id", leadId)
    .maybeSingle();

  if (error) {
    console.error("[booked] could not load lead", error);
    return null;
  }

  return data;
}
