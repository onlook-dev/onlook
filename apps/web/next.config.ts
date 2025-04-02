/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import "./src/env";

const nextConfig: NextConfig = {};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);

