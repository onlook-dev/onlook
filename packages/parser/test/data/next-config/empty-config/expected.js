const nextConfig = {
    output: 'standalone',
    distDir: process.env.NODE_ENV === 'production' ? '.next-prod' : '.next',
    typescript: { ignoreBuildErrors: true },
};
module.exports = nextConfig;
