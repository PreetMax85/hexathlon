import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The share cards read their TTFs at request time; make sure they ship with the functions.
  outputFileTracingIncludes: {
    "/c/*/opengraph-image": ["./src/app/fonts/og/**"],
    "/opengraph-image": ["./src/app/fonts/og/**"],
  },
};

export default nextConfig;
