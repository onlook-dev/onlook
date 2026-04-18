import { addFontToCssTheme, removeFontFromCssTheme } from '@onlook/fonts';
import type { Font, RouterConfig } from '@onlook/models';
import type { EditorEngine } from '@/components/store/editor/engine';
import type { SandboxManager } from '@/components/store/editor/sandbox';
import { normalizePath } from '@/components/store/editor/sandbox/helpers';

const GLOBAL_CSS_FILE = 'globals.css';

function rankGlobalCssPath(path: string, routerConfig: RouterConfig): number {
    const normalizedPath = normalizePath(path);

    if (normalizedPath === normalizePath(`${routerConfig.basePath}/${GLOBAL_CSS_FILE}`)) {
        return 0;
    }

    if (normalizedPath === normalizePath(`src/${GLOBAL_CSS_FILE}`)) {
        return 1;
    }

    if (normalizedPath === GLOBAL_CSS_FILE) {
        return 2;
    }

    return 3;
}

export const getGlobalCssPath = async (sandbox: SandboxManager): Promise<string | null> => {
    const routerConfig = await sandbox.getRouterConfig();
    if (!routerConfig) {
        return null;
    }

    const files = await sandbox.listAllFiles();
    const globalCssFiles = files
        .filter(
            (file) =>
                file.type === 'file' &&
                (file.path === GLOBAL_CSS_FILE || file.path.endsWith(`/${GLOBAL_CSS_FILE}`)),
        )
        .sort(
            (a, b) =>
                rankGlobalCssPath(a.path, routerConfig) - rankGlobalCssPath(b.path, routerConfig),
        );

    return globalCssFiles[0]?.path ?? null;
};

const updateGlobalCss = async (
    editorEngine: EditorEngine,
    transform: (css: string) => string,
    errorLabel: string,
): Promise<boolean> => {
    try {
        const sandbox = editorEngine.activeSandbox;
        const cssPath = await getGlobalCssPath(sandbox);
        if (!cssPath) {
            return false;
        }

        const file = await sandbox.readFile(cssPath);
        if (typeof file !== 'string') {
            return false;
        }

        const result = transform(file);
        if (result === file) {
            return true;
        }

        await sandbox.writeFile(cssPath, result);
        return true;
    } catch (error) {
        console.error(errorLabel, error);
        return false;
    }
};

export const addFontToGlobalCss = async (
    font: Font,
    editorEngine: EditorEngine,
): Promise<boolean> => {
    return updateGlobalCss(
        editorEngine,
        (css) => addFontToCssTheme(font, css),
        'Error adding font to global CSS:',
    );
};

export const removeFontFromGlobalCss = async (
    fontId: string,
    editorEngine: EditorEngine,
): Promise<boolean> => {
    return updateGlobalCss(
        editorEngine,
        (css) => removeFontFromCssTheme(fontId, css),
        'Error removing font from global CSS:',
    );
};
