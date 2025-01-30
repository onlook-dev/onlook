import type { NativeImage } from 'electron';

export type FrameViewInterface = HTMLIFrameElement &
    Pick<
        Electron.WebviewTag,
        | 'setZoomLevel'
        | 'executeJavaScript'
        | 'loadURL'
        | 'openDevTools'
        | 'canGoForward'
        | 'canGoBack'
        | 'goForward'
        | 'goBack'
        | 'reload'
        | 'isLoading'
        | 'capturePage'
    > & {
        supportsOpenDevTools: () => boolean;
        capturePageAsCanvas: () => Promise<HTMLCanvasElement>;
    };

export class IFrameView extends HTMLIFrameElement implements FrameViewInterface {
    private zoomLevel: number = 1;

    constructor() {
        super();
    }

    supportsOpenDevTools() {
        return !!this.contentWindow && 'openDevTools' in this.contentWindow;
    }

    openDevTools() {
        if (!this.supportsOpenDevTools()) {
            throw new Error('openDevTools() is not supported in this browser');
        }
        (this.contentWindow as any as Electron.WebContents).openDevTools();
    }

    setZoomLevel(level: number) {
        this.zoomLevel = level;
        this.style.transform = `scale(${level})`;
        this.style.transformOrigin = 'top left';
    }

    async executeJavaScript(code: string): Promise<any> {
        if (!this.contentWindow) {
            throw new Error('No iframe content window available');
        }

        return new Promise((resolve, reject) => {
            // Create a unique message channel for this execution
            const channel = new MessageChannel();
            const messageId = `execute_${Date.now()}_${Math.random()}`;

            // Listen for the response
            channel.port1.onmessage = (event) => {
                if (event.data.messageId === messageId) {
                    channel.port1.close();
                    resolve(event.data.result);
                }
            };

            // Inject the message listener and execution code
            const wrappedCode = `
                try {
                    const result = await (async () => {
                      ${code} 
                    })();
                    window.postMessage({ messageId: "${messageId}", result }, "*");
                } catch (error) {
                    window.postMessage({ messageId: "${messageId}", error: error.message }, "*");
                }
            `;

            try {
                this.contentWindow!.postMessage(
                    {
                        type: 'executeJavaScript',
                        code: wrappedCode,
                        messageId,
                    },
                    '*',
                    [channel.port2],
                );
            } catch (error) {
                console.error('Error executing JavaScript:', error);
                reject(error);
            }
        });
    }

    async loadURL(url: string) {
        this.src = url;
    }

    canGoForward() {
        return (this.contentWindow?.history?.length ?? 0) > 0;
    }

    canGoBack() {
        return (this.contentWindow?.history?.length ?? 0) > 0;
    }

    goForward() {
        this.contentWindow?.history.forward();
    }

    goBack() {
        this.contentWindow?.history.back();
    }

    reload() {
        this.contentWindow?.location.reload();
    }

    isLoading(): boolean {
        if (!this.contentDocument) {
            throw new Error('Could not call isLoading(): iframe.contentDocument is null/undefined');
        }
        return this.contentDocument.readyState !== 'complete';
    }

    async capturePage(): Promise<NativeImage> {
        if (!this.contentWindow || !('capturePage' in this.contentWindow)) {
            throw new Error('capturePage() is not supported in this environment');
        }

        return (this.contentWindow as any as Electron.WebContents).capturePage();
    }

    // TODO: test this
    async capturePageAsCanvas(): Promise<HTMLCanvasElement> {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        // Create temporary img element from iframe content
        const img = new Image();
        const blob = await new Promise<Blob>((resolve) => {
            const svg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${this.offsetWidth}" height="${this.offsetHeight}">
                    <foreignObject width="100%" height="100%">
                        <html xmlns="http://www.w3.org/1999/xhtml">
                            ${this.contentDocument?.documentElement.outerHTML}
                        </html>
                    </foreignObject>
                </svg>
            `;
            const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
            resolve(blob);
        });

        const url = URL.createObjectURL(blob);
        await new Promise((resolve) => {
            img.onload = resolve;
            img.src = url;
        });

        canvas.width = this.offsetWidth;
        canvas.height = this.offsetHeight;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        return canvas;
    }
}
