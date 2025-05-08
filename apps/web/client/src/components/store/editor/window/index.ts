import { sendAnalytics } from '@/utils/analytics';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export class WindowManager {
    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get areAnyWindowsSelected() {
        return (
            this.editorEngine.elements.selected.length > 0 &&
            this.editorEngine.elements.selected.length === 0
        );
    }

    async takeActiveWebviewScreenshot(
        name: string,
        options?: {
            save: boolean;
        },
    ): Promise<{
        name?: string;
        image?: string;
    } | null> {
        // if (this.webviews.webviews.size === 0) {
        //     console.error('Failed to take screenshot, no webviews found');
        //     return null;
        // }
        // const frameId = Array.from(this.webviews.webviews.values())[0].frameView.id;
        // return this.takeWebviewScreenshot(name, frameId, options);
        return null;
    }

    async takeWebviewScreenshot(
        name: string,
        frameId: string,
        options?: {
            save: boolean;
        },
    ): Promise<{
        name?: string;
        image?: string;
    } | null> {
        // const frameView = this.editorEngine.frames.get(frameId);
        // if (!frameView) {
        //     console.error('No frameView found');
        //     return null;
        // }

        // const hasContent = await frameView.executeJavaScript(
        //     `document.body.innerText.trim().length > 0 || document.body.children.length > 0 `,
        // );
        // if (!hasContent) {
        //     console.error('No content found in frameView');
        //     return null;
        // }

        // const image: NativeImage = await frameView.capturePage();

        // if (options?.save) {
        //     const imageName = `${name}-preview.png`;
        //     const path: string | null = await invokeMainChannel(MainChannels.SAVE_IMAGE, {
        //         img: image.toDataURL(),
        //         name: imageName,
        //     });
        //     return {
        //         name: imageName,
        //     };
        // }
        // return {
        //     image: image.resize({ quality: 'good', height: 100 }).toDataURL({
        //         scaleFactor: 0.1,
        //     }),
        // };
        return null;
    }

    canDelete() {
        return this.editorEngine.frames.getAll().length > 1;
    }

    delete(id?: string) {
        // if (!this.canDeleteWindow()) {
        //     console.error('Cannot delete the last window');
        //     return;
        // }
        // let settings = null;
        // if (id) {
        //     settings = this.editorEngine.frames.get(id);
        //     if (!settings) {
        //         console.error('Window not found');
        //         return;
        //     }
        // } else if (this.editorEngine.frames.selected.length === 0) {
        //     console.error('No window selected');
        //     return;
        // } else {
        //     settings = this.editorEngine.frames.get(this.editorEngine.frames.selected[0].id) || null;
        // }
        // if (!settings) {
        //     console.error('Window not found');
        //     return;
        // }
        // this.ast.mappings.remove(settings.id);
        // this.canvas.frames = this.canvas.frames.filter((frame) => frame.id !== settings.id);
        // const frameView = this.webviews.getWebview(settings.id);
        // if (frameView) {
        //     this.webviews.deregister(frameView);
        // }
        sendAnalytics('window delete');
    }

    duplicate(id?: string) {
        // let settings: Frames | null = null;
        // if (id) {
        //     settings = this.canvas.getFrame(id) || null;
        // } else if (this.webviews.selected.length === 0) {
        //     console.error('No window selected');
        //     return;
        // } else {
        //     settings = this.canvas.getFrame(this.webviews.selected[0].id) || null;
        // }
        // if (!settings) {
        //     console.error('Window not found');
        //     return;
        // }
        // const currentFrame = settings;
        // const newFrame: Frames = {
        //     id: nanoid(),
        //     url: currentFrame.url,
        //     dimension: {
        //         width: currentFrame.dimension.width,
        //         height: currentFrame.dimension.height,
        //     },
        //     position: {
        //         x: currentFrame.position.x + currentFrame.dimension.width + 100,
        //         y: currentFrame.position.y,
        //     },
        //     aspectRatioLocked: currentFrame.aspectRatioLocked,
        //     orientation: currentFrame.orientation,
        //     device: currentFrame.device,
        //     theme: currentFrame.theme,
        // };

        // this.canvas.frames = [...this.canvas.frames, newFrame];
        sendAnalytics('window duplicate');
    }
}
