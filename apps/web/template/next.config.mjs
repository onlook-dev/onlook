/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    devIndicators: false,
    webpack: (config) => {
        // Prevent webpack from bundling the preload script
        config.externals = config.externals || [];
        config.externals.push('/onlook-preload-script.js');

        return config;
    },
};
export default nextConfig;
