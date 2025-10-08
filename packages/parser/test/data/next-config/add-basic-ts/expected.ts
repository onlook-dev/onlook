import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true, output: "standalone", distDir: process.env.NODE_ENV === "production" ? ".next" : ".next", typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;