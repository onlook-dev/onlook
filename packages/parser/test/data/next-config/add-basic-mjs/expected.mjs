/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true, output: "standalone", distDir: process.env.NODE_ENV === "production" ? ".next" : ".next", typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }
};

export default nextConfig;