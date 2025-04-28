import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { FAMILIES } from '@onlook/fonts';
import type { Font } from '@onlook/models/assets';
import { FileSyncManager } from '../sandbox/file-sync';
import * as FlexSearch from 'flexsearch';
import * as WebFont from 'webfontloader';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { generate } from '@babel/generator';
import { camelCase } from 'lodash';
import * as t from '@babel/types';
import type { NodePath } from '@babel/traverse';
import { DefaultSettings } from '@onlook/constants';
import type { ProjectManager } from '@/components/store/project';

interface FontFile {
    name: string;
    path: string;
    content: string;
}

interface RawFont {
    id: string;
    family: string;
    subsets: string[];
    weights: string[];
    styles: string[];
    defSubset: string;
    variable: boolean;
    lastModified: string;
    category: string;
    type: string;
}

interface SearchDocument {
    id: string;
    family: string;
    subsets: string[];
    variable: boolean;
    weights: string[];
    styles: string[];
}

type DocumentData = {
    id: string;
    content: string;
};

type SearchResult = {
    field: string;
    result: Array<{
        doc: DocumentData;
        score: number;
    }>;
};

type DocumentSearchResults = Record<string, SearchResult>;

export class FontManager {
    private _fonts: Font[] = [];
    private _systemFonts: Font[] = [];
    private _searchResults: Font[] = [];
    private _fontFamilies: Font[] = [];
    private _defaultFont: string | null = null;
    private _lastDefaultFont: string | null = null;
    private fileSync: FileSyncManager;
    private _currentFontIndex = 0;
    private _batchSize = 20;
    private _isFetching = false;
    private _fontSearchIndex: FlexSearch.Document;
    private _allFontFamilies: RawFont[] = FAMILIES as RawFont[];

    constructor(
        private editorEngine: EditorEngine,
        private projectManager: ProjectManager,
    ) {
        makeAutoObservable(this);
        this.fileSync = new FileSyncManager();
        
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
            const doc: SearchDocument = {
                id: font.id,
                family: font.family,
                subsets: font.subsets,
                variable: font.variable,
                weights: font.weights,
                styles: font.styles,
            };
            const data: DocumentData = {
                id: doc.id,
                content: JSON.stringify(doc),
            };
            void this._fontSearchIndex.add(data);
        });

        this.convertFont();
        this.loadInitialFonts();
    }

    private convertFont() {
        this._fontFamilies = FAMILIES.map((font) => ({
            ...font,
            weight: font.weights.map((weight) => weight.toString()),
            styles: font.styles.map((style) => style.toString()),
            variable: `--font-${font.id}`,
        }));
    }

    private async loadInitialFonts() {
        const initialFonts = this._allFontFamilies.slice(0, this._batchSize);
        const convertedFonts = initialFonts.map((font) => this.convertRawFont(font));
        this._systemFonts = convertedFonts;
        this._currentFontIndex = this._batchSize;

        try {
            await this.loadFontBatch(convertedFonts);
            console.log(`Initial ${convertedFonts.length} fonts loaded successfully`);
        } catch (error) {
            console.error('Failed to load initial fonts:', error);
        }
    }

    private convertRawFont(font: RawFont): Font {
        return {
            ...font,
            weight: font.weights,
            styles: font.styles || [],
            variable: `--font-${font.id}`,
        };
    }

    private async loadFontBatch(fonts: Font[]) {
        return new Promise<void>((resolve, reject) => {
            WebFont.load({
                google: {
                    families: fonts.map((font) => font.family),
                },
                active: () => {
                    console.log(`Batch of fonts loaded successfully`);
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
        if (!this.projectManager) {
            console.error('No project provided');
            return [];
        }

        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return [];
        }

        try {
            const fontFiles = await sandbox.listFilesRecursively('./fonts', [], ['.ttf', '.otf', '.woff', '.woff2']);
            const fonts: Font[] = [];

            for (const file of fontFiles) {
                const content = await sandbox.readFile(file);
                if (content) {
                    const font: Font = {
                        id: file,
                        family: file.split('/').pop()?.split('.')[0] ?? '',
                        weight: ['400'],
                        styles: ['normal'],
                        variable: `--font-${file.split('/').pop()?.split('.')[0] ?? ''}`,
                        subsets: ['latin'],
                        type: 'local',
                    };
                    fonts.push(font);
                }
            }

            this._fonts = fonts;
            return fonts;
        } catch (error) {
            console.error('Error scanning fonts:', error);
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
        if (!this.projectManager.project) {
            console.error('No project provided');
            return false;
        }

        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return false;
        }

        try {
            const content = await sandbox.readFile(DefaultSettings.FONT_CONFIG) ?? '';
            
            // Convert the font family to the import name format (Pascal case, no spaces)
            const importName = font.family.replace(/\s+/g, '_');
            const fontName = camelCase(font.id);

            // Parse the file content using Babel
            const ast = parse(content, {
                sourceType: 'module',
                plugins: ['typescript', 'jsx'],
            });

            let hasGoogleFontImport = false;
            let hasImportName = false;
            let hasFontExport = false;

            // Check if import and export already exists
            traverse(ast, {
                ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
                    if (path.node.source.value === 'next/font/google') {
                        hasGoogleFontImport = true;
                        path.node.specifiers.forEach((specifier) => {
                            if (
                                t.isImportSpecifier(specifier) &&
                                t.isIdentifier(specifier.imported) &&
                                specifier.imported.name === importName
                            ) {
                                hasImportName = true;
                            }
                        });
                    }
                },
                ExportNamedDeclaration(path: NodePath<t.ExportNamedDeclaration>) {
                    if (
                        t.isVariableDeclaration(path.node.declaration) &&
                        path.node.declaration.declarations.some(
                            (declaration) =>
                                t.isIdentifier(declaration.id) && declaration.id.name === fontName
                        )
                    ) {
                        hasFontExport = true;
                    }
                },
            });

            if (hasFontExport) {
                console.log(`Font ${fontName} already exists in font.ts`);
                return false;
            }

            // Create the AST nodes for the new font
            const fontConfigObject = t.objectExpression([
                t.objectProperty(
                    t.identifier('subsets'),
                    t.arrayExpression(font.subsets.map((s) => t.stringLiteral(s)))
                ),
                t.objectProperty(
                    t.identifier('weight'),
                    t.arrayExpression((font.weight ?? []).map((w) => t.stringLiteral(w)))
                ),
                t.objectProperty(
                    t.identifier('style'),
                    t.arrayExpression((font.styles ?? []).map((s) => t.stringLiteral(s)))
                ),
                t.objectProperty(t.identifier('variable'), t.stringLiteral(font.variable)),
                t.objectProperty(t.identifier('display'), t.stringLiteral('swap')),
            ]);

            const fontDeclaration = t.variableDeclaration('const', [
                t.variableDeclarator(
                    t.identifier(fontName),
                    t.callExpression(t.identifier(importName), [fontConfigObject])
                ),
            ]);

            const exportDeclaration = t.exportNamedDeclaration(fontDeclaration, []);

            // Add the export declaration to the end of the file
            ast.program.body.push(exportDeclaration);

            // Add or update the import if needed
            if (!hasGoogleFontImport) {
                const importDeclaration = t.importDeclaration(
                    [t.importSpecifier(t.identifier(importName), t.identifier(importName))],
                    t.stringLiteral('next/font/google')
                );
                ast.program.body.unshift(importDeclaration);
            } else if (!hasImportName) {
                traverse(ast, {
                    ImportDeclaration(path: NodePath<t.ImportDeclaration>) {
                        if (path.node.source.value === 'next/font/google') {
                            const newSpecifiers = [...path.node.specifiers];
                            newSpecifiers.push(
                                t.importSpecifier(t.identifier(importName), t.identifier(importName))
                            );
                            path.node.specifiers = newSpecifiers;
                        }
                    },
                });
            }


            const { code } = generate(ast);

            const success = await sandbox.writeFile('app/fonts.ts', code);
            if (!success) {
                throw new Error('Failed to write font configuration');
            }

            this._fonts.push(font);
            await this.scanFonts();

            await this.loadFontBatch([font]);

            return true;
        } catch (error) {
            console.error('Error adding font:', error instanceof Error ? error.message : String(error));
            return false;
        }
    }

    async removeFont(font: Font) {
        if (!this.projectManager.project) {
            console.error('No project provided');
            return false;
        }

        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return false;
        }

        try {
            const success = await sandbox.writeFile(`fonts/${font.family}`, '');
            if (success) {
                if (font.id === this._defaultFont) {
                    this._defaultFont = null;
                }
                await this.scanFonts();
            }
            return success;
        } catch (error) {
            console.error('Error removing font:', error);
            return false;
        }
    }

    async setDefaultFont(font: Font) {
        if (!this.projectManager.project) {
            console.error('No project provided');
            return false;
        }

        try {
            const prevDefaultFont = this._defaultFont;
            this._defaultFont = font.id;
            this._lastDefaultFont = prevDefaultFont;
            return true;
        } catch (error) {
            console.error('Error setting default font:', error);
            return false;
        }
    }

    async uploadFonts(fontFiles: FontFile[]) {
        if (!this.projectManager.project) {
            console.error('No project provided');
            return false;
        }

        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return false;
        }

        try {
            for (const fontFile of fontFiles) {
                await sandbox.writeFile(`fonts/${fontFile.name}`, fontFile.content);
            }
            await this.scanFonts();
            return true;
        } catch (error) {
            console.error('Error uploading fonts:', error);
            return false;
        }
    }

    async fetchNextFontBatch(): Promise<{ fonts: Font[]; hasMore: boolean }> {
        if (this._isFetching) {
            console.log('Already fetching fonts, please wait...');
            return { fonts: [], hasMore: this._currentFontIndex < this._allFontFamilies.length };
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
                .map((font) => this.convertRawFont(font));

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
        try {
            const searchResults = (await this._fontSearchIndex.search(query) as unknown) as DocumentSearchResults;
            const fonts = Object.values(searchResults).flatMap((result) => 
                result.result.map((item) => {
                    const doc = JSON.parse(item.doc.content) as SearchDocument;
                    const font = this._allFontFamilies.find((f) => f.id === doc.id);
                    if (!font) {
                        throw new Error(`Font ${doc.id} not found in font families`);
                    }
                    return {
                        id: font.id,
                        family: font.family,
                        subsets: font.subsets,
                        variable: `--font-${font.family.toLowerCase().replace(/\s+/g, '-')}`,
                        weight: font.weights,
                        styles: font.styles,
                        type: font.type,
                    };
                })
            );

            if (fonts.length > 0) {
                await this.loadFontBatch(fonts);
                this._searchResults = fonts;
            }

            return fonts;
        } catch (error) {
            console.error('Error searching fonts:', error instanceof Error ? error.message : String(error));
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
        void this.fileSync.clear();
    }
}
