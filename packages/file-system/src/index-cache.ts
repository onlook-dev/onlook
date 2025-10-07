import type { TemplateNode } from '@onlook/models';

export interface JsxElementMetadata extends TemplateNode {
    oid: string;
    code: string;
}

// projectId/branchId -> oid -> metadata
const staticMemoryMap = new Map<string, Record<string, JsxElementMetadata>>();
// guard against multiple loads race condition
const loadingPromises = new Map<string, Promise<Record<string, JsxElementMetadata>>>();

export async function getOrLoadIndex(
    cacheKey: string,
    indexPath: string,
    readFile: (path: string) => Promise<string | Uint8Array>
): Promise<Record<string, JsxElementMetadata>> {
    const cached = staticMemoryMap.get(cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    const existingLoad = loadingPromises.get(cacheKey);
    if (existingLoad) {
        return existingLoad;
    }

    const loadPromise = (async () => {
        try {
            const content = await readFile(indexPath);
            const index = JSON.parse(content as string);
            staticMemoryMap.set(cacheKey, index);
            return index;
        } catch (error) {
            console.warn(`[CodeEditorApi] Failed to load index from ${indexPath}, error: ${error}`);
            const emptyIndex = {};
            staticMemoryMap.set(cacheKey, emptyIndex);
            return emptyIndex;
        } finally {
            loadingPromises.delete(cacheKey);
        }
    })();

    loadingPromises.set(cacheKey, loadPromise);
    return loadPromise;
}

export function saveIndexToCache(cacheKey: string, index: Record<string, JsxElementMetadata>): void {
    staticMemoryMap.set(cacheKey, { ...index });
}

export function getIndexFromCache(cacheKey: string): Record<string, JsxElementMetadata> | undefined {
    return staticMemoryMap.get(cacheKey);
}

export function clearIndexCache(cacheKey: string): void {
    staticMemoryMap.delete(cacheKey);
    loadingPromises.delete(cacheKey);
}
