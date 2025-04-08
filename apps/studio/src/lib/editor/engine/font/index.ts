import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '..';
import { invokeMainChannel } from '@/lib/utils';
import { fontFamilies, MainChannels } from '@onlook/models';
import type { ProjectsManager } from '@/lib/projects';
import type { Font } from '@onlook/models/assets';
import type { FontFile } from '@/routes/editor/LayersPanel/BrandTab/FontPanel/FontFiles';
import WebFont from 'webfontloader';
import FlexSearch from 'flexsearch';
import type { Document } from 'flexsearch';

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

export class FontManager {
    private _fonts: Font[] = [];
    private _systemFonts: Font[] = [];
    private _searchResults: Font[] = [];
    private _allFontFamilies: RawFont[] = fontFamilies as RawFont[];
    private _defaultFont: string | null = null;
    private disposers: Array<() => void> = [];
    private _currentFontIndex = 0;
    private _batchSize = 20;
    private _isFetching = false;
    private _fontSearchIndex: Document;

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
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

        this.loadInitialFonts();

        // Watch for project changes and set up watcher when a project is selected
        const disposer = reaction(
            () => this.projectsManager.project?.folderPath,
            (folderPath) => {
                console.log('Project path changed, setting up font watcher:', folderPath);
                if (folderPath) {
                    this.watchFontFile(folderPath);
                }
            },
            { fireImmediately: true },
        );

        this.disposers.push(disposer);
    }

    private convertFont(font: RawFont): Font {
        return {
            ...font,
            weight: font.weights,
            styles: font.styles || [],
            variable: `--font-${font.id}`,
        };
    }

    private async loadInitialFonts() {
        const initialFonts = this._allFontFamilies.slice(0, this._batchSize);
        const convertedFonts = initialFonts.map((font) => this.convertFont(font));
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

    private async watchFontFile(projectRoot: string) {
        if (!projectRoot) {
            console.error('No project root provided, skipping font file watcher setup');
            return;
        }

        try {
            await invokeMainChannel(MainChannels.WATCH_FONT_FILE, {
                projectRoot,
            });
        } catch (error) {
            console.error('Error setting up font file watcher:', error);
        }
    }

    async scanFonts() {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            console.error('No project root provided, skipping font file watcher setup');
            return;
        }

        const fonts = (await invokeMainChannel(MainChannels.SCAN_FONTS, {
            projectRoot,
        })) as Font[];

        this._fonts = fonts;
        return fonts;
    }

    async addFont(font: Font) {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            console.error('No project root provided, skipping font file watcher setup');
            return;
        }

        try {
            await invokeMainChannel(MainChannels.ADD_FONT, {
                projectRoot,
                font,
            });

            await this.scanFonts();
        } catch (error) {
            console.error('Error adding font:', error);
        }
    }

    async removeFont(font: Font) {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            console.error('No project root provided, skipping font file watcher setup');
            return;
        }

        try {
            await invokeMainChannel(MainChannels.REMOVE_FONT, {
                projectRoot,
                font,
            });

            if (font.id === this.defaultFont) {
                this._defaultFont = null;
            }

            await this.scanFonts();
        } catch (error) {
            console.error('Error removing font:', error);
        }
    }

    async setDefaultFont(font: Font) {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            console.error('No project root provided, skipping font file watcher setup');
            return;
        }

        try {
            await invokeMainChannel(MainChannels.SET_FONT, {
                projectRoot,
                font,
            });

            await this.getDefaultFont();
        } catch (error) {
            console.error('Error setting font:', error);
        }
    }

    async getDefaultFont() {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            console.error('No project root provided, skipping font file watcher setup');
            return;
        }

        try {
            const defaultFont = await invokeMainChannel(MainChannels.GET_DEFAULT_FONT, {
                projectRoot,
            });
            this._defaultFont = defaultFont as string;
        } catch (error) {
            console.error('Error getting current font:', error);
        }
    }

    async uploadFonts(fontFiles: FontFile[]) {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
            return;
        }

        try {
            await invokeMainChannel(MainChannels.UPLOAD_FONTS, {
                projectRoot,
                fontFiles,
            });
            await this.scanFonts();
        } catch (error) {
            console.error('Error uploading fonts:', error);
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
                .map((font) => this.convertFont(font));

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
            const searchResults = await this._fontSearchIndex.search(query, {
                limit: 20,
                suggest: true,
                enrich: true,
            });

            const fonts = Object.values(searchResults)
                .flatMap((result) => result.result)
                .map((font) => this.convertFont(font.doc))
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

    dispose() {
        this._fonts = [];
        this._systemFonts = [];
        this._searchResults = [];
        this._defaultFont = null;
        this._allFontFamilies = [];
        this._currentFontIndex = 0;
        this._batchSize = 20;
        this._isFetching = false;

        // Clean up all reactions
        this.disposers.forEach((disposer) => disposer());
        this.disposers = [];
    }
}
