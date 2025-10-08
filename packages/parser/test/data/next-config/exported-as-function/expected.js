module.exports = (phase, { defaultConfig }) => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    ...defaultConfig,
    reactStrictMode: true, output: "standalone", distDir: process.env.NODE_ENV === "production" ? ".next" : ".next", typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }
  };
  return nextConfig;
};