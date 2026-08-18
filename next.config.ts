import type { NextConfig } from "next";

/**
 * The page has its own host — offer.quantumera.tech — and nothing sits in
 * front of it.
 *
 * It used to carry `basePath: "/websites-that-answer"` because the plan was to
 * serve it from a subdirectory of the main site, behind an edge rewrite, so
 * that the Google Ads display URL and final URL shared a domain. A dedicated
 * subdomain satisfies that rule on its own terms, so the basePath was doing
 * nothing except adding a 307 hop on the root and a path prefix to every URL
 * anyone has to type — the Ads final URL, the Calendly webhook, all of it.
 *
 * The two redirects that lived here went with it. Both existed ONLY to undo
 * basePath: one sent "/" to the prefixed route because basePath left the root
 * serving nothing, and the other sent "/robots.txt" to the prefixed copy
 * because basePath moves everything in public/. With basePath gone, "/" is the
 * page and "/robots.txt" is the file, directly.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
