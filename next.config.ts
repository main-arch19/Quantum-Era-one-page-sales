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
};

export default nextConfig;
