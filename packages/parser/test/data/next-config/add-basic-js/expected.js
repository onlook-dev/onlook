/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, output: "standalone", distDir: process.env.NODE_ENV === "production" ? ".next-prod" : ".next", typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }
};

module.exports = nextConfig;