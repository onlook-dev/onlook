'use client';

import type { ParseResult } from '@babel/parser';
import * as t from '@babel/types';
import { DefaultSettings, RouterType,  type RouterConfig } from '@onlook/constants';
import {
    convertRawFont,
    createFontFamilyProperty,
    createStringLiteralWithFont,
    createTemplateLiteralWithFont,
    declareFont,
    extractExistingFontImport,
    createFontConfig,
    extractFontImport,
    FAMILIES,
    findFontClass,
    getTargetElementsByType,
    isPropertyWithName,
    isThemeProperty,
    isValidLocalFontDeclaration,
    removeFontFromConfigAST,
    removeFontFromThemeAST,
    removeFontImportFromFile,
    removeFontsFromClassName,
    validateFontImportAndExport,
    cleanComma
} from '@onlook/fonts';
import { type FontConfig, type FontUploadFile, type RawFont } from '@onlook/models';
import type { Font } from '@onlook/models/assets';
import { generate, parse, traverse, type NodePath } from '@onlook/parser';
import { getFontFileName } from '@onlook/utility';
import * as FlexSearch from 'flexsearch';
import { camelCase } from 'lodash';
import { makeAutoObservable, reaction } from 'mobx';
import * as pathModule from 'path';
import type { EditorEngine } from '../engine';
import { normalizePath } from '../sandbox/helpers';

type TraverseCallback = (
    classNameAttr: t.JSXAttribute,
    ast: ParseResult<t.File>,
) => void | Promise<void>;

interface CodeDiff {
    original: string;
    generated: string;
    path: string;
}

export class FontManager {
    private _fonts: Font[] = [];
    private _systemFonts: Font[] = [];
    private _searchResults: Font[] = [];
    private _fontFamilies: Font[] = [];
    private _defaultFont: string | null = null;
    private _lastDefaultFont: string | null = null;
    private _currentFontIndex = 0;
    private _batchSize = 20;
    private _isFetching = false;
    private _isUploading = false;
    private _isScanning = false;
    private _fontSearchIndex: FlexSearch.Document;
    private _allFontFamilies: RawFont[] = FAMILIES as RawFont[];
    private disposers: Array<() => void> = [];
    private previousFonts: Font[] = [];
    private fontConfigFileWatcher: (() => void) | null = null;

    private _fontConfigPath: string | null = null;
    tailwindConfigPath = normalizePath(DefaultSettings.TAILWIND_CONFIG);
    fontImportPath = './fonts';

    get fontConfigPath(): string {
        if (!this._fontConfigPath) {
            // Fallback to default if not yet determined
            return normalizePath(DefaultSettings.FONT_CONFIG);
        }
        return this._fontConfigPath;
    }

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);

        // Initialize FlexSearch index
        this._fontSearchIndex = new FlexSearch.Document({
            document: {
                id: 'id',
                index: ['family'],
                store: true,
            },
            tokenize: 'forward',
        });

        // Add all font families to the search index
        this._allFontFamilies.forEach((font) => {
            this._fontSearchIndex.add(font.id, {
                id: font.id,
                family: font.family,
                subsets: font.subsets,
                variable: font.variable,
                weights: font.weights,
                styles: font.styles,
            });
        });

        // React to sandbox connection status
        reaction(
            () => this.editorEngine.sandbox.isIndexedFiles,            
            async (isIndexedFiles) => {
                if (isIndexedFiles) {
                    await this.updateFontConfigPath();
                    this.setupFontConfigFileWatcher(); 
                    await this.loadInitialFonts();
                    await this.getDefaultFont();
                }
            },
        );
    }

    private async loadInitialFonts() {
        const initialFonts = this._allFontFamilies.slice(0, this._batchSize);
        const convertedFonts = initialFonts.map((font) => convertRawFont(font));
        this._systemFonts = convertedFonts;
        this._currentFontIndex = this._batchSize;

        try {
            await this.loadFontBatch(convertedFonts);
            console.log(`Initial ${convertedFonts.length} fonts loaded successfully`);
        } catch (error) {
            console.error('Failed to load initial fonts:', error);
        }
    }

    private async loadFontBatch(fonts: Font[]) {
        if (typeof window === 'undefined') {
            console.error('window is undefined');
            return;
        }

        const WebFont = await import('webfontloader');

        return new Promise<void>((resolve, reject) => {
            WebFont.load({
                google: {
                    families: fonts.map((font) => font.family),
                },
                active: () => {
                    resolve();
                },
                inactive: () => {
                    console.warn(`Failed to load font batch`);
                    reject(new Error('Font loading failed'));
                },
                timeout: 30000, // 30 second timeout
            });
        });
    }

    async scanFonts() {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return [];
        }

        this._isScanning = true;
        try {
            let existedFonts: Font[] | undefined = [];

            existedFonts = await this.scanExistingFonts();
            if (existedFonts && existedFonts.length > 0) {
                await this.addFonts(existedFonts);
            }

            const fileExists = await sandbox.fileExists(this.fontConfigPath);
            if (!fileExists) {
                console.log(`Font config file doesn't exist: ${this.fontConfigPath}`);
                return [];
            }

            const file = await this.editorEngine.sandbox?.readFile(this.fontConfigPath);
            if (!file || file.type === 'binary') {
                this._fonts = [];
                return [];
            }

            const fonts = extractFontImport(file.content);
            this._fonts = fonts;

            return fonts;
        } catch (error) {
            console.error('Error scanning fonts:', error);
            return [];
        } finally {
            this._isScanning = false;
        }
    }

    /**
     * Scan existing fonts declaration in the layout file and move them to the font config file
     */
    async scanExistingFonts(): Promise<Font[] | undefined> {
        try {
            const { layoutPath } = (await this.getRootLayoutPath()) ?? {};
            if (!layoutPath) {
                console.log('Could not get layout path');
                return [];
            }

            const file = await this.editorEngine.sandbox?.readFile(normalizePath(layoutPath));
            if (!file || file.type === 'binary') {
                console.log(`Layout file is empty or doesn't exist: ${layoutPath}`);
                return [];
            }

            const { fonts, layoutContent } = extractExistingFontImport(file.content);

            if (layoutContent) {
                await this.editorEngine.sandbox.writeFile(normalizePath(layoutPath), layoutContent);
            }
            return fonts;
        } catch (error) {
            console.error('Error scanning existing fonts:', error);
            return [];
        }
    }

    /**
     * Adds a new font to the project by:
     * 1. Adding the font import and configuration to fonts.ts
     * 2. Updating Tailwind config with the new font family
     * 3. Adding the font variable to the appropriate layout file
     */
    async addFont(font: Font) {
        try {
            // Convert the font family to the import name format (Pascal case, no spaces)
            const importName = font.family.replace(/\s+/g, '_');
            const fontName = camelCase(font.id);

            await this.existingOrCreateConfigFile();

            const fontConfig = await this.readFontConfigFile();

            if (!fontConfig) {
                console.error('Failed to read font config file');
                return false;
            }

            const { ast, content } = fontConfig;

            // Check if the font already exists in the font config file
            const { hasGoogleFontImport, hasImportName, hasFontExport } =
                validateFontImportAndExport(content, importName, fontName);

            if (hasFontExport) {
                console.log(`Font ${fontName} already exists in font.ts`);
                return false;
            }

            // Add the font declaration to the font config file
            const exportDeclaration = declareFont(font);
            ast.program.body.push(exportDeclaration);

            // Add or update the import if needed
            if (!hasGoogleFontImport) {
                const importDeclaration = t.importDeclaration(
                    [t.importSpecifier(t.identifier(importName), t.identifier(importName))],
                    t.stringLiteral('next/font/google'),
                );
                ast.program.body.unshift(importDeclaration);
            } else if (!hasImportName) {
                await this.addFontImport(ast, importName);
            }

            // Generate and write the updated code back to the file
            const { code } = generate(ast);
            const success = await this.editorEngine.sandbox.writeFile(this.fontConfigPath, code);

            if (!success) {
                throw new Error('Failed to write font configuration');
            }

            // Update the fonts array
            this._fonts.push(font);

            // Load the new font
            await this.loadFontBatch([font]);

            return true;
        } catch (error) {
            console.error(
                'Error adding font:',
                error instanceof Error ? error.message : String(error),
            );
            return false;
        }
    }

    async addFonts(fonts: Font[]) {
        for (const font of fonts) {
            await this.addFont(font);
        }
    }

    async removeFont(font: Font) {
        try {
            const { content } = (await this.readFontConfigFile()) ?? {};
            if (!content) {
                return false;
            }

            const { removedFont, ast } = removeFontFromConfigAST(font, content);

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

                if (font.id === this._defaultFont) {
                    this._defaultFont = null;
                }

                return codeDiff;
            } else {
                console.error(`Font ${font.id} not found in font.ts`);
            }
        } catch (error) {
            console.error('Error removing font:', error);
            return false;
        }
    }

    async setDefaultFont(font: Font) {
        try {
            const prevDefaultFont = this._defaultFont;
            this._defaultFont = font.id;
            this._lastDefaultFont = prevDefaultFont;

            const { layoutPath, routerConfig } = (await this.getRootLayoutPath()) ?? {};

            if (!layoutPath || !routerConfig) {
                console.error('Could not get layout path or router config');
                return null;
            }

            let codeDiff: CodeDiff | null = null;
            const targetElements = getTargetElementsByType(routerConfig.type);

            codeDiff = await this.updateDefaultFontInRootLayout(layoutPath, font, targetElements);

            if (codeDiff) {
                // await this.editorEngine.history.push({
                //   type: "write-code",
                //   diffs: [codeDiff],
                // });
                await this.editorEngine.sandbox.writeFile(codeDiff.path, codeDiff.generated);
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error setting default font:', error);
            return false;
        }
    }

    async uploadFonts(fontFiles: FontUploadFile[]) {
        this._isUploading = true;
        try {
            const routerConfig = await this.detectRouterType();
            if (!routerConfig?.basePath) {
                console.error('Could not get base path');
                return false;
            }

            await this.existingOrCreateConfigFile();

            const fontConfig = await this.readFontConfigFile();
            if (!fontConfig) {
                console.error('Failed to read font config file');
                return false;
            }

            const baseFontName = fontFiles[0]?.name.split('.')[0] ?? 'customFont';
            const fontName = camelCase(`custom-${baseFontName}`);

            const { ast } = fontConfig;

            const { fontNameExists, existingFontNode } = this.isFontNameExists(ast, fontName);

            const fontConfigs = await this.processFontFiles(fontFiles, baseFontName, routerConfig.basePath);
            const fontsSrc = this.createFontSrcObjects(fontConfigs);

            await this.updateAstWithFontConfig(
                ast,
                fontName,
                fontsSrc,
                fontNameExists,
                existingFontNode,
            );

            const { code } = generate(ast);
            await this.editorEngine.sandbox.writeFile(this.fontConfigPath, code);

            return true;
        } catch (error) {
            console.error('Error uploading fonts:', error);
            return false;
        } finally {
            this._isUploading = false;
        }
    }

    private async processFontFiles(fontFiles: FontUploadFile[], baseFontName: string, basePath: string) {
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

    private createFontSrcObjects(fontConfigs: FontConfig[]) {
        return fontConfigs.map((config) =>
            t.objectExpression([
                t.objectProperty(t.identifier('path'), t.stringLiteral(config.path)),
                t.objectProperty(t.identifier('weight'), t.stringLiteral(config.weight)),
                t.objectProperty(t.identifier('style'), t.stringLiteral(config.style)),
            ]),
        );
    }

    private async updateAstWithFontConfig(
        ast: ParseResult<t.File>,
        fontName: string,
        fontsSrc: t.ObjectExpression[],
        fontNameExists: boolean,
        existingFontNode: t.ExportNamedDeclaration | null,
    ) {
        const hasLocalFontImport = this.isLocalFontImportExists(ast);

        if (fontNameExists && existingFontNode) {
            this.mergeFontConfig(ast, existingFontNode, fontName, fontsSrc);
        } else {
            createFontConfig(ast, fontName, fontsSrc);

            if (!hasLocalFontImport) {
                const importDeclaration = t.importDeclaration(
                    [t.importDefaultSpecifier(t.identifier('localFont'))],
                    t.stringLiteral('next/font/local'),
                );
                ast.program.body.unshift(importDeclaration);
            }
        }
    }

    async fetchNextFontBatch(): Promise<{ fonts: Font[]; hasMore: boolean }> {
        if (this._isFetching) {
            console.log('Already fetching fonts, please wait...');
            return {
                fonts: [],
                hasMore: this._currentFontIndex < this._allFontFamilies.length,
            };
        }

        this._isFetching = true;

        try {
            const start = this._currentFontIndex;
            const end = Math.min(start + this._batchSize, this._allFontFamilies.length);

            if (start >= this._allFontFamilies.length) {
                return { fonts: [], hasMore: false };
            }

            const batchFonts = this._allFontFamilies
                .slice(start, end)
                .map((font) => convertRawFont(font));

            await this.loadFontBatch(batchFonts);
            this._systemFonts.push(...batchFonts);
            this._currentFontIndex = end;

            return {
                fonts: batchFonts,
                hasMore: end < this._allFontFamilies.length,
            };
        } catch (error) {
            console.error('Error fetching font batch:', error);
            throw error;
        } finally {
            this._isFetching = false;
        }
    }

    async searchFonts(query: string): Promise<Font[]> {
        if (!query) {
            this._searchResults = [];
            return [];
        }

        try {
            // Search using FlexSearch
            const searchResults = this._fontSearchIndex.search(query, {
                limit: 20,
                suggest: true,
                enrich: true,
            });

            const fonts = Object.values(searchResults)
                .flatMap((result) => result.result)
                .filter((font) => font.doc !== null)
                .map((font) => convertRawFont(font.doc as unknown as RawFont))
                .filter((font) => !this._fonts.some((f) => f.family === font.family));

            if (fonts.length === 0) {
                this._searchResults = [];
                return [];
            }

            await this.loadFontBatch(fonts);
            this._searchResults = fonts;
            return fonts;
        } catch (error) {
            console.error('Error searching fonts:', error);
            return [];
        }
    }

    resetFontFetching() {
        this._currentFontIndex = 0;
        this._isFetching = false;
    }

    get fonts() {
        return this._fonts;
    }

    get fontFamilies() {
        return this._fontFamilies;
    }

    get systemFonts() {
        return this._systemFonts.filter(
            (fontFamily) => !this._fonts.some((font) => font.family === fontFamily.family),
        );
    }

    get defaultFont() {
        return this._defaultFont;
    }

    get searchResults() {
        return this._searchResults.filter(
            (fontFamily) => !this._fonts.some((font) => font.family === fontFamily.family),
        );
    }

    get isFetching() {
        return this._isFetching;
    }

    get isUploading() {
        return this._isUploading;
    }

    get isScanning() {
        return this._isScanning;
    }

    get currentFontIndex() {
        return this._currentFontIndex;
    }

    get hasMoreFonts() {
        return this._currentFontIndex < this._allFontFamilies.length;
    }

    clear() {
        this._fonts = [];
        this._fontFamilies = [];
        this._systemFonts = [];
        this._searchResults = [];
        this._defaultFont = null;
        this._lastDefaultFont = null;
        this._currentFontIndex = 0;
        this._isFetching = false;
        this._isUploading = false;
        this._isScanning = false;

        // // Clean up file watcher
        this.cleanupFontConfigFileWatcher();
    }

    /**
     * Updates a file with a font import if needed
     */
    private async updateFileWithImport(
        filePath: string,
        content: string,
        ast: ParseResult<t.File>,
        fontName: string,
    ): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return;
        }

        const { code } = generate(ast);
        const importRegex = new RegExp(
            `import\\s*{([^}]*)}\\s*from\\s*['"]${this.fontImportPath}['"]`,
        );

        const importMatch = content.match(importRegex);

        let newContent = code;

        if (importMatch?.[1]) {
            const currentImports = importMatch[1];
            if (currentImports && !currentImports.includes(fontName)) {
                const newImports = cleanComma(currentImports.trim() + `, ${fontName}`);

                newContent = newContent.replace(
                    importRegex,
                    `import { ${newImports} } from '${this.fontImportPath}'`,
                );
            }
        } else {
            const fontImport = `import { ${fontName} } from '${this.fontImportPath}';`;
            newContent = fontImport + '\n' + newContent;
        }

        await sandbox.writeFile(filePath, newContent);
    }

    /**
     * Adds a font variable to specified target elements in a file
     */
    private async addFontVariableToElement(
        filePath: string,
        fontName: string,
        targetElements: string[],
    ): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return;
        }
        const normalizedFilePath = normalizePath(filePath);

        try {
            const file = await sandbox.readFile(normalizedFilePath);
            if (!file || file.type === 'binary') {
                console.error(`Failed to read file: ${filePath}`);
                return;
            }
            const content = file.content;
            let updatedAst = false;
            let targetElementFound = false;

            await this.traverseClassName(
                normalizedFilePath,
                targetElements,
                async (classNameAttr, ast) => {
                    targetElementFound = true;
                    const fontVarExpr = t.memberExpression(
                        t.identifier(fontName),
                        t.identifier('variable'),
                    );

                    if (t.isStringLiteral(classNameAttr.value)) {
                        if (classNameAttr.value.value === '') {
                            const quasis = [
                                t.templateElement({ raw: '', cooked: '' }, false),
                                t.templateElement({ raw: '', cooked: '' }, true),
                            ];
                            classNameAttr.value = t.jsxExpressionContainer(
                                t.templateLiteral(quasis, [fontVarExpr]),
                            );
                        } else {
                            classNameAttr.value = t.jsxExpressionContainer(
                                createTemplateLiteralWithFont(
                                    fontVarExpr,
                                    t.stringLiteral(classNameAttr.value.value),
                                ),
                            );
                        }
                        updatedAst = true;
                    } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
                        const expr = classNameAttr.value.expression;

                        if (t.isTemplateLiteral(expr)) {
                            const hasFont = expr.expressions.some(
                                (e) =>
                                    t.isMemberExpression(e) &&
                                    t.isIdentifier(e.object) &&
                                    e.object.name === fontName &&
                                    t.isIdentifier(e.property) &&
                                    e.property.name === 'variable',
                            );

                            if (!hasFont) {
                                if (expr.expressions.length > 0) {
                                    const lastQuasi = expr.quasis[expr.quasis.length - 1];
                                    if (lastQuasi) {
                                        lastQuasi.value.raw = lastQuasi.value.raw + ' ';
                                        lastQuasi.value.cooked = lastQuasi.value.cooked + ' ';
                                    }
                                }
                                expr.expressions.push(fontVarExpr);
                                if (expr.quasis.length <= expr.expressions.length) {
                                    expr.quasis.push(
                                        t.templateElement({ raw: '', cooked: '' }, true),
                                    );
                                }
                                updatedAst = true;
                            }
                        } else if (t.isIdentifier(expr) || t.isMemberExpression(expr)) {
                            classNameAttr.value = t.jsxExpressionContainer(
                                createTemplateLiteralWithFont(fontVarExpr, expr),
                            );
                            updatedAst = true;
                        }
                    }

                    if (updatedAst) {
                        await this.updateFileWithImport(normalizedFilePath, content, ast, fontName);
                    }
                },
            );

            if (!targetElementFound) {
                console.log(
                    `Could not find target elements (${targetElements.join(', ')}) in ${normalizedFilePath}`,
                );
            }
        } catch (error) {
            console.error(`Error adding font variable to ${normalizedFilePath}:`, error);
        }
    }

    /**
     * Adds a font variable to the appropriate layout file
     */
    private async addFontVariableToLayout(fontId: string): Promise<boolean> {
        try {
            const { layoutPath, routerConfig } = (await this.getRootLayoutPath()) ?? {};

            if (!layoutPath || !routerConfig) {
                console.error('Could not get layout path or router config');
                return false;
            }

            const fontName = camelCase(fontId);
            const targetElements = getTargetElementsByType(routerConfig.type);
            await this.addFontVariableToElement(layoutPath, fontName, targetElements);
            return true;
        } catch (error) {
            console.error(`Error adding font variable to layout:`, error);
            return false;
        }
    }

    /**
     * Removes a font variable from the layout file
     */
    private async removeFontVariableFromLayout(fontId: string): Promise<boolean> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return false;
        }

        try {
            const { layoutPath, routerConfig } = (await this.getRootLayoutPath()) ?? {};

            if (!layoutPath || !routerConfig) {
                console.error('Could not get layout path or router config');
                return false;
            }

            const targetElements = getTargetElementsByType(routerConfig.type);

            const file = await sandbox.readFile(layoutPath);
            if (!file || file.type === 'binary') {
                console.error(`Failed to read file: ${layoutPath}`);
                return false;
            }
            const content = file.content;
            
            let updatedAst = false;
            let ast: ParseResult<t.File> | null = null;
            const fontName = camelCase(fontId);

            // Traverse the className attributes in the layout file
            // and remove the font variable from the className attributes
            await this.traverseClassName(
                layoutPath,
                targetElements,
                async (classNameAttr, currentAst) => {
                    ast = currentAst;
                    if (
                        removeFontsFromClassName(classNameAttr, {
                            fontIds: [fontName],
                        })
                    ) {
                        updatedAst = true;
                    }
                },
            );

            if (updatedAst && ast) {
                // Remove the font import if it exists
                const newContent = removeFontImportFromFile(
                    this.fontImportPath,
                    fontName,
                    content,
                    ast,
                );
                if (!newContent) {
                    return false;
                }
                return await sandbox.writeFile(layoutPath, newContent);
            }
            return false;
        } catch (error) {
            console.error(`Error removing font variable`, error);
            return false;
        }
    }

    /**
     * Updates the default font in a layout file by modifying className attributes
     */
    private async updateDefaultFontInRootLayout(
        filePath: string,
        font: Font,
        targetElements: string[],
    ): Promise<CodeDiff | null> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return null;
        }

        let updatedAst = false;
        const fontClassName = `font-${font.id}`;
        let result = null;

        const normalizedFilePath = normalizePath(filePath);

        const file = await sandbox.readFile(normalizedFilePath);
        if (!file || file.type === 'binary') {
            console.error(`Failed to read file: ${filePath}`);
            return null;
        }
        const content = file.content;

        await this.traverseClassName(normalizedFilePath, targetElements, (classNameAttr, ast) => {
            if (t.isStringLiteral(classNameAttr.value)) {
                classNameAttr.value = createStringLiteralWithFont(
                    fontClassName,
                    classNameAttr.value.value,
                );
                updatedAst = true;
            } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
                const expr = classNameAttr.value.expression;
                if (t.isTemplateLiteral(expr)) {
                    const newQuasis = [
                        t.templateElement(
                            { raw: fontClassName + ' ', cooked: fontClassName + ' ' },
                            false,
                        ),
                        ...expr.quasis.slice(1),
                    ];

                    expr.quasis = newQuasis;
                    updatedAst = true;
                }
            }
            if (updatedAst) {
                const { code } = generate(ast);
                const codeDiff: CodeDiff = {
                    original: content,
                    generated: code,
                    path: normalizedFilePath,
                };
                result = codeDiff;
            }
        });

        return result;
    }
    /**
     * Detects the current font being used in a layout file
     */
    private async detectCurrentFont(
        filePath: string,
        targetElements: string[],
    ): Promise<string | null> {
        let currentFont: string | null = null;

        const normalizedFilePath = normalizePath(filePath);

        await this.traverseClassName(normalizedFilePath, targetElements, (classNameAttr) => {
            if (t.isStringLiteral(classNameAttr.value)) {
                currentFont = findFontClass(classNameAttr.value.value);
            } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
                const expr = classNameAttr.value.expression;
                if (t.isTemplateLiteral(expr)) {
                    const firstQuasi = expr.quasis[0];
                    if (firstQuasi) {
                        currentFont = findFontClass(firstQuasi.value.raw);
                    }
                }
            }
        });

        return currentFont;
    }

    /**
     * Gets the default font from the project
     */
    private async getDefaultFont(): Promise<string | null> {
        try {
            const { layoutPath, routerConfig } = (await this.getRootLayoutPath()) ?? {};

            if (!layoutPath || !routerConfig) {
                console.error('Could not get layout path or router config');
                return null;
            }

            const targetElements = getTargetElementsByType(routerConfig.type);
            const defaultFont = await this.detectCurrentFont(layoutPath, targetElements);

            if (defaultFont) {
                this._defaultFont = defaultFont;
            }

            return defaultFont;
        } catch (error) {
            console.error('Error getting current font:', error);
            return null;
        }
    }
    /**
     * Synchronizes detected fonts with the project configuration files.
     * Uses more sophisticated font handling for layout files.
     */
    private async syncFontsWithConfigs() {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        try {
            const currentFonts = await this.scanFonts();

            const removedFonts = this.previousFonts.filter(
                (prevFont) => !currentFonts.some((currFont) => currFont.id === prevFont.id),
            );

            const addedFonts = currentFonts.filter(
                (currFont) => !this.previousFonts.some((prevFont) => currFont.id === prevFont.id),
            );

            if (removedFonts.length > 0) {
                for (const font of removedFonts) {
                    await this.removeFontFromTailwindConfig(font);
                    await this.removeFontVariableFromLayout(font.id);
                }
            }

            if (addedFonts.length > 0) {
                for (const font of addedFonts) {
                    await this.addFontVariableToLayout(font.id);
                    await this.updateTailwindFontConfig(font);
                }
            }

            if (removedFonts.length > 0 || addedFonts.length > 0) {
                this._fonts = currentFonts;
            }

            this.previousFonts = currentFonts;
        } catch (error) {
            console.error('Error syncing fonts:', error);
        }
    }

    /**
     * Updates the font config path based on the detected router configuration
     */
    private async updateFontConfigPath(): Promise<void> {
        const routerConfig = await this.detectRouterType();

        if (routerConfig) {
            if (routerConfig.type === RouterType.APP) {
                this._fontConfigPath = normalizePath(`${routerConfig.basePath}/fonts.ts`);
            } else {
                // For pages router, place fonts.ts in the appropriate directory
                if (routerConfig.basePath.startsWith('src/')) {
                    // If using src pattern, place fonts.ts in src directory
                    this._fontConfigPath = normalizePath('src/fonts.ts');
                } else {
                    // If not using src pattern, place fonts.ts in root
                    this._fontConfigPath = normalizePath('fonts.ts');
                }
            }
        } else {
            // For fallback, use the default
            this._fontConfigPath = normalizePath(DefaultSettings.FONT_CONFIG);
        }
    }

    /**
     * Detects the router type (app or pages) and the base path of the project
     */
    private async detectRouterType(): Promise<RouterConfig | null> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return null;
        }

        const APP_ROUTER_PATHS = ['src/app', 'app'];
        const PAGES_ROUTER_PATHS = ['src/pages', 'pages'];

        try {
            // Check for app router (app/layout.tsx or src/app/layout.tsx)
            for (const appPath of APP_ROUTER_PATHS) {
                try {
                    const appFiles = await sandbox
                        .listFilesRecursively(appPath)
                        .then((files) => files.filter((file) => file.includes('layout.tsx')));

                    if (appFiles.length > 0) {
                        return { type: RouterType.APP, basePath: appPath };
                    }
                } catch (error) {
                    // Directory doesn't exist, continue checking
                }
            }

            // Check for pages router (pages/_app.tsx or src/pages/_app.tsx)
            for (const pagesPath of PAGES_ROUTER_PATHS) {
                try {
                    const pagesFiles = await sandbox
                        .listFilesRecursively(pagesPath)
                        .then((files) => files.filter((file) => file.includes('_app.tsx')));
                    if (pagesFiles.length > 0) {
                        return { type: RouterType.PAGES, basePath: pagesPath };
                    }
                } catch (error) {
                    // Directory doesn't exist, continue checking
                }
            }

            // Default to app router if we can't determine
            return { type: RouterType.APP, basePath: 'app' };
        } catch (error) {
            console.error('Error detecting router type:', error);
            return null;
        }
    }

    /**
     * Removes a font from the Tailwind config
     */
    private async removeFontFromTailwindConfig(font: Font) {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return false;
        }

        try {
            if (!this.tailwindConfigPath) {
                return false;
            }

            const file = await sandbox.readFile(this.tailwindConfigPath);
            if (!file || file.type === 'binary') {
                console.error('Tailwind config file is empty or doesn\'t exist');
                return false;
            }

            const content = file.content;
            const code = removeFontFromThemeAST(font.id, content);

            if (!code) {
                return false;
            }
            return await sandbox.writeFile(this.tailwindConfigPath, code);
        } catch (error) {
            console.error('Error removing font from Tailwind config:', error);
            return false;
        }
    }

    /**
     * Updates Tailwind config with a new font
     */
    private async updateTailwindFontConfig(font: Font) {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return false;
        }

        try {
            if (!this.tailwindConfigPath) {
                return false;
            }

            const file = await sandbox.readFile(this.tailwindConfigPath);
            if (!file || file.type === 'binary') {
                console.error('Tailwind config file is empty or doesn\'t exist');
                return false;
            }

            const content = file.content;

            // Parse the Tailwind config
            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

            let themeFound = false;
            let fontFamilyFound = false;
            const fontId = camelCase(font.id);
            const fontVariable = font.variable;
            const fontFamily = createFontFamilyProperty(font);

            // Find or create the theme.fontFamily property
            traverse(ast, {
                ObjectProperty(path) {
                    if (isThemeProperty(path)) {
                        themeFound = true;

                        // Look for fontFamily within theme
                        if (t.isObjectExpression(path.node.value)) {
                            let fontFamilyProperty = null;

                            for (const prop of path.node.value.properties) {
                                if (isPropertyWithName(prop, 'fontFamily')) {
                                    fontFamilyProperty = prop;
                                    fontFamilyFound = true;
                                    break;
                                }
                            }

                            // If fontFamily exists, add the new font
                            if (
                                fontFamilyFound &&
                                fontFamilyProperty &&
                                t.isObjectProperty(fontFamilyProperty) &&
                                t.isObjectExpression(fontFamilyProperty.value)
                            ) {
                                // Check if font already exists
                                const fontExists = fontFamilyProperty.value.properties.some(
                                    (prop) => isPropertyWithName(prop, fontId),
                                );

                                if (!fontExists) {
                                    // Add the new font
                                    fontFamilyProperty.value.properties.push(
                                        t.objectProperty(
                                            t.identifier(fontId),
                                            t.arrayExpression([
                                                t.stringLiteral(`var(${fontVariable})`),
                                                t.stringLiteral('sans-serif'),
                                            ]),
                                        ),
                                    );
                                }
                            }
                            // If fontFamily doesn't exist, create it
                            else if (!fontFamilyFound) {
                                path.node.value.properties.push(fontFamily);
                            }
                        }
                    }
                },
            });

            // If theme doesn't exist, create it
            if (!themeFound) {
                traverse(ast, {
                    ObjectExpression(path) {
                        if (
                            path.parent.type === 'VariableDeclarator' ||
                            path.parent.type === 'ReturnStatement'
                        ) {
                            path.node.properties.push(
                                t.objectProperty(
                                    t.identifier('theme'),
                                    t.objectExpression([fontFamily]),
                                ),
                            );
                        }
                    },
                });
            }

            const { code } = generate(ast);
            return await sandbox.writeFile(this.tailwindConfigPath, code);
        } catch (error) {
            console.error('Error updating Tailwind font config:', error);
            return false;
        }
    }
    /**
     * Traverses className attributes in a file and applies a callback
     */
    private async traverseClassName(
        filePath: string,
        targetElements: string[],
        callback: TraverseCallback,
    ): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        try {

            const file = await sandbox.readFile(filePath);
            if (!file || file.type === 'binary') {
                console.error(`Failed to read file: ${filePath}`);
                return;
            }
            const content = file.content;
            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

            traverse(ast, {
                JSXOpeningElement(path) {
                    if (
                        !t.isJSXIdentifier(path.node.name) ||
                        !targetElements.includes(path.node.name.name)
                    ) {
                        return;
                    }

                    const classNameAttr = path.node.attributes.find(
                        (attr): attr is t.JSXAttribute =>
                            t.isJSXAttribute(attr) &&
                            t.isJSXIdentifier(attr.name) &&
                            attr.name.name === 'className',
                    );

                    if (!classNameAttr) {
                        const newClassNameAttr = t.jsxAttribute(
                            t.jsxIdentifier('className'),
                            t.stringLiteral(''),
                        );
                        path.node.attributes.push(newClassNameAttr);
                        callback(newClassNameAttr, ast);
                        return;
                    }
                    callback(classNameAttr, ast);
                },
            });
        } catch (error) {
            console.error(`Error traversing className in ${filePath}:`, error);
        }
    }

    /**
     * Sets up file watcher for the font config file
     */
    private setupFontConfigFileWatcher(): void {

        this.cleanupFontConfigFileWatcher();
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            return;
        }

        this.fontConfigFileWatcher = sandbox.fileEventBus.subscribe('*', async (event) => {
            const normalizedFontConfigPath = normalizePath(this.fontConfigPath);
            const affectsFont = event.paths.some(
                (path) => normalizePath(path) === normalizedFontConfigPath,
            );

            if (!affectsFont) {
                return;
            }

            await this.syncFontsWithConfigs();
        });
    }

    private async createNewTailwindConfigFile(): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        const tailwindConfigContent = `import type { Config } from 'tailwindcss';
const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        fontFamily: {},
    },
    plugins: [require('tailwindcss-animate')],
};

export default config;
`;

        try {
            await sandbox.writeFile(this.tailwindConfigPath, tailwindConfigContent);
            console.log(`Created new Tailwind config file at: ${this.tailwindConfigPath}`);
        } catch (error) {
            console.error('Error creating new Tailwind config file:', error);
        }
    }

    private async existingOrCreateConfigFile(): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }
        // Check if tailwind config file exists
        const tailwindConfigPath = normalizePath(this.tailwindConfigPath);

        const tailwindConfigExists = await sandbox.fileExists(tailwindConfigPath);

        if (!tailwindConfigExists) {
            await this.createNewTailwindConfigFile();
        }
        // Check if font config file exists
        const fontConfigPath = normalizePath(this.fontConfigPath);
        const fontConfigExists = await sandbox.fileExists(fontConfigPath);
        if (!fontConfigExists) {
            await sandbox.writeFile(this.fontConfigPath, '');
        }
    }

    /**
     * Gets the root layout path and router config
     * @returns The root layout path and router config already normalized
     */

    private async getRootLayoutPath(): Promise<
        | { layoutPath: string; routerConfig: RouterConfig }
        | undefined
    > {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        const routerConfig = await this.detectRouterType();
        if (!routerConfig) {
            console.log('Could not detect Next.js router type');
            return;
        }

        // Determine the layout file path based on router type
        let layoutPath: string;

        if (routerConfig.type === RouterType.APP) {
            layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
        } else {
            layoutPath = pathModule.join(routerConfig.basePath, '_app.tsx');
        }

        return { layoutPath: normalizePath(layoutPath), routerConfig };
    }

    private async readFontConfigFile(): Promise<
        | {
              ast: ParseResult<t.File>;
              content: string;
          }
        | undefined
    > {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        const file = await sandbox.readFile(this.fontConfigPath);
        if (!file || file.type === 'binary') {
            console.error('Font config file is empty or doesn\'t exist');
            return;
        }
        const content = file.content;

        // Parse the file content using Babel
        const ast = parse(content, {
            sourceType: 'module',
            plugins: ['typescript', 'jsx'],
        });

        return {
            ast,
            content,
        };
    }

    /**
     * Adds a font import to the google font import
     * @param ast - The AST of the font config file
     * @param importName - The name of the font to import
     */

    private async addFontImport(ast: ParseResult<t.File>, importName: string): Promise<void> {
        traverse(ast, {
            ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
                if (path.node.source.value === 'next/font/google') {
                    const newSpecifiers = [...path.node.specifiers];
                    newSpecifiers.push(
                        t.importSpecifier(t.identifier(importName), t.identifier(importName)),
                    );
                    path.node.specifiers = newSpecifiers;
                }
            },
        });
    }
    private isLocalFontImportExists(ast: ParseResult<t.File>): boolean {
        return ast.program.body.some((node) => {
            if (t.isImportDeclaration(node)) {
                return node.source.value === 'next/font/local';
            }
        });
    }
    private isFontNameExists(
        ast: ParseResult<t.File>,
        fontName: string,
    ): { fontNameExists: boolean; existingFontNode: t.ExportNamedDeclaration | null } {
        let fontNameExists = false;
        let existingFontNode: t.ExportNamedDeclaration | null = null;

        traverse(ast, {
            ExportNamedDeclaration(path) {
                if (
                    path.node.declaration &&
                    t.isVariableDeclaration(path.node.declaration) &&
                    path.node.declaration.declarations.some(
                        (declaration) =>
                            t.isIdentifier(declaration.id) && declaration.id.name === fontName,
                    )
                ) {
                    fontNameExists = true;
                    existingFontNode = path.node;
                }
            },
        });
        return { fontNameExists, existingFontNode };
    }
    private mergeFontConfig(
        ast: ParseResult<t.File>,
        fontNode: t.ExportNamedDeclaration,
        fontName: string,
        fontsSrc: t.ObjectExpression[],
    ): void {
        traverse(ast, {
            ExportNamedDeclaration(path) {
                if (path.node === fontNode && path.node.declaration) {
                    const declaration = path.node.declaration;
                    if (
                        t.isVariableDeclaration(declaration) &&
                        declaration.declarations.length > 0
                    ) {
                        const declarator = declaration.declarations[0];
                        if (declarator && isValidLocalFontDeclaration(declarator, fontName)) {
                            const configObject = t.isCallExpression(declarator.init)
                                ? (declarator.init.arguments[0] as t.ObjectExpression)
                                : null;
                            if (configObject && t.isObjectExpression(configObject)) {
                                const srcProp = configObject.properties.find((prop) =>
                                    isPropertyWithName(prop, 'src'),
                                );
                                if (
                                    srcProp &&
                                    t.isObjectProperty(srcProp) &&
                                    t.isArrayExpression(srcProp.value)
                                ) {
                                    srcProp.value.elements.push(...fontsSrc);
                                }
                            }
                        }
                    }
                }
            },
        });
    }

    private cleanupFontConfigFileWatcher(): void {
        if (this.fontConfigFileWatcher) {
            this.fontConfigFileWatcher();
            this.fontConfigFileWatcher = null;
        }
    }
}
