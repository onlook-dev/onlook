module.exports = (phase, { defaultConfig }) => {
    /** @type {import('next').NextConfig} */
    const nextConfig = {
        ...defaultConfig,
        reactStrictMode: true,
    }
    return nextConfig
} 