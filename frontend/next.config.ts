import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: false },
};

export default nextConfig;
