/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    devIndicators: {
        buildActivity: false,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
