/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        appDir: true,
        serverComponentsExternalPackages: ['@prisma/client'],
    },
    webpack: (config) => {
        return config;
    },
};

module.exports = nextConfig;
