import { sendAnalytics } from '@/utils/analytics';
import type { WebFrame } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import type { FrameImpl } from '../canvas/frame';
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
        if (!this.canDelete()) {
            console.error('Cannot delete the last frame');
            return;
        }
        const settings: FrameImpl | null = this.getSelectedFrame(id);

        if (!settings) {
            console.error('Frame not found');
            return;
        }
        const currentFrame = settings;
        this.editorEngine.ast.mappings.remove(settings.id);
        this.editorEngine.canvas.frames = this.editorEngine.canvas.frames.filter((frame) => frame.id !== settings.id);
        this.editorEngine.frames.deselect(currentFrame);
        this.editorEngine.frames.disposeFrame(currentFrame.id);
        sendAnalytics('window delete');
    }

    duplicate(id?: string) {
        const settings: FrameImpl | null = this.getSelectedFrame(id);
        if (!settings) {
            console.error('Frame not found');
            return;
        }

        // Force to webframe for now, later we can support other frame types
        const currentFrame = settings as unknown as WebFrame;

        const newFrame: WebFrame = {
            id: nanoid(),
            url: currentFrame.url,
            dimension: {
                width: currentFrame.dimension.width,
                height: currentFrame.dimension.height,
            },
            position: {
                x: currentFrame.position.x + currentFrame.dimension.width + 100,
                y: currentFrame.position.y,
            },
            type: currentFrame.type,
            windowMetadata: currentFrame.windowMetadata,
        };

        this.editorEngine.canvas.frames = [...this.editorEngine.canvas.frames, newFrame];
        sendAnalytics('window duplicate');
    }

    getSelectedFrame(id?: string): FrameImpl | null {
        let settings: FrameImpl | null = null;
        if (id) {
            settings = this.editorEngine.canvas.getFrame(id) || null;
        } else if (this.editorEngine.frames.selected.length === 0) {
            console.error('No window selected');
            return null;
        } else {
            const selectedFrame = this.editorEngine.frames.selected[0];
            if (!selectedFrame) {
                console.error('No window selected');
                return null;
            }
            settings = this.editorEngine.canvas.getFrame(selectedFrame.frame.id) || null;
        }
        if (!settings) {
            console.error('Window not found');
            return null;
        }
        return settings as unknown as FrameImpl;
    }
}
