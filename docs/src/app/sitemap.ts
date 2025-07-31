import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();
    const BASE_URL = process.env.APP_URL ?? 'https://docs.onlook.com';

    return [
        {
            url: BASE_URL,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
    ];
}
