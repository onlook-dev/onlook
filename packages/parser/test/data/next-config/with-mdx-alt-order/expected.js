import mdx from '@next/mdx';

/** @type {import('next').NextConfig} */
const somethingElse = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  transpilePackages: ['next-mdx-remote'],
  sassOptions: {
    compiler: 'modern',
    silenceDeprecations: ['legacy-js-api']
  }
};

const withMDX = mdx({
  extension: /\\.mdx?$/,
  options: {}, output: "standalone", distDir: process.env.NODE_ENV === "production" ? ".next-prod" : ".next", typescript: { ignoreBuildErrors: true }, eslint: { ignoreDuringBuilds: true }
});

export default withMDX(somethingElse);