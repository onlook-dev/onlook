/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        tsconfigPath: './custom-tsconfig.json',
        typeChecking: true,
    },
};

module.exports = nextConfig;
