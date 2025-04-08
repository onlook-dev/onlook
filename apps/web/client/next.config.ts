/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import "./src/env";

const nextConfig: NextConfig = {
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true
    },
    skipTrailingSlashRedirect: true,
    skipMiddlewareUrlNormalize: true
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);

