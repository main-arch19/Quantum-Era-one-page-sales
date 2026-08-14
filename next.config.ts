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
    ];
  },
};

export default nextConfig;
