import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '..';
import { invokeMainChannel } from '@/lib/utils';
import { fontFamilies, MainChannels } from '@onlook/models';
import type { ProjectsManager } from '@/lib/projects';
import type { Font } from '@onlook/models/assets';
import type { FontFile } from '@/routes/editor/LayersPanel/BrandTab/FontPanel/FontFiles';

export class FontManager {
    private _fonts: Font[] = [];
    private _fontFamilies: Font[] = [];
    private _defaultFont: string | null = null;
    private disposers: Array<() => void> = [];

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
        this.convertFont();

        // Watch for project changes and set up watcher when a project is selected
        const disposer = reaction(
            () => this.projectsManager.project?.folderPath,
            (folderPath) => {
                console.log('Project path changed, setting up font watcher:', folderPath);
                if (folderPath) {
                    this.watchFontFile(folderPath);
                }
            },
            { fireImmediately: true }, // Run immediately if there's already a project
        );

        this.disposers.push(disposer);
    }

    private convertFont() {
        this._fontFamilies = fontFamilies.map((font) => ({
            ...font,
            weight: font.weights.map((weight) => weight.toString()),
            styles: font.styles.map((style) => style.toString()),
            variable: `--font-${font.id}`,
        }));
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

    get fonts() {
        return this._fonts;
    }

    get fontFamilies() {
        return this._fontFamilies;
    }

    get defaultFont() {
        return this._defaultFont;
    }

    get newFonts() {
        return this._fontFamilies.filter(
            (fontFamily) => !this._fonts.some((font) => font.family === fontFamily.family),
        );
    }

    dispose() {
        this._fonts = [];
        this._fontFamilies = [];
        this._defaultFont = null;

        // Clean up all reactions
        this.disposers.forEach((disposer) => disposer());
        this.disposers = [];
    }
}
