import { get, makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';
import { invokeMainChannel } from '@/lib/utils';
import { fontFamilies, MainChannels } from '@onlook/models';
import type { ProjectsManager } from '@/lib/projects';
import type { Font } from '@onlook/models/assets';

export class FontManager {
    private _fonts: Font[] = [];
    private _fontFamilies: Font[] = [];
    private _defaultFont: string | null = null;

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
        this.convertFont();
    }

    private convertFont() {
        this._fontFamilies = fontFamilies.map((font) => ({
            ...font,
            weight: font.weights.map((weight) => weight.toString()),
            styles: font.styles.map((style) => style.toString()),
            variable: `--font-${font.id}`,
        }));
    }

    async scanFonts() {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
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
            return;
        }

        try {
            await invokeMainChannel(MainChannels.REMOVE_FONT, {
                projectRoot,
                font,
            });

            await this.scanFonts();
        } catch (error) {
            console.error('Error removing font:', error);
        }
    }

    async setDefaultFont(font: Font) {
        const projectRoot = this.projectsManager.project?.folderPath;
        if (!projectRoot) {
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

    get fonts() {
        return this._fonts;
    }

    get fontFamilies() {
        return this._fontFamilies;
    }

    get defaultFont() {
        return this._defaultFont;
    }

    dispose() {
        this._fonts = [];
    }
}
