import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5gb",
    },
  },
  // Configure body size limit for API routes (uploads)
  serverExternalPackages: [],
};

export default nextConfig;
