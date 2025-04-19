import { useEditorEngine } from "@/components/store";
import type { DomElement, WebFrame } from "@onlook/models";
import { cn } from "@onlook/ui-v4/utils";
import { observer } from "mobx-react-lite";
import { WindowMessenger, connect } from 'penpal';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type IframeHTMLAttributes } from 'react';

type PenpalRemote = {
    setFrameId: (frameId: string) => void;
    processDom: () => void;
    getElementAtLoc: (x: number, y: number, getStyle: boolean) => Promise<DomElement>;
    getDomElementByDomId: (domId: string, getStyle: boolean) => Promise<DomElement>;
};

// TODO: Move this to a shared package
export type WebFrameView = HTMLIFrameElement &
    Pick<
        Electron.WebviewTag,
        | 'setZoomLevel'
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
    } & PenpalRemote;

interface WebFrameViewProps extends IframeHTMLAttributes<HTMLIFrameElement> {
    frame: WebFrame;
}

export const WebFrameComponent = observer(forwardRef<WebFrameView, WebFrameViewProps>(({ frame, ...props }, ref) => {
    const editorEngine = useEditorEngine();
    const [iframeRemote, setIframeRemote] = useState<any>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const zoomLevel = useRef(1);

    const setupPenpalConnection = useCallback(async (iframe: HTMLIFrameElement) => {
        console.log('Initializing penpal connection for frame', frame.id);
        if (!iframe?.contentWindow) {
            throw new Error('No content window found');
        }
        const messenger = new WindowMessenger({
            remoteWindow: iframe.contentWindow,
            // TODO: Use a proper origin
            allowedOrigins: ['*'],
        });
        const connection = connect({
            messenger,
            // Methods we are exposing to the iframe window.
            methods: {}
        });
        const remote = (await connection.promise) as unknown as PenpalRemote;
        await remote.setFrameId(frame.id);
        await remote.processDom();
        setIframeRemote(remote);
        console.log('Penpal connection initialized for frame', frame.id);
    }, [frame.id, setIframeRemote]);

    const setupIframe = useCallback(async (iframe: HTMLIFrameElement) => {
        try {
            await setupPenpalConnection(iframe);
            editorEngine.frames.register(frame, iframe as WebFrameView);
        } catch (error) {
            console.error('Initialize penpal connection failed:', error);
        }
    }, [setupPenpalConnection]);

    const handleIframeLoad = useCallback(() => {
        const iframe = iframeRef.current;
        if (!iframe) {
            console.error('No iframe found');
            return;
        }

        if (iframe.contentDocument?.readyState === 'complete') {
            setupIframe(iframe);
        } else {
            iframe.addEventListener('load', () => setupIframe(iframe), { once: true });
        }
    }, [setupIframe]);

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
            getElementAtLoc: iframeRemote?.getElementAtLoc,
            getDomElementByDomId: iframeRemote?.getDomElementByDomId,
            setFrameId: iframeRemote?.setFrameId,
        });

        return iframe as WebFrameView;
    }, [iframeRemote]);
    return (
        <iframe
            ref={iframeRef}
            id={frame.id}
            className={cn(
                'backdrop-blur-sm transition outline outline-4',
                // shouldShowDomFailed ? 'bg-transparent' : 'bg-white',
                // selected ? getSelectedOutlineColor() : 'outline-transparent',
            )}
            src={frame.url}
            sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
            allow="geolocation; microphone; camera; midi; encrypted-media"
            style={{
                width: frame.dimension.width,
                height: frame.dimension.height,
            }}
            {...props}
        />
    );
}));