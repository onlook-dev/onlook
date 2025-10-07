import {
    addGoogleFontSpecifier,
    generateFontVariableExport,
    migrateFontsFromLayout,
    parseFontDeclarations,
    removeFontDeclaration,
    validateGoogleFontSetup,
} from '@onlook/fonts';
import type { CodeDiff, Font } from '@onlook/models';
import { RouterType } from '@onlook/models';
import type { T } from '@onlook/parser';
import { generate, getAstFromContent, t } from '@onlook/parser';
import { camelCase } from 'lodash';
import type { EditorEngine } from '../engine';
import { normalizePath } from '../sandbox/helpers';

export const scanFontConfig = async (fontConfigPath: string, editorEngine: EditorEngine): Promise<Font[]> => {
    try {
        const file = await readFontConfigFile(fontConfigPath, editorEngine);
        if (!file) {
            return [];
        }

        const fonts = parseFontDeclarations(file.content);
        return fonts;
    } catch (error) {
        console.error('Error scanning fonts:', error);
        return [];
    }
}

/**
 * Scan existing fonts declaration in the layout file and move them to the font config file
 */
export const scanExistingFonts = async (layoutPath: string, editorEngine: EditorEngine): Promise<Font[] | undefined> => {
    const sandbox = editorEngine.activeSandbox;
    if (!sandbox) {
        console.error('No sandbox session found');
        return;
    }

    const normalizedLayoutPath = normalizePath(layoutPath);

    try {
        const file = await sandbox.readFile(normalizedLayoutPath);
        if (typeof file !== 'string') {
            console.log(`Layout file is not text: ${layoutPath}`);
            return [];
        }

        const result = migrateFontsFromLayout(file);

        if (result.fonts.length > 0) {
            await sandbox.writeFile(normalizedLayoutPath, result.layoutContent);
        }
        return result.fonts;
    } catch (error) {
        console.error('Error scanning existing fonts:', error);
        return [];
    }
}

/**
 * Adds a new font to the font configuration file
 */
export const addFontToConfig = async (font: Font, fontConfigPath: string, editorEngine: EditorEngine): Promise<boolean> => {
    try {
        // Convert the font family to the import name format (Pascal case, no spaces)
        const importName = font.family.replace(/\s+/g, '_');
        const fontName = camelCase(font.id);

        await ensureFontConfigFileExists(fontConfigPath, editorEngine);

        const fontConfig = await readFontConfigFile(fontConfigPath, editorEngine);
        if (!fontConfig) {
            console.error('Failed to read font config file');
            return false;
        }

        const { ast, content } = fontConfig;

        // Check if the font already exists in the font config file
        const { hasGoogleFontImport, hasImportName, hasFontExport } = validateGoogleFontSetup(
            content,
            importName,
            fontName,
        );

        if (hasFontExport) {
            console.log(`Font ${fontName} already exists in font.ts`);
            return false;
        }

        // Add the font declaration to the font config file
        const exportDeclaration: T.ExportNamedDeclaration = generateFontVariableExport(font);
        ast.program.body.push(exportDeclaration);

        // Add or update the import if needed
        if (!hasGoogleFontImport) {
            const importDeclaration = t.importDeclaration(
                [t.importSpecifier(t.identifier(importName), t.identifier(importName))],
                t.stringLiteral('next/font/google'),
            );
            ast.program.body.unshift(importDeclaration);
        } else if (!hasImportName) {
            addGoogleFontSpecifier(ast, importName);
        }

        // Generate and write the updated code back to the file
        const { code } = generate(ast);

        await editorEngine.activeSandbox.writeFile(
            fontConfigPath,
            code,
        );

        return true;
    } catch (error) {
        console.error(
            'Error adding font:',
            error instanceof Error ? error.message : String(error),
        );
        return false;
    }
}

/**
 * Removes a font from the font configuration file
 */
export const removeFontFromConfig = async (font: Font, fontConfigPath: string, editorEngine: EditorEngine): Promise<CodeDiff | false> => {
    try {
        const { content } = (await readFontConfigFile(fontConfigPath, editorEngine)) ?? {};
        if (!content) {
            return false;
        }

        const { removedFont, fontFilesToDelete, ast } = removeFontDeclaration(font, content);

        if (removedFont) {
            const { code } = generate(ast);

            const codeDiff: CodeDiff = {
                original: content,
                generated: code,
                path: fontConfigPath,
            };

            await editorEngine.activeSandbox.writeFile(
                fontConfigPath,
                code,
            );
            // Delete font files if this is a custom font
            if (fontFilesToDelete.length > 0) {
                const routerConfig = await editorEngine.activeSandbox.getRouterConfig();
                if (!routerConfig?.basePath) {
                    console.error('Could not get base path');
                    return false;
                }

                await Promise.all(
                    fontFilesToDelete.map((file) =>
                        editorEngine.activeSandbox.deleteFile(
                            normalizePath(routerConfig.basePath + '/' + file),
                        ),
                    ),
                );
            }

            return codeDiff;
        } else {
            console.error(`Font ${font.id} not found in font.ts`);
            return false;
        }
    } catch (error) {
        console.error('Error removing font:', error);
        return false;
    }
}

/**
 * Reads the font configuration file
 */
export const readFontConfigFile = async (fontConfigPath: string, editorEngine: EditorEngine): Promise<
    | {
        ast: T.File;
        content: string;
    }
    | undefined
> => {
    const codeEditor = editorEngine.fileSystem;

    // Ensure the font config file exists, create it if it doesn't
    await ensureFontConfigFileExists(fontConfigPath, editorEngine);

    const file = await codeEditor.readFile(fontConfigPath);
    if (typeof file !== 'string') {
        console.error("Font config file is not text");
        return;
    }
    const content = file;

    // Parse the file content using Babel
    const ast = getAstFromContent(content);
    if (!ast) {
        throw new Error('Failed to parse font config file');
    }

    return {
        ast,
        content,
    };
}

/**
 * Creates a default font configuration file template
 */
const createDefaultFontConfigTemplate = (): string => {
    return `// This file contains font configurations for your application.
// Fonts added through Onlook will be automatically exported from this file.
//
// Example Google Font:
// import { Inter } from 'next/font/google';
// 
// export const inter = Inter({
//   subsets: ['latin'],
//   weight: ['400', '700'],
//   style: ['normal'],
//   variable: '--font-inter',
//   display: 'swap'
// });
//
// Example Local Font:
// import localFont from 'next/font/local';
//
// export const customFont = localFont({
//   src: [
//     { path: './fonts/custom-regular.woff2', weight: '400', style: 'normal' },
//     { path: './fonts/custom-bold.woff2', weight: '700', style: 'normal' }
//   ],
//   variable: '--font-custom',
//   display: 'swap',
//   fallback: ['system-ui', 'sans-serif'],
//   preload: true
// });
`;
}

/**
 * Ensures the font configuration file exists
 */
export const ensureFontConfigFileExists = async (fontConfigPath: string, editorEngine: EditorEngine): Promise<void> => {
    const codeEditor = editorEngine.fileSystem;
    const fontConfigExists = await codeEditor.fileExists(fontConfigPath);
    if (!fontConfigExists) {
        const template = createDefaultFontConfigTemplate();
        await codeEditor.writeFile(fontConfigPath, template);
    }
}

/**
 * Updates the font config path based on the detected router configuration
 */
export const getFontConfigPath = async (editorEngine: EditorEngine): Promise<string | null> => {
    const routerConfig = await editorEngine.activeSandbox.getRouterConfig();

    if (routerConfig) {
        let fontConfigPath: string;
        if (routerConfig.type === RouterType.APP) {
            fontConfigPath = normalizePath(`${routerConfig.basePath}/fonts.ts`);
        } else {
            // For pages router, place fonts.ts in the appropriate directory
            if (routerConfig.basePath.startsWith('src/')) {
                fontConfigPath = normalizePath('src/fonts.ts');
            } else {
                fontConfigPath = normalizePath('fonts.ts');
            }
        }
        return fontConfigPath;
    } else {
        console.error('Could not get router config');
        return null;
    }
}

