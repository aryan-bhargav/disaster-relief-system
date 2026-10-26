import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staticGenerationRetryCount: 3,
  },
};

export default nextConfig;
