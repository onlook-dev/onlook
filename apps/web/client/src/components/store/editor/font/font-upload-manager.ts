import type { ParseResult } from '@babel/parser';
import * as t from '@babel/types';
import { DefaultSettings } from '@onlook/constants';
import {
    createLocalFontConfig,
    findFontExportDeclaration,
    hasLocalFontImport,
    mergeLocalFontSources,
} from '@onlook/fonts';
import type { FontConfig, FontUploadFile } from '@onlook/models';
import { getFontFileName } from '@onlook/utility';
import { camelCase } from 'lodash';
import * as pathModule from 'path';
import type { EditorEngine } from '../engine';
import { makeAutoObservable, runInAction } from 'mobx';

export class FontUploadManager {
    private _isUploading = false;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get isUploading(): boolean {
        return this._isUploading;
    }

    /**
     * Uploads font files to the project
     */
    async uploadFonts(
        fontFiles: FontUploadFile[],
        basePath: string,
        fontConfigAst: ParseResult<t.File>,
    ): Promise<{ success: boolean; fontConfigAst: ParseResult<t.File> }> {
        this._isUploading = true;
        try {
            if (fontFiles.length === 0) {
                return {
                    success: false,
                    fontConfigAst,
                };
            }
            const baseFontName = fontFiles[0]?.name.split('.')[0] ?? 'custom-font';

            const fontName = camelCase(`custom-${baseFontName}`);

            const { fontNameExists, existingFontNode } = findFontExportDeclaration(fontConfigAst, fontName);

            const fontConfigs = await this.processFontFiles(fontFiles, baseFontName, basePath);
            const fontsSrc = this.createFontSrcObjects(fontConfigs);

            await this.updateAstWithFontConfig(
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
        } finally {
            this._isUploading = false;
        }
    }

    /**
     * Processes font files and saves them to the project
     */
    private async processFontFiles(
        fontFiles: FontUploadFile[],
        baseFontName: string,
        basePath: string,
    ): Promise<FontConfig[]> {
        return Promise.all(
            fontFiles.map(async (fontFile) => {
                const weight = fontFile.weight;
                const style = fontFile.style.toLowerCase();
                const fileName = getFontFileName(baseFontName, weight, style);
                const filePath = pathModule.join(
                    basePath,
                    DefaultSettings.FONT_FOLDER,
                    `${fileName}.${fontFile.file.name.split('.').pop()}`,
                );

                const buffer = Buffer.from(fontFile.file.buffer);
                await this.editorEngine.sandbox.writeBinaryFile(filePath, buffer);

                return {
                    path: `./fonts/${fileName}.${fontFile.file.name.split('.').pop()}`,
                    weight,
                    style,
                };
            }),
        );
    }

    /**
     * Creates font source objects for AST
     */
    private createFontSrcObjects(fontConfigs: FontConfig[]): t.ObjectExpression[] {
        return fontConfigs.map((config: FontConfig) =>
            t.objectExpression([
                t.objectProperty(t.identifier('path'), t.stringLiteral(config.path)),
                t.objectProperty(t.identifier('weight'), t.stringLiteral(config.weight)),
                t.objectProperty(t.identifier('style'), t.stringLiteral(config.style)),
            ]),
        );
    }

    /**
     * Updates AST with font configuration
     */
    private async updateAstWithFontConfig(
        ast: ParseResult<t.File>,
        fontName: string,
        fontsSrc: t.ObjectExpression[],
        fontNameExists: boolean,
        existingFontNode: t.ExportNamedDeclaration | null,
    ): Promise<void> {
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

    /**
     * Clears the uploading state
     */
    clear(): void {
        this._isUploading = false;
    }
}
