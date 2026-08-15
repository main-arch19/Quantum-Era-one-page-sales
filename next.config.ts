import type { NextConfig } from "next";

/**
 * The page is served from a SUBDIRECTORY of the main domain, never its own
 * domain — Google Ads requires the display URL domain to match the final URL
 * domain. basePath makes every route, asset and font path resolve correctly
 * on the far side of the edge rewrite that joins this app to the main site.
 */
const nextConfig: NextConfig = {
  basePath: "/websites-that-answer",
  reactStrictMode: true,
  poweredByHeader: false,

  /**
   * Send the bare host to the page instead of a 404.
   *
   * basePath means nothing is served at "/", so the deployment URL on its own
   * is a dead end — which is exactly the URL people paste to each other and
   * open first. `basePath: false` is required or Next prefixes the source and
   * this would match "/websites-that-answer/" instead of the real root.
   *
   * Deliberately TEMPORARY (307), not permanent. Once this app sits behind the
   * main domain's rewrite, "/" belongs to the main site — and a 301 would sit
   * in visitors' browser caches redirecting the homepage here indefinitely.
   */
  async redirects() {
    return [
      {
        source: "/",
        destination: "/websites-that-answer",
        permanent: false,
        basePath: false,
      },

      /**
       * Point the origin root at robots.txt, where crawlers actually look.
       *
       * basePath prefixes everything in public/, so the file was only reachable
       * at "/websites-that-answer/robots.txt" while "/robots.txt" returned 404.
       * Nothing was broken by that — a missing robots.txt means nothing is
       * disallowed, and AdsBot-Google was verified getting 200 on the page
       * itself — but the file was doing nothing at all while its own first line
       * calls itself CRITICAL. The day somebody adds a Disallow to it, it would
       * silently keep doing nothing.
       *
       * A redirect rather than a rewrite because Next rejects a rewrite whose
       * destination sits outside basePath:
       *
       *     The route /robots.txt rewrites urls outside of the basePath.
       *
       * Google follows up to five hops when fetching robots.txt, so a redirect
       * is within spec. Temporary, for the same reason as the root redirect
       * above: once this app sits behind the main domain's rewrite, robots.txt
       * belongs to the main site, and a cached 301 would send it here forever.
       */
      {
        source: "/robots.txt",
        destination: "/websites-that-answer/robots.txt",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
