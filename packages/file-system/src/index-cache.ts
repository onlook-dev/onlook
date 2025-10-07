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

    const loadPromise: Promise<Record<string, JsxElementMetadata>> = (async () => {
        try {
            const content = await readFile(indexPath);
            if (typeof content !== 'string') {
                throw new Error('Invalid index file content');
            }
            const index = JSON.parse(content);

            // Only set if no value was written while we were loading
            const existing = staticMemoryMap.get(cacheKey);
            if (existing !== undefined) {
                return existing;
            }
            staticMemoryMap.set(cacheKey, index);
            return index;
        } catch (error) {
            console.warn(`[CodeEditorApi] Failed to load index from ${indexPath}, error: ${error}`);

            // Only set empty if no value was written while we were loading
            const existing = staticMemoryMap.get(cacheKey);
            if (existing !== undefined) {
                return existing;
            }
            const emptyIndex: Record<string, JsxElementMetadata> = {};
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
