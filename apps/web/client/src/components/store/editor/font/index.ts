'use client';

import { type CodeDiff, type FontUploadFile } from '@onlook/models';
import type { Font } from '@onlook/models/assets';
import { generate } from '@onlook/parser';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { addFontToConfig, ensureFontConfigFileExists, getFontConfigPath, readFontConfigFile, removeFontFromConfig, scanExistingFonts, scanFontConfig } from './font-config';
import { FontSearchManager } from './font-search-manager';
import { uploadFonts } from './font-upload-manager';
import { addFontVariableToRootLayout, clearDefaultFontFromRootLayout, getCurrentDefaultFont, removeFontVariableFromRootLayout, updateDefaultFontInRootLayout, } from './layout-manager';
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
    private _isUploading = false;
    private previousFonts: Font[] = [];

    // Managers
    private fontSearchManager: FontSearchManager;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);

        // Initialize managers
        this.fontSearchManager = new FontSearchManager();
    }

    init() {
        this.loadInitialFonts();
        this.getCurrentDefaultFont();
        this.syncFontsWithConfigs();
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

            const fontConfigPath = await getFontConfigPath(this.editorEngine);
            if (!fontConfigPath) {
                console.error('No font config path found');
                return [];
            }
            // Scan fonts from config file
            const fonts = await scanFontConfig(fontConfigPath, this.editorEngine);
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
            const layoutPath = await this.editorEngine.activeSandbox.getLayoutPath();
            if (!layoutPath) {
                console.log('Could not get layout path');
                return [];
            }

            return await scanExistingFonts(layoutPath, this.editorEngine);
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
            const fontConfigPath = await getFontConfigPath(this.editorEngine);
            if (!fontConfigPath) {
                console.error('No font config path found');
                return false;
            }
            const success = await addFontToConfig(font, fontConfigPath, this.editorEngine);
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
            const fontConfigPath = await getFontConfigPath(this.editorEngine);
            if (!fontConfigPath) {
                console.error('No font config path found');
                return false;
            }
            const result = await removeFontFromConfig(font, fontConfigPath, this.editorEngine);

            if (result) {
                // Remove from fonts array
                this._fonts = this._fonts.filter((f) => f.id !== font.id);

                // Update font search manager
                this.fontSearchManager.updateFontsList(this._fonts);

                if (font.id === this._defaultFont) {
                    this._defaultFont = null;
                }

                // Remove font variable and font class from layout file
                await removeFontVariableFromRootLayout(font.id, this.editorEngine);

                // Remove font from Tailwind config
                await removeFontFromTailwindConfig(font, this.editorEngine.activeSandbox);

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
            const codeDiff = await updateDefaultFontInRootLayout(font, this.editorEngine);

            if (!codeDiff) {
                return false;
            }
            await this.editorEngine.fileSystem.writeFile(codeDiff.path, codeDiff.generated);
            // Reload all views after a delay to ensure the font is applied
            setTimeout(async () => {
                await this.editorEngine.frames.reloadAllViews();
            }, 500);
            return true;
        } catch (error) {
            console.error('Error setting default font:', error);
            return false;
        }
    }

    async clearDefaultFont(): Promise<boolean> {
        try {
            if (!this._defaultFont) {
                return true; // Already no default font
            }

            const currentDefaultFontId = this._defaultFont;
            const success = await clearDefaultFontFromRootLayout(currentDefaultFontId, this.editorEngine);

            if (success) {
                this._defaultFont = null;

                // Reload all views after a delay
                setTimeout(async () => {
                    await this.editorEngine.frames.reloadAllViews();
                }, 500);

                return true;
            }

            return false;
        } catch (error) {
            console.error('Error clearing default font:', error);
            return false;
        }
    }

    async uploadFonts(fontFiles: FontUploadFile[]): Promise<boolean> {
        this._isUploading = true;
        try {
            const routerConfig = await this.editorEngine.activeSandbox.getRouterConfig();
            if (!routerConfig?.basePath) {
                console.error('Could not get base path');
                return false;
            }

            await this.ensureConfigFilesExist();

            const fontConfigPath = await getFontConfigPath(this.editorEngine);
            if (!fontConfigPath) {
                console.error('No font config path found');
                return false;
            }
            const fontConfig = await readFontConfigFile(fontConfigPath, this.editorEngine);
            if (!fontConfig) {
                console.error('Failed to read font config file');
                return false;
            }

            const result = await uploadFonts(
                this.editorEngine,
                fontFiles,
                routerConfig.basePath,
                fontConfig.ast,
            );

            if (result.success) {
                const { code } = generate(result.fontConfigAst);
                if (!fontConfigPath) {
                    return false;
                }
                await this.editorEngine.fileSystem.writeFile(
                    fontConfigPath,
                    code,
                );
            }

            return result.success;
        } catch (error) {
            console.error('Error uploading fonts:', error);
            return false;
        } finally {
            this._isUploading = false;
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
        return this._isUploading;
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

    /**
     * Gets the default font from the project
     */
    private async getCurrentDefaultFont(): Promise<string | null> {
        try {
            const defaultFont = await getCurrentDefaultFont(this.editorEngine);
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
        const sandbox = this.editorEngine.activeSandbox;

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
                    await removeFontVariableFromRootLayout(font.id, this.editorEngine);
                }
            }

            if (addedFonts.length > 0) {
                for (const font of addedFonts) {
                    await addFontToTailwindConfig(font, sandbox);
                    await addFontVariableToRootLayout(font.id, this.editorEngine);
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
        const sandbox = this.editorEngine.activeSandbox;
        if (!sandbox) {
            console.error('No sandbox session found');
            return;
        }
        const fontConfigPath = await getFontConfigPath(this.editorEngine);
        if (!fontConfigPath) {
            console.error('No font config path found');
            return;
        }

        await Promise.all([
            ensureFontConfigFileExists(fontConfigPath, this.editorEngine),
            ensureTailwindConfigExists(sandbox),
        ]);
    }

    clear() {
        this._fonts = [];
        this.previousFonts = [];
        this._fontFamilies = [];
        this._defaultFont = null;
        this._isScanning = false;
        this._isUploading = false;
        this.fontSearchManager.clear();
        this.fontSearchManager.updateFontsList([]);
    }

}
