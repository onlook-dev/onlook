import { sendAnalytics } from "@/utils/analytics";
import { makeAutoObservable } from "mobx";
import type { EditorEngine } from "..";

export class WindowManager {
    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get isWindowSelected() {
        return this.editorEngine.elements.selected.length > 0 && this.editorEngine.elements.selected.length === 0;
    }

    // async takeActiveWebviewScreenshot(
    //     name: string,
    //     options?: {
    //         save: boolean;
    //     },
    // ): Promise<{
    //     name?: string;
    //     image?: string;
    // } | null> {
    //     if (this.webviews.webviews.size === 0) {
    //         console.error('Failed to take screenshot, no webviews found');
    //         return null;
    //     }
    //     const webviewId = Array.from(this.webviews.webviews.values())[0].webview.id;
    //     return this.takeWebviewScreenshot(name, webviewId, options);
    // }

    // async takeWebviewScreenshot(
    //     name: string,
    //     webviewId: string,
    //     options?: {
    //         save: boolean;
    //     },
    // ): Promise<{
    //     name?: string;
    //     image?: string;
    // } | null> {
    //     const webview = this.webviews.getWebview(webviewId);
    //     if (!webview) {
    //         console.error('No webview found');
    //         return null;
    //     }

    //     const hasContent = await webview.executeJavaScript(
    //         `document.body.innerText.trim().length > 0 || document.body.children.length > 0 `,
    //     );
    //     if (!hasContent) {
    //         console.error('No content found in webview');
    //         return null;
    //     }

    //     const image: NativeImage = await webview.capturePage();

    //     if (options?.save) {
    //         const imageName = `${name}-preview.png`;
    //         const path: string | null = await invokeMainChannel(MainChannels.SAVE_IMAGE, {
    //             img: image.toDataURL(),
    //             name: imageName,
    //         });
    //         return {
    //             name: imageName,
    //         };
    //     }
    //     return {
    //         image: image.resize({ quality: 'good', height: 100 }).toDataURL({
    //             scaleFactor: 0.1,
    //         }),
    //     };
    // }

    canDeleteWindow() {
        // return this.canvas.frames.length > 1;
    }

    deleteWindow(id?: string) {
        // if (this.canvas.frames.length === 1) {
        //     console.error('Cannot delete the last window');
        //     return;
        // }
        // let settings: FrameSettings | null = null;
        // if (id) {
        //     settings = this.canvas.getFrame(id) || null;
        //     if (!settings) {
        //         console.error('Window not found');
        //         return;
        //     }
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
        // this.ast.mappings.remove(settings.id);
        // this.canvas.frames = this.canvas.frames.filter((frame) => frame.id !== settings.id);
        // const webview = this.webviews.getWebview(settings.id);
        // if (webview) {
        //     this.webviews.deregister(webview);
        // }
        sendAnalytics('window delete');
    }

    duplicateWindow(id?: string) {
        // let settings: FrameSettings | null = null;
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
        // const newFrame: FrameSettings = {
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
