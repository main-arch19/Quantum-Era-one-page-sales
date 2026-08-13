import { COMPANY, PRIMARY_DOMAIN, isFilled } from "./content";

/**
 * Privacy and Terms copy. These render in a modal ON THIS PAGE — never a new
 * page, never a new tab. This is the single permitted exception to the
 * no-links rule, and it exists because Google Ads disapproves lead-gen pages
 * without an accessible privacy policy.
 */

export type LegalDocument = {
  id: string;
  title: string;
  updated: string;
  sections: { heading: string; paragraphs: string[] }[];
};

export const PRIVACY_POLICY: LegalDocument = {
  id: "privacy",
  title: "Privacy Policy",
  updated: "August 2026",
  sections: [
    {
      heading: "The website address you enter",
      paragraphs: [
        `The first thing this page asks for is your website address, and you can enter it without giving us any personal information at all. When you do, our server visits that address the way any visitor's browser would, reads the page that comes back, and runs a set of automated checks on it — how quickly it responded, whether it has a working contact form, whether it is set up for phones, and similar.`,
        `We only ever read what your site already serves publicly. We do not log in to anything, we do not submit your contact form, and we do not attempt to access anything a visitor could not reach.`,
        `We also send that address to Google's PageSpeed Insights service, which loads your site on Google's own infrastructure and returns performance measurements. Google's handling of that request is covered by Google's privacy policy, not ours.`,
      ],
    },
    {
      heading: "What we collect about you",
      paragraphs: [
        `To send you the full report we ask for your name, your work email address and your company name. The company name is filled in automatically from the domain you entered — you can correct it, and it is only a guess until you do.`,
        `There is no phone field on this page. If you go on to book a call, the scheduling service asks for a phone number separately and optionally, and uses it to send you a reminder.`,
        `We also record the advertising parameters attached to your visit (such as utm_source, utm_campaign, utm_term and gclid). These tell us which advertisement and which search term brought you here. They contain no personal information about you.`,
      ],
    },
    {
      heading: "Why we collect it",
      paragraphs: [
        `We use your details for two purposes: to send you the report on your website, and to follow up with you about that report. That follow-up is what we are asking for in exchange for the report, and we say so on the form. You can tell us to stop at any time and we will.`,
        `We do not sell your information. We do not share it with advertisers or data brokers, and we do not add you to any list beyond the follow-up described above.`,
      ],
    },
    {
      heading: "Who can see it",
      paragraphs: [
        `Your submission is stored in our database and emailed to ${COMPANY.name}, and is read by the people who would run your call. We use a small number of service providers to make that work — a database host, an email delivery service, and a scheduling service — and they process your information only to provide those services to us.`,
      ],
    },
    {
      heading: "Analytics and advertising",
      paragraphs: [
        `This page uses Google Analytics and Google Ads conversion tracking to measure how the page performs and whether our advertising works. These services set cookies and may record your interactions with the page, such as how far you scrolled and whether you submitted the form.`,
        `You can block these with any standard ad or cookie blocker. The page and the form work normally if you do.`,
      ],
    },
    {
      heading: "How long we keep it",
      paragraphs: [
        `We keep enquiry details for as long as we are in contact with you about your project, and for a reasonable period afterwards in case you come back to us. You can ask us to delete your information at any time and we will do it.`,
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        `You can ask us what information we hold about you, ask us to correct it, or ask us to delete it. Write to ${COMPANY.email} and we will respond.`,
      ],
    },
    {
      heading: "Contact",
      paragraphs: [
        `${COMPANY.name}, ${COMPANY.location}. Questions about this policy go to ${COMPANY.email}.`,
      ],
    },
  ],
};

export const TERMS: LegalDocument = {
  id: "terms",
  title: "Terms",
  updated: "August 2026",
  sections: [
    {
      heading: "What this page offers",
      paragraphs: [
        `This page offers an automated check of your website and a free 30-minute teardown call. Both are genuinely free and there is no obligation attached to either. You keep the call recording and the written plan whether or not you go on to hire us.`,
      ],
    },
    {
      heading: "What the automated check is and is not",
      paragraphs: [
        `The checks are automated measurements taken against your live site at the moment you run them. They describe what your site did on that request, from our server and from Google's, at that time. A site can perform differently for different visitors, on different networks, and at different times of day.`,
        `The findings are indicators, not a professional audit, and nothing in them is a promise about search rankings. Anything that matters we go through properly on the call.`,
      ],
    },
    {
      heading: "What the call is",
      paragraphs: [
        `On the call we load your site over a shared screen under mobile conditions, submit your own contact form together and read what comes back, look at what the searches for your services return, and set out what we would change.`,
        `The plan is our professional opinion based on a 30-minute conversation. It is not a guarantee of any particular result. If we think your site is doing its job and a rebuild would not materially change things for you, we will tell you so — that is a legitimate outcome of the call and it happens.`,
      ],
    },
    {
      heading: "Who it is for",
      paragraphs: [
        `This is written for established businesses that already have a website which is not producing the enquiries it should. You need a working web address to use the checks on this page. If you do not have a website yet, this particular page cannot help you — say so by email and we will point you somewhere more useful.`,
      ],
    },
    {
      heading: "Booking and rescheduling",
      paragraphs: [
        `Submitting the form is a request for a call, not a binding appointment. We confirm the time with you. Either of us can reschedule with reasonable notice, and if you do not show up we will simply offer you another time.`,
      ],
    },
    {
      heading: "Pricing",
      paragraphs: [
        `Any figures discussed on this page or on the call are indicative starting points, not quotes. A real quote follows a real conversation about scope, and we give you a fixed date and figure in writing before any work begins.`,
      ],
    },
    {
      heading: "This page",
      paragraphs: [
        // Name the domain only once it is real. Interpolating it unguarded put
        // the literal text "[PRIMARY-DOMAIN]" into published legal copy, and on
        // a staging deploy it would name a throwaway hostname instead.
        isFilled(PRIMARY_DOMAIN)
          ? `The content of this page is owned by ${COMPANY.name}. Client names appear with permission. This page is published at ${PRIMARY_DOMAIN} and these terms are governed by the laws of Jamaica.`
          : `The content of this page is owned by ${COMPANY.name}. Client names appear with permission. These terms are governed by the laws of Jamaica.`,
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS = [PRIVACY_POLICY, TERMS] as const;
