import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Destination photography is served from Wikimedia Commons under free
    // licences, with credit shown on the destination page.
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "thumb.wikimedia.org" },
    ],
  },
};

export default nextConfig;
