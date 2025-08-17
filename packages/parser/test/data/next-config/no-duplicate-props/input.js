/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'export',
    typescript: {
        ignoreBuildErrors: false,
        tsconfigPath: './custom-tsconfig.json',
    },
    distDir: '.custom-dist',
};

module.exports = nextConfig;
