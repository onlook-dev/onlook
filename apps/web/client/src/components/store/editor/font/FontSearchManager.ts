import { convertRawFont, FAMILIES } from '@onlook/fonts';
import type { Font, RawFont } from '@onlook/models';
import * as FlexSearch from 'flexsearch';
import { makeAutoObservable } from 'mobx';

export class FontSearchManager {
    private _systemFonts: Font[] = [];
    private _searchResults: Font[] = [];
    private _currentFontIndex = 0;
    private _batchSize = 20;
    private _isFetching = false;
    private _fontSearchIndex: FlexSearch.Document;
    private _allFontFamilies: RawFont[] = FAMILIES as RawFont[];
    private _fonts: Font[] = [];

    constructor() {
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
    }

    async loadInitialFonts(): Promise<void> {
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

    private async loadFontBatch(fonts: Font[]): Promise<void> {
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

    async loadFontFromBatch(fonts: Font[]): Promise<void> {
        await this.loadFontBatch(fonts);
    }

    resetFontFetching(): void {
        this._currentFontIndex = 0;
        this._isFetching = false;
    }

    updateFontsList(fonts: Font[]): void {
        this._fonts = fonts;
    }

    clear(): void {
        this._systemFonts = [];
        this._searchResults = [];
        this._currentFontIndex = 0;
        this._isFetching = false;
        this._fonts = [];
    }

    get systemFonts(): Font[] {
        return this._systemFonts.filter(
            (fontFamily) => !this._fonts.some((font) => font.family === fontFamily.family),
        );
    }

    get searchResults(): Font[] {
        return this._searchResults.filter(
            (fontFamily) => !this._fonts.some((font) => font.family === fontFamily.family),
        );
    }

    get isFetching(): boolean {
        return this._isFetching;
    }

    get currentFontIndex(): number {
        return this._currentFontIndex;
    }

    get hasMoreFonts(): boolean {
        return this._currentFontIndex < this._allFontFamilies.length;
    }
} 