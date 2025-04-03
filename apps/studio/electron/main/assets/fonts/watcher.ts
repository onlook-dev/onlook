import { subscribe, type AsyncSubscription } from '@parcel/watcher';
import { DefaultSettings } from '@onlook/models/constants';
import * as pathModule from 'path';
import { scanFonts } from './scanner';
import fs from 'fs';
import { addFontVariableToLayout } from './layout';
import { removeFontVariableFromLayout } from './layout';
import { removeFontFromTailwindConfig, updateTailwindFontConfig } from './tailwind';
import type { Font } from '@onlook/models/assets';
import { detectRouterType } from '../../pages';

export class FontFileWatcher {
    private subscription: AsyncSubscription | null = null;
    private previousFonts: Font[] = [];

    async watch(projectRoot: string) {
        await this.clearSubscription();

        const fontPath = pathModule.resolve(projectRoot, DefaultSettings.FONT_CONFIG);
        const fontDir = pathModule.dirname(fontPath);

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
                            const expectedPath = pathModule.normalize(fontPath);

                            if (
                                (eventPath === expectedPath ||
                                    eventPath.endsWith(DefaultSettings.FONT_CONFIG)) &&
                                (event.type === 'update' || event.type === 'create')
                            ) {
                                try {
                                    this.syncFontsWithConfigs(projectRoot);
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
                (currFont) => !this.previousFonts.some((prevFont) => prevFont.id === currFont.id),
            );

            for (const font of removedFonts) {
                const routerConfig = await detectRouterType(projectRoot);
                if (routerConfig) {
                    if (routerConfig.type === 'app') {
                        const layoutPath = pathModule.join(routerConfig.basePath, 'layout.tsx');
                        await removeFontVariableFromLayout(layoutPath, font.id, ['html']);
                    } else {
                        const appPath = pathModule.join(routerConfig.basePath, '_app.tsx');
                        await removeFontVariableFromLayout(appPath, font.id, [
                            'div',
                            'main',
                            'section',
                            'body',
                        ]);
                    }
                }

                await removeFontFromTailwindConfig(projectRoot, font);
            }

            if (addedFonts.length > 0) {
                for (const font of addedFonts) {
                    await updateTailwindFontConfig(projectRoot, font);
                    await addFontVariableToLayout(projectRoot, font.id);
                }
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
