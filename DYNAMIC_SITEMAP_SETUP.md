# Dynamic Sitemap Setup for Next.js App Router

This document explains how to implement automatic sitemap generation using the official Next.js App Router metadata file conventions for dynamic sitemap and robots.txt generation.

## Overview

The dynamic sitemap system automatically:

- Uses Next.js built-in `sitemap.ts` and `robots.ts` file conventions
- Scans the `src/app` directory for `page.tsx` files
- Converts discovered pages to sitemap entries
- Assigns appropriate SEO priorities and change frequencies
- Excludes protected/private routes
- Provides fallback routes if scanning fails
- Follows official Next.js metadata route standards

## Implementation

### 1. Create the Robots.txt File

Create `src/app/robots.ts` using the official Next.js `MetadataRoute.Robots` type:

```typescript
import type { MetadataRoute } from 'next';

const BASE_URL = process.env.APP_URL ?? 'https://yourdomain.com';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',
                '/account/',
                '/admin/',
                '/workbench/',
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
```

### 2. Create the Sitemap Entry Point

Create `src/app/sitemap.ts` using the official Next.js `MetadataRoute.Sitemap` type:

```typescript
import type { MetadataRoute } from 'next';
import { getAllRoutes } from '@/lib/sitemap-utils';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    try {
        // Dynamically generate sitemap from static routes and database content
        const routes = await getAllRoutes();
        return routes;
    } catch (error) {
        console.error('Failed to generate sitemap:', error);

        // Fallback to basic static routes if dynamic generation fails
        const BASE_URL = process.env.APP_URL ?? 'https://yourdomain.com';
        const now = new Date();

        return [
            {
                url: BASE_URL,
                lastModified: now,
                changeFrequency: 'daily',
                priority: 1.0,
            },
            {
                url: `${BASE_URL}/login`,
                lastModified: now,
                changeFrequency: 'monthly',
                priority: 0.6,
            },
        ];
    }
}
```

### 3. Create the Sitemap Utilities

Create `src/lib/sitemap-utils.ts`:

```typescript
import { readdir } from 'fs/promises';
import { join } from 'path';
import type { MetadataRoute } from 'next';

// For Web Client (onlook.com)
const WEB_BASE_URL = 'https://onlook.com';
const WEB_EXCLUDED_ROUTES = [
    '/api',
    '/auth',
    '/callback',
    '/webhook',
    '/projects', // User dashboard
    '/_next',
    '/_vercel',
    '/_components',
];

const WEB_EXCLUDED_PATTERNS = [
    '/project/', // Dynamic user project routes
    '/invitation/', // Private invitation routes
    '/api/',
    '/auth/',
    '/callback/',
    '/webhook/',
    '/_',
];

// For Docs (docs.onlook.dev)
const DOCS_BASE_URL = 'https://docs.onlook.dev';
const DOCS_EXCLUDED_ROUTES = ['/api', '/_next', '/_vercel'];

const DOCS_EXCLUDED_PATTERNS = ['/api/', '/_'];

// Routes that start with these patterns should be excluded (dynamic/protected routes)
const EXCLUDED_PATTERNS = ['/workbench/', '/api/', '/account/', '/admin/', '/_'];

/**
 * Recursively scans the app directory for page.tsx files
 */
async function scanAppDirectory(
  dir: string,
  basePath = '',
  excludedRoutes: string[],
  excludedPatterns: string[]
): Promise<string[]> {
  const routes: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const routePath = join(basePath, entry.name);

      if (entry.isDirectory()) {
        // Skip private directories, route groups, and dynamic routes
        if (entry.name.startsWith('_') ||
            entry.name.startsWith('(') ||
            entry.name.startsWith('[') ||
            excludedRoutes.some(excluded => entry.name === excluded.replace('/', ''))) {
          continue;
        }

        // Recursively scan subdirectories
        const subRoutes = await scanAppDirectory(fullPath, routePath, excludedRoutes, excludedPatterns);
        routes.push(...subRoutes);
      } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
        // Found a page file, add the route
        let route = basePath === '' ? '/' : basePath.replace(/\\/g, '/');

        // Ensure route starts with /
        if (!route.startsWith('/')) {
          route = '/' + route;
        }

        // Skip excluded routes and patterns
        const shouldExclude = excludedRoutes.includes(route) ||
                            excludedPatterns.some(pattern => route.startsWith(pattern));

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

                // Recursively scan subdirectories
                const subRoutes = await scanAppDirectory(fullPath, routePath);
                routes.push(...subRoutes);
            } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
                // Found a page file, add the route
                let route = basePath === '' ? '/' : basePath.replace(/\\/g, '/');

                // Ensure route starts with /
                if (!route.startsWith('/')) {
                    route = '/' + route;
                }

                // Skip excluded routes and patterns
                const shouldExclude =
                    EXCLUDED_ROUTES.includes(route) ||
                    EXCLUDED_PATTERNS.some((pattern) => route.startsWith(pattern));

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

/**
 * Determines SEO priority and change frequency for a route
 */
function getWebRouteMetadata(route: string) {
    // Homepage gets highest priority
    if (route === '/') {
        return { priority: 1.0, changeFrequency: 'daily' as const };
    }

    // Important marketing pages
    if (route === '/pricing' || route === '/about') {
        return { priority: 0.9, changeFrequency: 'weekly' as const };
    }

    // FAQ and support pages
    if (route === '/faq') {
        return { priority: 0.7, changeFrequency: 'weekly' as const };
    }

    // Authentication pages
    if (route === '/login') {
        return { priority: 0.6, changeFrequency: 'monthly' as const };
    }

    // Legal pages
    if (route === '/privacy-policy' || route === '/terms-of-service') {
        return { priority: 0.5, changeFrequency: 'monthly' as const };
    }

    // Sitemap page
    if (route === '/sitemap') {
        return { priority: 0.3, changeFrequency: 'monthly' as const };
    }

    // Default for other public pages
    return { priority: 0.5, changeFrequency: 'monthly' as const };
}

function getDocsRouteMetadata(route: string) {
    // Docs homepage gets highest priority
    if (route === '/') {
        return { priority: 1.0, changeFrequency: 'daily' as const };
    }

    // All documentation pages get high priority
    return { priority: 0.8, changeFrequency: 'weekly' as const };
}
/**
 * Gets all public routes for web client by scanning the app directory
 */
export async function getWebRoutes(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  try {
    // Scan the app directory for all public pages
    const appDir = join(process.cwd(), 'src', 'app');
    const discoveredRoutes = await scanAppDirectory(appDir, '', WEB_EXCLUDED_ROUTES, WEB_EXCLUDED_PATTERNS);

    // Convert discovered routes to sitemap format
    const sitemapRoutes = discoveredRoutes.map(route => {
      const { priority, changeFrequency } = getWebRouteMetadata(route);

      return {
        url: `${WEB_BASE_URL}${route}`,
        lastModified: now,
        changeFrequency,
        priority,
      };
    });

    return sitemapRoutes;
  } catch (error) {
    console.warn('Failed to scan app directory, using fallback routes:', error);

    // Fallback to basic static routes if scanning fails
    return [
      {
        url: WEB_BASE_URL,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${WEB_BASE_URL}/about`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${WEB_BASE_URL}/pricing`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.9,
      },
      {
        url: `${WEB_BASE_URL}/login`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.6,
      },
    ];
  }
}

/**
 * Gets all public routes for docs by scanning the app directory
 */
export async function getDocsRoutes(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  try {
    // For docs, we need to handle the [[...slug]] catch-all route differently
    // This would require integration with the docs content system
    const appDir = join(process.cwd(), 'src', 'app');
    const discoveredRoutes = await scanAppDirectory(appDir, '', DOCS_EXCLUDED_ROUTES, DOCS_EXCLUDED_PATTERNS);

    // Convert discovered routes to sitemap format
    const sitemapRoutes = discoveredRoutes.map(route => {
      const { priority, changeFrequency } = getDocsRouteMetadata(route);

      return {
        url: `${DOCS_BASE_URL}${route}`,
        lastModified: now,
        changeFrequency,
        priority,
      };
    });

    return sitemapRoutes;
  } catch (error) {
    console.warn('Failed to scan app directory, using fallback routes:', error);

    // Fallback to basic static routes if scanning fails
    return [
      {
        url: DOCS_BASE_URL,
        lastModified: now,
        changeFrequency: 'daily',
        priority: 1.0,
      },
    ];
  }
}
}
```

## How It Works

### 1. Next.js Metadata Route Integration

- Uses official Next.js `robots.ts` and `sitemap.ts` file conventions
- Files are automatically cached by Next.js unless using Dynamic APIs
- Both files export default functions that return the appropriate metadata types
- Next.js automatically serves these at `/robots.txt` and `/sitemap.xml`

### 2. Robots.txt Integration

- The `robots.ts` file automatically references the dynamic sitemap at `/sitemap.xml`
- Disallow rules in robots.txt should match the exclusion patterns in sitemap generation
- Both use the same `BASE_URL` environment variable for consistency
- Supports multiple user agents and complex rule configurations

### 3. Automatic Page Discovery

- The system scans `src/app` recursively for `page.tsx` and `page.ts` files
- Each discovered page file becomes a route in the sitemap
- Directory structure maps directly to URL structure
- Supports Next.js App Router conventions (route groups, dynamic routes, etc.)

### 4. Route Filtering

- **Excluded directories**: `_next`, `_vercel`, `api`, `account`, `admin`, `workbench`
- **Excluded patterns**: Routes starting with `_`, `(`, `[` (Next.js conventions)
- **Custom exclusions**: Add specific routes to `EXCLUDED_ROUTES` array
- **Dynamic routes**: Automatically excluded from static sitemap (can be added programmatically)

### 5. SEO Optimization

- **Priority assignment**: Homepage (1.0), marketing pages (0.9), auth (0.6), docs (0.7), others (0.5)
- **Change frequency**: Daily for homepage, weekly for marketing/docs, monthly for others
- **Last modified**: Uses current timestamp for all routes (can be customized per route)
- **Localization support**: Can include alternate language versions

### 6. Error Handling

- Graceful fallback to basic static routes if file system scanning fails
- Console warnings for individual directory scan failures
- Continues processing other routes if one fails
- Next.js handles caching and performance optimization automatically

## Benefits

1. **Official Next.js Support**: Uses built-in metadata file conventions with automatic caching and optimization
2. **Zero maintenance**: New pages automatically appear in sitemap and robots.txt stays in sync
3. **SEO optimized**: Appropriate priorities and change frequencies with proper robots.txt directives
4. **Secure**: Automatically excludes private/protected routes from both sitemap and robots.txt
5. **Resilient**: Fallback mechanism prevents sitemap failures
6. **Consistent**: Robots.txt disallow rules match sitemap exclusions
7. **Customizable**: Easy to modify exclusion rules and SEO metadata
8. **Performance**: Next.js automatically caches sitemap and robots.txt responses
9. **Standards Compliant**: Follows official Sitemaps XML format and Robots Exclusion Standard

## Customization for Onlook Monorepo

When implementing for Onlook's monorepo structure, customize these areas:

### For Main Site (onlook.com):

1. **BASE_URL**: Set to `https://onlook.com` (already configured in layout.tsx)
2. **EXCLUDED_ROUTES**:
    - `/api/` (API routes)
    - `/auth/` (auth callbacks)
    - `/callback/` (payment callbacks)
    - `/webhook/` (webhooks)
    - `/project/[id]/` (user-specific project pages)
    - `/invitation/[id]/` (private invitation pages)
    - `/projects/` (user dashboard - requires auth)
3. **INCLUDED_PUBLIC_ROUTES**:
    - `/` (homepage - priority 1.0)
    - `/about` (priority 0.9)
    - `/pricing` (priority 0.9)
    - `/faq` (priority 0.7)
    - `/login` (priority 0.6)
    - `/privacy-policy` (priority 0.5)
    - `/terms-of-service` (priority 0.5)
    - `/sitemap` (priority 0.3)
4. **External references**: Update constants.ts DOCS reference from `docs.onlook.com` to `docs.onlook.dev`

### For Docs Site (docs.onlook.dev):

1. **BASE_URL**: Set to `https://docs.onlook.dev` (already configured in layout.tsx)
2. **Replace next-sitemap**: Remove `next-sitemap` package and config, remove postbuild script
3. **Replace robots route handler**: Replace `/robots.txt/route.ts` with `robots.ts` file
4. **EXCLUDED_ROUTES**: Keep `/api/` excluded (search API)
5. **Dynamic route handling**: Handle `[[...slug]]` catch-all route for documentation pages
6. **Fallback routes**: Include docs homepage and main sections

### Monorepo Considerations:

1. **Independent sitemaps**: Each app generates its own sitemap for its domain
2. **Shared utilities**: Consider creating shared sitemap utilities in `/packages`
3. **Cross-references**: Main site robots.txt could reference docs sitemap
4. **Build coordination**: Each app builds independently with its own sitemap

### Important: Keep Robots.txt and Sitemap in Sync

The disallow rules in `robots.ts` should match the exclusion patterns in `sitemap-utils.ts`:

```typescript
// In robots.ts
disallow: ['/api/', '/account/', '/admin/', '/workbench/', '/_next/', '/_vercel/', '/private/'];

// Should match EXCLUDED_ROUTES and EXCLUDED_PATTERNS in sitemap-utils.ts
const EXCLUDED_ROUTES = [
    '/api',
    '/account',
    '/admin',
    '/_next',
    '/_vercel',
    '/private',
    '/workbench',
];
const EXCLUDED_PATTERNS = ['/workbench/', '/api/', '/account/', '/admin/', '/_'];
```

## Environment Variables

Set `APP_URL` in your environment:

```bash
APP_URL=https://onlook.dev
```

## Testing

After implementation:

1. Visit `/robots.txt` to see generated robots file with sitemap reference
2. Visit `/sitemap.xml` to see generated sitemap
3. Add new pages and verify they appear automatically in sitemap
4. Check that private routes are properly excluded from both robots.txt and sitemap
5. Validate SEO priorities match your site structure
6. Verify robots.txt disallow rules match sitemap exclusions

## Migration from Static Sitemaps

### For Docs App (currently using next-sitemap):

1. **Remove next-sitemap**: Uninstall `next-sitemap` package from package.json
2. **Delete config**: Remove `next-sitemap.config.js` file
3. **Remove build script**: Remove `"postbuild": "next-sitemap"` from package.json
4. **Replace route handler**: Replace `/robots.txt/route.ts` with `robots.ts` file
5. **Add sitemap.ts**: Create new `sitemap.ts` file using official Next.js conventions
6. **Test thoroughly**: Verify `/robots.txt` and `/sitemap.xml` work correctly

### For Web Client App (currently no sitemap):

1. **Create robots.ts**: Add robots.txt generation for main site
2. **Create sitemap.ts**: Add sitemap generation for all public pages
3. **Add utilities**: Create sitemap-utils.ts for page discovery
4. **Configure exclusions**: Exclude user-specific routes like `/project/[id]/`
5. **Test thoroughly**: Verify both files are served correctly

### General Migration Steps:

1. Delete any static `public/robots.txt` files (Next.js will use the dynamic ones)
2. Update any hardcoded sitemap references in external tools
3. Verify robots.txt is now dynamically generated and includes sitemap reference
4. Test in development and staging before deploying to production

## File Structure

After implementation, your file structure should include:

### For Web Client App:

```
apps/web/client/src/
  app/
    robots.ts          # Dynamic robots.txt generation
    sitemap.ts         # Dynamic sitemap.xml generation
  lib/
    sitemap-utils.ts   # Sitemap generation utilities
```

### For Docs App:

```
docs/src/
  app/
    robots.ts          # Dynamic robots.txt generation (replaces route handler)
    sitemap.ts         # Dynamic sitemap.xml generation (replaces next-sitemap)
  lib/
    sitemap-utils.ts   # Sitemap generation utilities
```

### Optional Shared Package:

```
packages/sitemap/
  src/
    utils.ts           # Shared sitemap utilities
    types.ts           # Shared types
  package.json
```

Both `/robots.txt` and `/sitemap.xml` will be automatically available at each domain root:

- `https://onlook.com/robots.txt` and `https://onlook.com/sitemap.xml`
- `https://docs.onlook.dev/robots.txt` and `https://docs.onlook.dev/sitemap.xml`

## Special Considerations for Docs App

The docs app uses a `[[...slug]]` catch-all route which requires special handling:

### Option 1: Integration with Fumadocs

```typescript
// docs/src/lib/sitemap-utils.ts
import { source } from '@/lib/source';

export async function getDocsRoutes(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    try {
        // Get all pages from Fumadocs source
        const pages = source.getPages();

        const sitemapRoutes = pages.map((page) => ({
            url: `${DOCS_BASE_URL}${page.url}`,
            lastModified: now,
            changeFrequency: 'weekly' as const,
            priority: 0.8,
        }));

        // Add homepage
        sitemapRoutes.unshift({
            url: DOCS_BASE_URL,
            lastModified: now,
            changeFrequency: 'daily' as const,
            priority: 1.0,
        });

        return sitemapRoutes;
    } catch (error) {
        console.warn('Failed to get docs pages, using fallback:', error);
        return [
            {
                url: DOCS_BASE_URL,
                lastModified: now,
                changeFrequency: 'daily',
                priority: 1.0,
            },
        ];
    }
}
```

### Option 2: Simple Fallback (Recommended for Initial Implementation)

```typescript
// docs/src/app/sitemap.ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    const now = new Date();

    return [
        {
            url: 'https://docs.onlook.dev',
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        // Add other known documentation sections manually
        {
            url: 'https://docs.onlook.dev/docs',
            lastModified: now,
            changeFrequency: 'weekly',
            priority: 0.8,
        },
    ];
}
```

## Advanced Features

### Multiple Sitemaps

For large applications, you can split sitemaps using `generateSitemaps`:

```typescript
// app/product/sitemap.ts
import type { MetadataRoute } from 'next';

export async function generateSitemaps() {
    // Return array of sitemap IDs
    return [{ id: 0 }, { id: 1 }, { id: 2 }];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
    // Generate sitemap for specific ID
    const start = id * 50000;
    const end = start + 50000;
    // ... fetch and return routes
}
```

### Image and Video Sitemaps

Add images and videos to sitemap entries:

```typescript
export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://onlook.com/features',
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
            images: ['https://onlook.com/feature-screenshot.jpg'],
            videos: [
                {
                    title: 'Onlook Demo',
                    thumbnail_loc: 'https://onlook.com/demo-thumb.jpg',
                    description: 'See Onlook in action',
                },
            ],
        },
    ];
}
```

### Localized Sitemaps

For internationalized sites:

```typescript
export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://onlook.com',
            lastModified: new Date(),
            alternates: {
                languages: {
                    es: 'https://onlook.com/es',
                    fr: 'https://onlook.com/fr',
                },
            },
        },
    ];
}
```

### Complex Robots Rules

For different user agents:

```typescript
export default function robots(): MetadataRoute.Robots {
    return {
        rules: [
            {
                userAgent: 'Googlebot',
                allow: ['/'],
                disallow: '/private/',
            },
            {
                userAgent: ['Applebot', 'Bingbot'],
                disallow: ['/'],
            },
        ],
        sitemap: 'https://onlook.com/sitemap.xml',
    };
}
```

## Implementation Checklist

### Pre-Implementation Audit ✅

- [x] Identified all page routes in web client (18 routes found)
- [x] Identified all page routes in docs (catch-all route structure)
- [x] Confirmed domain configurations (onlook.com, docs.onlook.dev)
- [x] Identified routes to exclude (auth, API, user-specific)
- [x] Determined SEO priorities based on page importance
- [x] Confirmed Next.js App Router structure compatibility

### Web Client Implementation Tasks

- [ ] Create `apps/web/client/src/app/robots.ts`
- [ ] Create `apps/web/client/src/app/sitemap.ts`
- [ ] Create `apps/web/client/src/lib/sitemap-utils.ts`
- [ ] Fix constants.ts reference from `docs.onlook.com` to `docs.onlook.dev`
- [ ] Test `/robots.txt` and `/sitemap.xml` endpoints
- [ ] Verify excluded routes are not in sitemap
- [ ] Verify included routes have correct priorities

### Docs Implementation Tasks

- [ ] Remove `next-sitemap` from package.json dependencies
- [ ] Remove `next-sitemap.config.js` file
- [ ] Remove `"postbuild": "next-sitemap"` from package.json scripts
- [ ] Replace `src/app/robots.txt/route.ts` with `src/app/robots.ts`
- [ ] Create `src/app/sitemap.ts` (start with simple fallback)
- [ ] Test `/robots.txt` and `/sitemap.xml` endpoints
- [ ] Consider future integration with Fumadocs source for dynamic pages

### Testing & Validation

- [ ] Verify both apps serve robots.txt correctly
- [ ] Verify both apps serve sitemap.xml correctly
- [ ] Check sitemap XML format validity
- [ ] Confirm robots.txt references correct sitemap URLs
- [ ] Test in development and staging environments
- [ ] Validate SEO tool compatibility (Google Search Console)

### Post-Implementation

- [ ] Update any external references to old sitemap URLs
- [ ] Monitor search engine indexing
- [ ] Consider adding sitemap submission to CI/CD pipeline
