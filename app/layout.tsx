import type { Metadata, Viewport } from "next";
import { Sora, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { GA4_ID, ADS_CONVERSION_ID, TRACKING_ENABLED } from "@/lib/tracking";
import { HERO, PRIMARY_DOMAIN } from "@/lib/content";
import "./globals.css";

/**
 * next/font downloads and self-hosts these at build time — no runtime request
 * to Google, no render-blocking stylesheet, and no layout shift.
 */
const sora = Sora({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
  variable: "--font-sora",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-plex-sans",
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
  ...(PRIMARY_DOMAIN.includes("[")
    ? {}
    : { metadataBase: new URL(`https://${PRIMARY_DOMAIN}`) }),
};

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
      className={`${sora.variable} ${plexSans.variable} ${plexMono.variable}`}
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
