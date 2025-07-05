import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // output: 'export',
  ...(process.env.NODE_ENV === 'production' && {
    basePath: '/voice-assistant',
    assetPrefix: '/voice-assistant/',
  }),
  trailingSlash: true,
  distDir: 'dist',
  reactStrictMode: false,
  transpilePackages: ["@openai/agents"],

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5003/portfolio-3fd9d/us-central1/voiceAssistant/:path*',
      },
    ]
  },
};

export default nextConfig;
