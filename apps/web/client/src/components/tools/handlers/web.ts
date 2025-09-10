import { api } from '@/trpc/client';
import {
    type SCRAPE_URL_TOOL_PARAMETERS,
    type WEB_SEARCH_TOOL_PARAMETERS,
    type CLONE_WEBSITE_TOOL_PARAMETERS
} from '@onlook/ai';
import type { CloneWebsiteResult, WebSearchResult } from '@onlook/models';
import { type z } from 'zod';

export async function handleScrapeUrlTool(
    args: z.infer<typeof SCRAPE_URL_TOOL_PARAMETERS>,
): Promise<string> {
    try {
        const result = await api.code.scrapeUrl.mutate({
            url: args.url,
            formats: args.formats,
            onlyMainContent: args.onlyMainContent,
            includeTags: args.includeTags,
            excludeTags: args.excludeTags,
            waitFor: args.waitFor,
        });

        if (!result.result) {
            throw new Error(`Failed to scrape URL: ${result.error}`);
        }

        return result.result;
    } catch (error) {
        console.error('Error scraping URL:', error);
        throw new Error(`Failed to scrape URL ${args.url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export async function handleWebSearchTool(
    args: z.infer<typeof WEB_SEARCH_TOOL_PARAMETERS>,
): Promise<WebSearchResult> {
    try {
        const res = await api.code.webSearch.mutate({
            query: args.query,
            allowed_domains: args.allowed_domains,
            blocked_domains: args.blocked_domains,
        });
        return res
    } catch (error) {
        console.error('Error searching web:', error);
        return {
            result: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export async function handleCloneWebsiteTool(
    args: z.infer<typeof CLONE_WEBSITE_TOOL_PARAMETERS>,
    editorEngine: any,
): Promise<CloneWebsiteResult> {
    // Store args in function scope for error handling
    const requestUrl = args.url;
    const branchId = args.branchId;


    try {
        const result = await api.code.cloneWebsite.mutate({
            url: requestUrl,
        });

        if (!result.result) {
            throw new Error(result.error || 'Failed to clone website');
        }

        const { markdown, html, designScreenshot, designDocument, assets } = result.result;

        // Download assets into public/cloned-assets/
        const baseDir = `public/cloned-assets/`;
        const sandbox = editorEngine.branches.getSandboxById(branchId);
        if (!sandbox) {
            console.warn('Sandbox not found for branch ID:', branchId);
            return {
                result: {
                    markdown: markdown,
                    html: html,
                    designScreenshot: designScreenshot,
                    designDocument: designDocument,
                    assets: assets,
                },
                error: null,
            };
        }
        await sandbox.session.runCommand(`mkdir -p ${baseDir}`);

        for (const asset of assets) {
            
            const rawBase = asset.title;
            const safeBase = rawBase.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '-');
            const filename = safeBase + '.png';
            const dest = `${baseDir}${filename}`;
            try {
                const download = await sandbox.session.runCommand(`curl -L --silent --fail --show-error "${asset.url}" -o "${dest}"`);
                if (download.success) {
                    // Attach saved location (relative public path) for UI usage
                    (asset as any).fileLocation = dest;
                } else {
                    console.log('download failed', download.error);
                    console.warn(`Failed to download asset ${asset.url}:`, download.error);
                }
            } catch (error) {
                console.warn(`Failed to download asset ${asset.url}:`, error);
            }
        }

        return {
            result: {
                markdown: markdown,
                html: html,
                designScreenshot: designScreenshot,
                designDocument: designDocument,
                assets: assets,
            },
            error: null,
        };
    } catch (error) {
        console.error('Error cloning website:', error);
        throw new Error(`Failed to clone website ${requestUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}