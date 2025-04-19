import { subscribe, type AsyncSubscription } from '@parcel/watcher';
import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import * as pathModule from 'path';
import { scanFonts } from './scanner';
import fs from 'fs';
import { addFontVariableToLayout } from './layout';
import { removeFontVariableFromLayout } from './layout';
import { removeFontFromTailwindConfig, updateTailwindFontConfig } from './tailwind';
import type { Font } from '@onlook/models/assets';
import { detectRouterType } from '../../pages';
import { mainWindow } from '../../index';

export class FontFileWatcher {
    private subscription: AsyncSubscription | null = null;
    private previousFonts: Font[] = [];
    private selfModified: Set<string> = new Set();

    async watch(projectRoot: string) {
        await this.clearSubscription();

        const _fontPath = pathModule.resolve(projectRoot, DefaultSettings.FONT_CONFIG);
        const fontDir = pathModule.dirname(_fontPath);
        let _layoutPath: string = '';
        let _appPath: string = '';

        if (!fs.existsSync(fontDir)) {
            console.error(`Font directory does not exist: ${fontDir}`);
            return false;
        }
        try {
            this.previousFonts = await scanFonts(projectRoot);
        } catch (error) {
            console.error('Error scanning initial fonts state:', error);
            this.previousFonts = [];
        }

        const routerConfig = await detectRouterType(projectRoot);
        if (routerConfig) {
            if (routerConfig.type === 'app') {
                _layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
            } else {
                _appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
            }
        }

        try {
            this.subscription = await subscribe(
                fontDir,
                (err, events) => {
                    if (err) {
                        console.error(`Font watcher error: ${err}`);
                        return;
                    }

                    if (events.length > 0) {
                        for (const event of events) {
                            const eventPath = pathModule.normalize(event.path);
                            const fontPath = pathModule.normalize(_fontPath);
                            const layoutPath = pathModule.normalize(_layoutPath);
                            const appPath = pathModule.normalize(_appPath);
                            if (this.selfModified.has(eventPath)) {
                                this.selfModified.delete(eventPath);
                                continue;
                            }

                            if (
                                (eventPath === fontPath ||
                                    eventPath.endsWith(DefaultSettings.FONT_CONFIG)) &&
                                (event.type === 'update' || event.type === 'create')
                            ) {
                                try {
                                    this.syncFontsWithConfigs(projectRoot);
                                } catch (error) {
                                    console.error('Error syncing fonts with configs:', error);
                                }
                            }
                            if (
                                (eventPath === layoutPath || eventPath === appPath) &&
                                (event.type === 'update' || event.type === 'create')
                            ) {
                                this.selfModified.add(eventPath);
                                try {
                                    mainWindow?.webContents.send(MainChannels.GET_DEFAULT_FONT);
                                } catch (error) {
                                    console.error('Error syncing fonts with configs:', error);
                                }
                            }
                        }
                    }
                },
                {
                    ignore: ['**/node_modules/**', '**/.git/**'],
                },
            );
            return true;
        } catch (error) {
            console.error('Error setting up font file watcher subscription:', error);
            return false;
        }
    }

    private async syncFontsWithConfigs(projectRoot: string) {
        try {
            const currentFonts = await scanFonts(projectRoot);

            const removedFonts = this.previousFonts.filter(
                (prevFont) => !currentFonts.some((currFont) => currFont.id === prevFont.id),
            );

            const addedFonts = currentFonts.filter(
                (currFont) => !this.previousFonts.some((prevFont) => currFont.id === prevFont.id),
            );

            for (const font of removedFonts) {
                const routerConfig = await detectRouterType(projectRoot);
                if (routerConfig) {
                    if (routerConfig.type === 'app') {
                        const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
                        this.selfModified.add(layoutPath);
                        await removeFontVariableFromLayout(layoutPath, font.id, ['html']);
                    } else {
                        const appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
                        this.selfModified.add(appPath);
                        await removeFontVariableFromLayout(appPath, font.id, [
                            'div',
                            'main',
                            'section',
                            'body',
                        ]);
                    }
                }

                const tailwindConfigPath = pathModule.join(projectRoot, 'tailwind.config.ts');
                this.selfModified.add(tailwindConfigPath);
                await removeFontFromTailwindConfig(projectRoot, font);
            }

            if (addedFonts.length > 0) {
                for (const font of addedFonts) {
                    const tailwindConfigPath = pathModule.join(projectRoot, 'tailwind.config.ts');
                    this.selfModified.add(tailwindConfigPath);
                    await updateTailwindFontConfig(projectRoot, font);

                    const routerConfig = await detectRouterType(projectRoot);
                    if (routerConfig) {
                        if (routerConfig.type === 'app') {
                            const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
                            this.selfModified.add(layoutPath);
                            await addFontVariableToLayout(projectRoot, font.id);
                        } else {
                            const appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
                            this.selfModified.add(appPath);
                            await addFontVariableToLayout(projectRoot, font.id);
                        }
                    }
                }
            }

            if (removedFonts.length > 0 || addedFonts.length > 0) {
                mainWindow?.webContents.send(MainChannels.FONTS_CHANGED, {
                    currentFonts,
                    removedFonts,
                    addedFonts,
                });
            }

            this.previousFonts = currentFonts;
        } catch (error) {
            console.error('Error syncing fonts:', error);
        }
    }

    async clearSubscription() {
        if (this.subscription) {
            await this.subscription.unsubscribe();
            this.subscription = null;
        }
    }
}
