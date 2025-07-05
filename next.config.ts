import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  output: 'export',
  ...(process.env.NODE_ENV === 'production' && {
    images: { 
      unoptimized: true
    },
  }),
  trailingSlash: true,
  distDir: 'dist',
  reactStrictMode: false,
  transpilePackages: ["@openai/agents"],
};

export default nextConfig;
