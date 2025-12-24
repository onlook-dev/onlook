import mdx from '@next/mdx';

const withMDX = mdx({
    extension: /\\.mdx?$/,
    options: {},
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
    transpilePackages: ['next-mdx-remote'],
    sassOptions: {
        compiler: 'modern',
        silenceDeprecations: ['legacy-js-api'],
    },
};

export default withMDX(nextConfig);
