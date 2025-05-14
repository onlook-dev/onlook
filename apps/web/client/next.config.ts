/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import './src/env';

const nextConfig: NextConfig = {
    devIndicators: false,
    // TODO: Remove this once we have a proper ESLint and TypeScript config
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
