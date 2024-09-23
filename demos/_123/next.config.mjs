import path from "path";
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    swcPlugins: [["@onlook/nextjs", {
      root: path.resolve(".")
    }]]
  }
};
export default nextConfig;