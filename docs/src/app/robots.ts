import type { MetadataRoute } from 'next';

const BASE_URL = process.env.APP_URL ?? 'https://docs.onlook.com';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/_next/', '/_vercel/'],
            crawlDelay: 1,
        },
        sitemap: `${BASE_URL}/sitemap.xml`,
        host: BASE_URL,
    };
}
