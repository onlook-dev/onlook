import mdx from '@next/mdx';

const withMDX = mdx({
  extension: /\\.mdx?$/,
  options: {}
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  transpilePackages: ['next-mdx-remote'],
  sassOptions: {
    compiler: 'modern',
    silenceDeprecations: ['legacy-js-api']
  }, output: "standalone", distDir: process.env.NODE_ENV === "production" ? ".next-prod" : ".next", typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }
};

export default withMDX(nextConfig);