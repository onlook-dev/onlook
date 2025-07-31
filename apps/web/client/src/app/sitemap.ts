import type { MetadataRoute } from 'next';
import { getWebRoutes } from '@/lib/sitemap-utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const routes = await getWebRoutes();
    return routes;
}
