import type { MetadataRoute } from 'next';

const BASE_URL = process.env.APP_URL ?? 'https://onlook.com';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',
                '/auth/',
                '/callback/',
                '/webhook/',
                '/projects/',
                '/project/',
                '/invitation/',
                '/_next/',
                '/_vercel/',
                '/private/',
            ],
            crawlDelay: 1,
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
        host: BASE_URL,
    };
}
