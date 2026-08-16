import type { Metadata, Viewport } from "next";
import { Lato, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { GA4_ID, ADS_CONVERSION_ID, TRACKING_ENABLED } from "@/lib/tracking";
import { HERO, PRIMARY_DOMAIN } from "@/lib/content";
import "./globals.css";

/**
 * next/font downloads and self-hosts these at build time — no runtime request
 * to Google, no render-blocking stylesheet, and no layout shift.
 *
 * Two families, not three: Lato sets both the display type and the body copy,
 * so the page speaks in one voice. IBM Plex Mono stays because Lato has no
 * monospace sibling and the timestamp eyebrows and audit readout need tabular
 * figures — that is what makes the time motif read as a system.
 *
 * Lato ships no 500 on Google Fonts (100/300/400/700/900), which is why body
 * text that wants emphasis uses font-bold rather than font-medium.
 */
const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-lato",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500"],
  display: "swap",
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "Your Website Is Taking Enquiries. Is It Answering Them?",
  description: HERO.subhead,
  // Ad-only traffic. This must not compete with the main site in organic
  // search. Note: robots.txt must NOT block AdsBot-Google, or ads get
  // disapproved — see public/robots.txt.
  robots: { index: false, follow: false },
  ...metadataBaseOrNothing(),
};

/**
 * metadataBase, or nothing at all — but never a thrown build.
 *
 * `new URL()` throws on a malformed host, and this runs at module scope, so a
 * throw here surfaces as:
 *
 *     [Error: Failed to collect page data for /_not-found]
 *
 * naming a route that has nothing to do with the problem (/_not-found is
 * simply the smallest page that pulls in this layout). That error cost four
 * rounds of debugging once already.
 *
 * The bracket check alone is not enough. It covers the unfilled placeholder —
 * `new URL("https://[PRIMARY-DOMAIN]")` really does throw, because `[` opens
 * an IPv6 literal — but it stops applying the moment PRIMARY_DOMAIN is filled
 * in, and a value with a space in it throws exactly the same way. A typo in a
 * content file must never be able to fail a build, let alone blame the wrong
 * route for it.
 */
function metadataBaseOrNothing(): { metadataBase?: URL } {
  if (PRIMARY_DOMAIN.includes("[")) return {};

  try {
    return { metadataBase: new URL(`https://${PRIMARY_DOMAIN}`) };
  } catch {
    console.warn(
      `\x1b[33m⚠ PRIMARY_DOMAIN is not a usable hostname: ${JSON.stringify(
        PRIMARY_DOMAIN
      )}\n` +
        `  Expected a bare domain, e.g. "quantumerasolutions.com" — no scheme, no path.\n` +
        `  Continuing without metadataBase; relative OG/canonical URLs will not resolve.\x1b[0m`
    );
    return {};
  }
}

export const viewport: Viewport = {
  themeColor: "#0A0E52",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gtagId = GA4_ID || ADS_CONVERSION_ID;

  return (
    <html
      lang="en"
      className={`${lato.variable} ${plexMono.variable}`}
    >
      <body>
        {children}

        {/* The only external scripts on this page: GA4 and Google Ads.
            afterInteractive keeps them off the critical path so they cannot
            hurt LCP — which feeds Quality Score, which sets your CPC. */}
        {TRACKING_ENABLED && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                ${GA4_ID ? `gtag('config', '${GA4_ID}');` : ""}
                ${ADS_CONVERSION_ID ? `gtag('config', '${ADS_CONVERSION_ID}');` : ""}
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
