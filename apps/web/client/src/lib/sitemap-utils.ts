import { readdir } from 'fs/promises';
import { join } from 'path';
import type { MetadataRoute } from 'next';

const BASE_URL = process.env.APP_URL ?? 'https://onlook.com';
const EXCLUDED_PATTERNS = [
    '/api/',
    '/auth/',
    '/callback/',
    '/webhook/',
    '/projects/',
    '/project/',
    '/invitation/',
    '/_',
];

async function scanAppDirectory(
    dir: string,
    basePath = '',
    excludedPatterns: string[],
): Promise<string[]> {
    const routes: string[] = [];

    try {
        const entries = await readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            const routePath = join(basePath, entry.name);

            if (entry.isDirectory()) {
                if (
                    entry.name.startsWith('_') ||
                    entry.name.startsWith('(') ||
                    entry.name.startsWith('[')
                ) {
                    continue;
                }

                const subRoutes = await scanAppDirectory(fullPath, routePath, excludedPatterns);
                routes.push(...subRoutes);
            } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
                let route = basePath === '' ? '/' : basePath.replace(/\\/g, '/');

                if (!route.startsWith('/')) {
                    route = '/' + route;
                }

                const shouldExclude = excludedPatterns.some((pattern) => route.startsWith(pattern));

                if (!shouldExclude) {
                    routes.push(route);
                }
            }
        }
    } catch (error) {
        console.warn(`Failed to scan directory ${dir}:`, error);
    }

    return routes;
}

function getRouteMetadata(route: string) {
    const routeConfig = {
        '/': { priority: 1.0, changeFrequency: 'daily' as const },
        '/pricing': { priority: 0.9, changeFrequency: 'weekly' as const },
        '/about': { priority: 0.9, changeFrequency: 'weekly' as const },
        '/faq': { priority: 0.7, changeFrequency: 'weekly' as const },
        '/login': { priority: 0.6, changeFrequency: 'monthly' as const },
        '/terms-of-service': { priority: 0.5, changeFrequency: 'monthly' as const },
        '/sitemap': { priority: 0.3, changeFrequency: 'monthly' as const },
    } as const;

    return (
        routeConfig[route as keyof typeof routeConfig] ?? {
            priority: 0.5,
            changeFrequency: 'monthly' as const,
        }
    );
}

export async function getWebRoutes(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    const appDir = join(process.cwd(), 'src', 'app');
    const discoveredRoutes = await scanAppDirectory(appDir, '', EXCLUDED_PATTERNS);

    const sitemapRoutes = discoveredRoutes.map((route) => {
        const { priority, changeFrequency } = getRouteMetadata(route);

        return {
            url: `${BASE_URL}${route}`,
            lastModified: now,
            changeFrequency,
            priority,
        };
    });

    return sitemapRoutes;
}
