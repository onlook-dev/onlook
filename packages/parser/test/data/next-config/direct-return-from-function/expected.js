module.exports = () => {
  return {
    reactStrictMode: true, output: "standalone", distDir: process.env.NODE_ENV === "production" ? ".next" : ".next", typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }
  };
};