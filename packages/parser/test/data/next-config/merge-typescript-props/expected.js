/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        tsconfigPath: './custom-tsconfig.json',
        typeChecking: true,
        ignoreBuildErrors: true,
    },
    output: 'standalone',
    distDir: process.env.NODE_ENV === 'production' ? '.next-prod' : '.next',
};

module.exports = nextConfig;
