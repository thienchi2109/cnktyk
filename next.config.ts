import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Skip ESLint during builds for faster development
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Skip TypeScript type checking during builds (we handle it separately)
    ignoreBuildErrors: false, // Keep this false to catch actual TS errors
  },
  // Cloudflare Pages with Functions compatibility
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
