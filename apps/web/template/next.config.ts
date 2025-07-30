import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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

export default nextConfig;
