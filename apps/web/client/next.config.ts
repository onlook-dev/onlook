/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'node:path';
import './src/env';

const nextConfig: NextConfig = {
    devIndicators: false,
    // TODO: Remove this once we have a proper ESLint and TypeScript config
    eslint: {
        ignoreDuringBuilds: true,
    }
};

if (process.env.NODE_ENV === 'development') {
    nextConfig.outputFileTracingRoot = path.join(__dirname, '../../..');
}

const withNextIntl = createNextIntlPlugin({
    experimental: {
        createMessagesDeclaration: './messages/en.json'
    }
});
export default withNextIntl(nextConfig);
