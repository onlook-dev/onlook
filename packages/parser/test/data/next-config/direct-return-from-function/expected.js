module.exports = () => {
  return {
    reactStrictMode: true, output: "standalone", distDir: process.env.NODE_ENV === "production" ? ".next-prod" : ".next", typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }
  };
};