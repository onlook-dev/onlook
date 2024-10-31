import * as fs from 'fs/promises';
import * as path from 'path';

export async function scanPagesDirectory(dir: string): Promise<string[]> {
    const pages: string[] = [];

    try {
        // Check common page directories
        const possibleDirs = [
            '', // Root directory
            'pages', // Next.js pages
            'app', // Next.js app directory
            'src/pages', // Common React pattern
            'src/routes', // React Router pattern
        ];

        for (const subDir of possibleDirs) {
            const fullPath = path.join(dir, subDir);
            try {
                await fs.access(fullPath);
                const pagesInDir = await scanDirectory(fullPath);
                pages.push(...pagesInDir);
            } catch {
                // Directory doesn't exist, skip
                continue;
            }
        }

        // Clean up and normalize paths
        return [...new Set(pages)]
            .map((page) => {
                // Remove file extensions
                page = page.replace(/\.(tsx|jsx|js|ts)$/, '');
                // Convert /index to /
                page = page.replace(/\/index$/, '/');
                // Ensure leading slash
                if (!page.startsWith('/')) {
                    page = '/' + page;
                }
                // Remove trailing slash except for root
                if (page !== '/' && page.endsWith('/')) {
                    page = page.slice(0, -1);
                }
                return page;
            })
            .filter((page) => page !== '/404' && page !== '/500') // Filter out error pages
            .sort((a, b) => a.localeCompare(b));
    } catch (error) {
        console.error('Error scanning pages directory:', error);
        return [];
    }
}

async function scanDirectory(dir: string, prefix = ''): Promise<string[]> {
    const pages: string[] = [];

    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // Skip special directories
                if (
                    entry.name.startsWith('_') ||
                    entry.name === 'api' ||
                    entry.name === 'components'
                ) {
                    continue;
                }

                // Recursively scan subdirectories
                const subPages = await scanDirectory(fullPath, `${prefix}/${entry.name}`);
                pages.push(...subPages);
            } else if (entry.isFile()) {
                // Check for valid page files
                const ext = path.extname(entry.name);
                const baseName = path.basename(entry.name, ext);

                if (
                    ['.tsx', '.jsx', '.js', '.ts'].includes(ext) &&
                    !entry.name.startsWith('_') &&
                    (baseName === 'page' || !baseName.includes('.'))
                ) {
                    const pagePath = baseName === 'page' ? prefix : `${prefix}/${baseName}`;

                    pages.push(pagePath);
                }
            }
        }

        return pages;
    } catch (error) {
        console.error(`Error scanning directory ${dir}:`, error);
        return [];
    }
}
