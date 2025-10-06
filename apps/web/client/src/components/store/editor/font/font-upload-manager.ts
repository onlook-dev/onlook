import { DefaultSettings } from '@onlook/constants';
import {
    createFontSrcObjects,
    createLocalFontConfig,
    findFontExportDeclaration,
    hasLocalFontImport,
    mergeLocalFontSources,
} from '@onlook/fonts';
import type { FontConfig, FontUploadFile } from '@onlook/models';
import type { T } from '@onlook/parser';
import { t } from '@onlook/parser';
import { getFontFileName, sanitizeFilename } from '@onlook/utility';
import { camelCase } from 'lodash';
import * as pathModule from 'path';
import type { EditorEngine } from '../engine';

/**
 * Uploads font files to the project
 */
export const uploadFonts = async (editorEngine: EditorEngine,
    fontFiles: FontUploadFile[],
    basePath: string,
    fontConfigAst: T.File,
): Promise<{ success: boolean; fontConfigAst: T.File }> => {
    try {
        if (fontFiles.length === 0) {
            return {
                success: false,
                fontConfigAst,
            };
        }
        const baseFontName = fontFiles[0]?.name.split('.')[0] ?? 'custom-font';

        const fontName = camelCase(`custom-${baseFontName}`);

        const { fontNameExists, existingFontNode } = findFontExportDeclaration(
            fontConfigAst,
            fontName,
        );

        const fontConfigs = await processFontFiles(editorEngine, fontFiles, baseFontName, basePath);
        const fontsSrc = createFontSrcObjects(fontConfigs);

        await updateAstWithFontConfig(
            fontConfigAst,
            fontName,
            fontsSrc,
            fontNameExists,
            existingFontNode,
        );

        return {
            success: true,
            fontConfigAst,
        };
    } catch (error) {
        console.error('Error uploading fonts:', error);
        return {
            success: false,
            fontConfigAst,
        };
    }
}

/**
 * Processes font files and saves them to the project
 */
export const processFontFiles = async (
    editorEngine: EditorEngine,
    fontFiles: FontUploadFile[],
    baseFontName: string,
    basePath: string,
): Promise<FontConfig[]> => {
    return Promise.all(
        fontFiles.map(async (fontFile) => {
            const weight = fontFile.weight;
            const style = fontFile.style.toLowerCase();
            const fileName = getFontFileName(baseFontName, weight, style);
            
            const sanitizedOriginalName = sanitizeFilename(fontFile.file.name);
            const fileExtension = sanitizedOriginalName.split('.').pop();
            
            const filePath = pathModule.join(
                basePath,
                DefaultSettings.FONT_FOLDER,
                `${fileName}.${fileExtension}`,
            );

            const buffer = Buffer.from(fontFile.file.buffer);
            await editorEngine.activeSandbox.writeFile(filePath, buffer);

            return {
                path: pathModule.posix.join('./fonts', `${fileName}.${fileExtension}`),
                weight,
                style,
            };
        }),
    );
}

/**
 * Updates AST with font configuration
 */
export const updateAstWithFontConfig = async (
    ast: T.File,
    fontName: string,
    fontsSrc: T.ObjectExpression[],
    fontNameExists: boolean,
    existingFontNode: T.ExportNamedDeclaration | null,
): Promise<void> => {
    const hasImport = hasLocalFontImport(ast);
    if (fontNameExists && existingFontNode) {
        mergeLocalFontSources(ast, existingFontNode, fontName, fontsSrc);
    } else {
        createLocalFontConfig(ast, fontName, fontsSrc);

        if (!hasImport) {
            const importDeclaration = t.importDeclaration(
                [t.importDefaultSpecifier(t.identifier('localFont'))],
                t.stringLiteral('next/font/local'),
            );
            ast.program.body.unshift(importDeclaration);
        }
    }
}
