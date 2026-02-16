import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "55mb",
    },
    proxyClientMaxBodySize: "55mb",
  },
};

export default nextConfig;
