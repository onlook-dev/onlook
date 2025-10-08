const withSomePlugin = require('some-plugin');

module.exports = withSomePlugin({
  reactStrictMode: true, output: "standalone", distDir: process.env.NODE_ENV === "production" ? ".next" : ".next", typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }
});