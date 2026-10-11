import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bounty/ui", "@bounty/types"],
};

export default nextConfig;
