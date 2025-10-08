import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, output: "standalone", distDir: process.env.NODE_ENV === "production" ? ".next-prod" : ".next", typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;