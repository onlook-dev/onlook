import type { Provider } from '@onlook/code-provider';
import { NEXT_JS_FILE_EXTENSIONS, ONLOOK_DEV_PRELOAD_SCRIPT_PATH, ONLOOK_DEV_PRELOAD_SCRIPT_SRC } from '@onlook/constants';
import { RouterType, type RouterConfig } from '@onlook/models';
import { getAstFromContent, getContentFromAst, injectPreloadScript } from '@onlook/parser';
import { isRootLayoutFile, normalizePath } from '@onlook/utility';
import path from 'path';

export async function copyPreloadScriptToPublic(provider: Provider, routerConfig: RouterConfig): Promise<void> {
    try {
        try {
            await provider.createDirectory({ args: { path: 'public' } });
        } catch {
            // Directory might already exist, ignore error
        }

        const scriptResponse = await fetch(ONLOOK_DEV_PRELOAD_SCRIPT_SRC);
        await provider.writeFile({
            args: {
                path: ONLOOK_DEV_PRELOAD_SCRIPT_PATH,
                content: await scriptResponse.text(),
                overwrite: true
            }
        });

        await injectPreloadScriptIntoLayout(provider, routerConfig);
    } catch (error) {
        console.error('[PreloadScript] Failed to copy preload script:', error);
    }
}

export async function injectPreloadScriptIntoLayout(provider: Provider, routerConfig: RouterConfig): Promise<void> {
    if (!routerConfig) {
        throw new Error('Could not detect router type for script injection. This is required for iframe communication.');
    }

    const result = await provider.listFiles({ args: { path: routerConfig.basePath } });
    const [layoutFile] = result.files.filter(file =>
        file.type === 'file' && isRootLayoutFile(`${routerConfig.basePath}/${file.name}`, routerConfig.type)
    );

    if (!layoutFile) {
        throw new Error(`No layout files found in ${routerConfig.basePath}`);
    }

    const layoutPath = `${routerConfig.basePath}/${layoutFile.name}`;

    const layoutResponse = await provider.readFile({ args: { path: layoutPath } });
    if (typeof layoutResponse.file.content !== 'string') {
        throw new Error(`Layout file ${layoutPath} is not a text file`);
    }

    const content = layoutResponse.file.content;
    const ast = getAstFromContent(content);
    if (!ast) {
        throw new Error(`Failed to parse layout file: ${layoutPath}`);
    }

    injectPreloadScript(ast);
    const modifiedContent = await getContentFromAst(ast, content);

    await provider.writeFile({
        args: {
            path: layoutPath,
            content: modifiedContent,
            overwrite: true
        }
    });
}

export async function getLayoutPath(routerConfig: RouterConfig, fileExists: (path: string) => Promise<boolean>): Promise<string | null> {
    if (!routerConfig) {
        console.log('Could not detect Next.js router type');
        return null;
    }

    let layoutFileName: string;

    if (routerConfig.type === RouterType.PAGES) {
        layoutFileName = '_app';
    } else {
        layoutFileName = 'layout';
    }

    for (const extension of NEXT_JS_FILE_EXTENSIONS) {
        const layoutPath = path.join(routerConfig.basePath, `${layoutFileName}${extension}`);
        if (await fileExists(layoutPath)) {
            return normalizePath(layoutPath);
        }
    }

    console.log('Could not find layout file');
    return null;
}