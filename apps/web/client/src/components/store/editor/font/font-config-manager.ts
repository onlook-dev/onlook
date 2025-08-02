import {
    addGoogleFontSpecifier,
    generateFontVariableExport,
    migrateFontsFromLayout,
    parseFontDeclarations,
    removeFontDeclaration,
    validateGoogleFontSetup,
} from '@onlook/fonts';
import { RouterType, type CodeDiff, type Font } from '@onlook/models';
import { generate, getAstFromContent, types as t, type t as T } from '@onlook/parser';
import { camelCase } from 'lodash';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';
import { normalizePath } from '../sandbox/helpers';

export class FontConfigManager {
    private _fontConfigPath: string | null = null;
    readonly fontImportPath = './fonts';

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);

        reaction(
            () => this.editorEngine.sandbox.isIndexed,
            async (isIndexedFiles) => {
                if (isIndexedFiles) {
                    await this.updateFontConfigPath();
                }
            },
        );
    }

    get fontConfigPath(): string | null {
        return this._fontConfigPath;
    }

    setFontConfigPath(path: string): void {
        this._fontConfigPath = normalizePath(path);
    }

    /**
     * Scans and extracts fonts from the font configuration file
     */
    async scanFonts(): Promise<Font[]> {
        try {
            const file = await this.readFontConfigFile();
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
    async scanExistingFonts(layoutPath: string): Promise<Font[] | undefined> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        const normalizedLayoutPath = normalizePath(layoutPath);

        try {
            const file = await sandbox.readFile(normalizedLayoutPath);
            if (!file || file.type === 'binary') {
                console.log(`Layout file is empty or doesn't exist: ${layoutPath}`);
                return [];
            }

            const result = migrateFontsFromLayout(file.content);

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
    async addFont(font: Font): Promise<boolean> {
        try {
            // Convert the font family to the import name format (Pascal case, no spaces)
            const importName = font.family.replace(/\s+/g, '_');
            const fontName = camelCase(font.id);

            await this.ensureFontConfigFileExists();

            const fontConfig = await this.readFontConfigFile();
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

            if (!this.fontConfigPath) {
                return false;
            }

            const success = await this.editorEngine.sandbox.writeFile(this.fontConfigPath, code);

            if (!success) {
                throw new Error('Failed to write font configuration');
            }

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
    async removeFont(font: Font): Promise<CodeDiff | false> {
        try {
            const { content } = (await this.readFontConfigFile()) ?? {};
            if (!content) {
                return false;
            }

            if (!this.fontConfigPath) {
                return false;
            }

            const { removedFont, fontFilesToDelete, ast } = removeFontDeclaration(font, content);

            if (removedFont) {
                const { code } = generate(ast);

                const codeDiff: CodeDiff = {
                    original: content,
                    generated: code,
                    path: this.fontConfigPath,
                };

                const success = await this.editorEngine.sandbox.writeFile(
                    this.fontConfigPath,
                    code,
                );
                if (!success) {
                    throw new Error('Failed to write font configuration');
                }

                // Delete font files if this is a custom font
                if (fontFilesToDelete.length > 0) {
                    const routerConfig = this.editorEngine.sandbox.routerConfig;
                    if (!routerConfig?.basePath) {
                        console.error('Could not get base path');
                        return false;
                    }

                    await Promise.all(
                        fontFilesToDelete.map((file) =>
                            this.editorEngine.sandbox.delete(
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
    async readFontConfigFile(): Promise<
        | {
            ast: T.File;
            content: string;
        }
        | undefined
    > {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        if (!this.fontConfigPath) {
            return;
        }

        const file = await sandbox.readFile(this.fontConfigPath);
        if (!file || file.type === 'binary') {
            console.error("Font config file is empty or doesn't exist");
            return;
        }
        const content = file.content;

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
     * Ensures the font configuration file exists
     */
    async ensureFontConfigFileExists(): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        if (sandbox.isIndexing) {
            return;
        }

        if (!this.fontConfigPath) {
            return;
        }

        const fontConfigPath = normalizePath(this.fontConfigPath);
        const fontConfigExists = await sandbox.fileExists(fontConfigPath);

        if (!fontConfigExists) {
            await sandbox.writeFile(this.fontConfigPath, '');
        }
    }

    /**
     * Updates the font config path based on the detected router configuration
     */
    private async updateFontConfigPath(): Promise<void> {
        const routerConfig = this.editorEngine.sandbox.routerConfig;

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
            this.setFontConfigPath(fontConfigPath);
        }
    }
}
