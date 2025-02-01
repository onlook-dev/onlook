import {
    forwardRef,
    useImperativeHandle,
    useRef,
    type IframeHTMLAttributes,
    useCallback,
    useEffect,
} from 'react';
import type { NativeImage } from 'electron';
import { WebviewChannels } from '@onlook/models/constants';
import type { TOnlookWindow } from '/electron/preload/webview/api';

export type IFrameView = HTMLIFrameElement &
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

interface IFrameViewProps extends IframeHTMLAttributes<HTMLIFrameElement> {
    preload?: string;
}

export const FrameView = forwardRef<IFrameView, IFrameViewProps>(({ preload, ...props }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const zoomLevel = useRef(1);

    const handleIframeLoad = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe || !preload) {
            console.error('No iframe or preload');
            return;
        }

        const injectPreloadScript = () => {
            try {
                console.log('Injecting preload script', preload);
                const script = window.document.createElement('script');
                script.src = preload;
                script.onerror = (e) => console.error('Preload script error:', e);
                script.onload = () => console.log('Preload script loaded');
                window.document.head.appendChild(script);
            } catch (error) {
                console.error('Preload injection failed:', error);
            }
        };

        if (iframe.contentDocument?.readyState === 'complete') {
            injectPreloadScript();
        } else {
            iframe.addEventListener('load', injectPreloadScript, { once: true });
        }
    }, [preload]);

    useEffect(() => {
        handleIframeLoad();
    }, [handleIframeLoad]);

    useImperativeHandle(ref, () => {
        const iframe = iframeRef.current!;

        Object.assign(iframe, {
            supportsOpenDevTools: () => {
                const contentWindow = iframe.contentWindow;
                return !!contentWindow && 'openDevTools' in contentWindow;
            },
            openDevTools: () => {
                const contentWindow = iframe.contentWindow;
                if (!contentWindow || !('openDevTools' in contentWindow)) {
                    throw new Error('openDevTools() is not supported in this browser');
                }
                (contentWindow as any as Electron.WebContents).openDevTools();
            },
            setZoomLevel: (level: number) => {
                zoomLevel.current = level;
                iframe.style.transform = `scale(${level})`;
                iframe.style.transformOrigin = 'top left';
            },
            executeJavaScript: async (code: string): Promise<any> => {
                const contentWindow = iframe.contentWindow;
                if (!contentWindow) {
                    throw new Error('No iframe content window available');
                }

                return new Promise((resolve, reject) => {
                    const channel = new MessageChannel();
                    const messageId = `execute_${Date.now()}_${Math.random()}`;

                    channel.port1.onmessage = (event) => {
                        channel.port1.close();
                        if (event.data.error) {
                            reject(new Error(event.data.error));
                        } else {
                            resolve(event.data.result);
                        }
                    };

                    const wrappedCode = `
                        (async () => {
                            try {
                                const result = await (${code});
                                window.postMessage({
                                    type: 'execute-response',
                                    messageId: '${messageId}',
                                    result
                                }, '*', [event.ports[0]]);
                            } catch (error) {
                                window.postMessage({
                                    type: 'execute-error',
                                    messageId: '${messageId}',
                                    error: error.message
                                }, '*', [event.ports[0]]);
                            }
                        })();
                    `;

                    contentWindow.postMessage(
                        {
                            type: WebviewChannels.EXECUTE_CODE,
                            code: wrappedCode,
                            messageId,
                        },
                        '*',
                        [channel.port2],
                    );
                });
            },
            loadURL: async (url: string) => {
                iframe.src = url;
            },
            canGoForward: () => {
                return (iframe.contentWindow?.history?.length ?? 0) > 0;
            },
            canGoBack: () => {
                return (iframe.contentWindow?.history?.length ?? 0) > 0;
            },
            goForward: () => {
                iframe.contentWindow?.history.forward();
            },
            goBack: () => {
                iframe.contentWindow?.history.back();
            },
            reload: () => {
                iframe.contentWindow?.location.reload();
            },
            isLoading: (): boolean => {
                const contentDocument = iframe.contentDocument;
                if (!contentDocument) {
                    throw new Error(
                        'Could not call isLoading(): iframe.contentDocument is null/undefined',
                    );
                }
                return contentDocument.readyState !== 'complete';
            },
            capturePage: async (): Promise<NativeImage> => {
                const contentWindow = iframe.contentWindow;
                if (!contentWindow || !('capturePage' in contentWindow)) {
                    throw new Error('capturePage() is not supported in this environment');
                }
                return (contentWindow as any as Electron.WebContents).capturePage();
            },
            capturePageAsCanvas: async (): Promise<HTMLCanvasElement> => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error('Failed to get canvas context');
                }

                const img = new Image();
                const blob = await new Promise<Blob>((resolve) => {
                    const svg = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="${iframe.offsetWidth}" height="${iframe.offsetHeight}">
                            <foreignObject width="100%" height="100%">
                                <html xmlns="http://www.w3.org/1999/xhtml">
                                    ${iframe.contentDocument?.documentElement.outerHTML}
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

                canvas.width = iframe.offsetWidth;
                canvas.height = iframe.offsetHeight;
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                return canvas;
            },
        });

        return iframe as IFrameView;
    }, []);

    return <iframe ref={iframeRef} {...props} />;
});

FrameView.displayName = 'FrameView';
