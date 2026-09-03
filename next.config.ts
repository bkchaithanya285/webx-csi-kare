import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable development compiling indicators/overlay badges
  devIndicators: false,
  // Disable React double-invoking effects in dev mode for instantaneous loading
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
