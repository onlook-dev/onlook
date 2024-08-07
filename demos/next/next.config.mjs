import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    swcPlugins: [["@onlook/nextjs", { root: path.resolve(".") }]],
  },
}

export default nextConfig
