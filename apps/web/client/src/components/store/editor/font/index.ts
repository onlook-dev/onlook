'use client';

import { type CodeDiff, type FontUploadFile } from '@onlook/models';
import type { Font } from '@onlook/models/assets';
import { generate } from '@onlook/parser';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';
import type { FileEvent } from '../sandbox/file-event-bus';
import { FontConfigManager } from './font-config-manager';
import { FontSearchManager } from './font-search-manager';
import { FontUploadManager } from './font-upload-manager';
import { LayoutManager } from './layout-manager';
import {
    addFontToTailwindConfig,
    ensureTailwindConfigExists,
    removeFontFromTailwindConfig,
} from './tailwind-config';

export class FontManager {
    private _fonts: Font[] = [];
    private _fontFamilies: Font[] = [];
    private _defaultFont: string | null = null;
    private _isScanning = false;
    private previousFonts: Font[] = [];
    private fontConfigFileWatcher: (() => void) | null = null;

    // Managers
    private fontSearchManager: FontSearchManager;
    private fontConfigManager: FontConfigManager;
    private layoutManager: LayoutManager;
    private fontUploadManager: FontUploadManager;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);

        // Initialize managers
        this.fontSearchManager = new FontSearchManager();
        this.fontConfigManager = new FontConfigManager(editorEngine);
        this.layoutManager = new LayoutManager(editorEngine);
        this.fontUploadManager = new FontUploadManager(editorEngine);

        // React to sandbox connection status
        reaction(
            () => {
                return {
                    isIndexing: this.editorEngine.sandbox.isIndexing,
                    isIndexed: this.editorEngine.sandbox.isIndexed,
                };
            },
            (sandboxStatus) => {
                if (sandboxStatus.isIndexed && !sandboxStatus.isIndexing) {
                    this.loadInitialFonts();
                    this.getCurrentDefaultFont();
                    this.syncFontsWithConfigs();
                    this.setupFontConfigFileWatcher();
                }
            },
        );
    }

    private setupFontConfigFileWatcher(): void {
        if (this.fontConfigFileWatcher) {
            this.fontConfigFileWatcher();
        }

        this.fontConfigFileWatcher = this.editorEngine.sandbox.fileEventBus.subscribe(
            '*',
            this.handleFileEvent.bind(this),
        );
    }

    private async handleFileEvent(event: FileEvent): Promise<void> {
        try {
            const { paths } = event;
            const fontConfigPath = this.fontConfigManager.fontConfigPath;

            if (!fontConfigPath) {
                return;
            }

            if (!paths.some((path) => path.includes(fontConfigPath))) {
                return;
            }

            await this.syncFontsWithConfigs();
        } catch (error) {
            console.error('Error handling file event in FontManager:', error);
        }
    }

    get fontConfigPath(): string | null {
        return this.fontConfigManager.fontConfigPath;
    }

    private async loadInitialFonts(): Promise<void> {
        await this.fontSearchManager.loadInitialFonts();
    }

    async scanFonts(): Promise<Font[]> {
        this._isScanning = true;
        try {
            // Scan existing fonts and move them to config
            const existedFonts = await this.scanExistingFonts();
            if (existedFonts && existedFonts.length > 0) {
                await this.addFonts(existedFonts);
            }

            // Scan fonts from config file
            const fonts = await this.fontConfigManager.scanFonts();
            this._fonts = fonts;

            // Update font search manager with current fonts
            this.fontSearchManager.updateFontsList(this._fonts);

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
    private async scanExistingFonts(): Promise<Font[] | undefined> {
        try {
            const layoutPath = await this.editorEngine.sandbox.getRootLayoutPath();
            if (!layoutPath) {
                console.log('Could not get layout path');
                return [];
            }

            return await this.fontConfigManager.scanExistingFonts(layoutPath);
        } catch (error) {
            console.error('Error scanning existing fonts:', error);
            return [];
        }
    }

    /**
     * Adds a new font to the project
     */
    async addFont(font: Font): Promise<boolean> {
        try {
            const success = await this.fontConfigManager.addFont(font);
            if (success) {
                // Update the fonts array
                this._fonts.push(font);

                // Update font search manager with current fonts
                this.fontSearchManager.updateFontsList(this._fonts);

                // Load the new font in the search manager
                await this.fontSearchManager.loadFontFromBatch([font]);

                return true;
            }
            return false;
        } catch (error) {
            console.error('Error adding font:', error);
            return false;
        }
    }

    async addFonts(fonts: Font[]): Promise<void> {
        for (const font of fonts) {
            await this.addFont(font);
        }
    }

    async removeFont(font: Font): Promise<CodeDiff | false> {
        try {
            const result = await this.fontConfigManager.removeFont(font);

            if (result) {
                // Remove from fonts array
                this._fonts = this._fonts.filter((f) => f.id !== font.id);

                // Update font search manager
                this.fontSearchManager.updateFontsList(this._fonts);

                if (font.id === this._defaultFont) {
                    this._defaultFont = null;
                }

                return result;
            }
            return false;
        } catch (error) {
            console.error('Error removing font:', error);
            return false;
        }
    }

    async setDefaultFont(font: Font): Promise<boolean> {
        try {
            this._defaultFont = font.id;

            const codeDiff = await this.layoutManager.updateDefaultFontInRootLayout(font);

            if (codeDiff) {
                await this.editorEngine.sandbox.writeFile(codeDiff.path, codeDiff.generated);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error setting default font:', error);
            return false;
        }
    }

    async uploadFonts(fontFiles: FontUploadFile[]): Promise<boolean> {
        try {
            const routerConfig = this.editorEngine.sandbox.routerConfig;
            if (!routerConfig?.basePath) {
                console.error('Could not get base path');
                return false;
            }

            await this.ensureConfigFilesExist();

            const fontConfig = await this.fontConfigManager.readFontConfigFile();
            if (!fontConfig) {
                console.error('Failed to read font config file');
                return false;
            }

            const result = await this.fontUploadManager.uploadFonts(
                fontFiles,
                routerConfig.basePath,
                fontConfig.ast,
            );

            if (result.success) {
                const { code } = generate(result.fontConfigAst);
                if (!this.fontConfigManager.fontConfigPath) {
                    return false;
                }
                await this.editorEngine.sandbox.writeFile(
                    this.fontConfigManager.fontConfigPath,
                    code,
                );
            }

            return result.success;
        } catch (error) {
            console.error('Error uploading fonts:', error);
            return false;
        }
    }

    async fetchNextFontBatch(): Promise<{ fonts: Font[]; hasMore: boolean }> {
        return this.fontSearchManager.fetchNextFontBatch();
    }

    async searchFonts(query: string): Promise<Font[]> {
        return this.fontSearchManager.searchFonts(query);
    }

    resetFontFetching(): void {
        this.fontSearchManager.resetFontFetching();
    }

    // Getters
    get fonts(): Font[] {
        return this._fonts;
    }

    get fontFamilies(): Font[] {
        return this._fontFamilies;
    }

    get systemFonts(): Font[] {
        return this.fontSearchManager.systemFonts;
    }

    get defaultFont(): string | null {
        return this._defaultFont;
    }

    get searchResults(): Font[] {
        return this.fontSearchManager.searchResults;
    }

    get isFetching(): boolean {
        return this.fontSearchManager.isFetching;
    }

    get isUploading(): boolean {
        return this.fontUploadManager.isUploading;
    }

    get isScanning(): boolean {
        return this._isScanning;
    }

    get currentFontIndex(): number {
        return this.fontSearchManager.currentFontIndex;
    }

    get hasMoreFonts(): boolean {
        return this.fontSearchManager.hasMoreFonts;
    }

    clear(): void {
        this._fonts = [];
        this._fontFamilies = [];
        this._defaultFont = null;
        this._isScanning = false;

        // Clear managers
        this.fontSearchManager.clear();
        this.fontSearchManager.updateFontsList([]);
        this.fontUploadManager.clear();

        // Clean up file watcher
        this.cleanupFontConfigFileWatcher();
    }

    /**
     * Gets the default font from the project
     */
    private async getCurrentDefaultFont(): Promise<string | null> {
        try {
            const defaultFont = await this.layoutManager.getCurrentDefaultFont();
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
     * Synchronizes detected fonts with the project configuration files
     */
    private async syncFontsWithConfigs(): Promise<void> {
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
                    await removeFontFromTailwindConfig(font, sandbox);
                    await this.layoutManager.removeFontVariableFromRootLayout(font.id);
                }
            }

            if (addedFonts.length > 0) {
                for (const font of addedFonts) {
                    await addFontToTailwindConfig(font, sandbox);
                    await this.layoutManager.addFontVariableToRootLayout(font.id);
                }
            }

            if (removedFonts.length > 0 || addedFonts.length > 0) {
                this._fonts = currentFonts;
                // Update font search manager with current fonts
                this.fontSearchManager.updateFontsList(this._fonts);
            }

            this.previousFonts = currentFonts;
        } catch (error) {
            console.error('Error syncing fonts:', error);
        }
    }

    /**
     * Ensures both font config and tailwind config files exist
     */
    private async ensureConfigFilesExist(): Promise<void> {
        const sandbox = this.editorEngine.sandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }

        await Promise.all([
            this.fontConfigManager.ensureFontConfigFileExists(),
            ensureTailwindConfigExists(sandbox),
        ]);
    }

    private cleanupFontConfigFileWatcher(): void {
        if (this.fontConfigFileWatcher) {
            this.fontConfigFileWatcher();
            this.fontConfigFileWatcher = null;
        }
    }
}
