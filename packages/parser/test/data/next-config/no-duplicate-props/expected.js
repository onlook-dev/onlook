/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  typescript: { ignoreBuildErrors: true,

    tsconfigPath: './custom-tsconfig.json'
  },
  distDir: process.env.NODE_ENV === "production" ? ".next" : ".next", eslint: { ignoreDuringBuilds: true }
};

module.exports = nextConfig;