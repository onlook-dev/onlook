import { useEditorEngine } from "@/components/store";
import type { DomElement, WebFrame } from "@onlook/models";
import { cn } from "@onlook/ui/utils";
import { observer } from "mobx-react-lite";
import { WindowMessenger, connect } from 'penpal';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type IframeHTMLAttributes } from 'react';

type PenpalRemote = {
    setFrameId: (frameId: string) => void;
    processDom: () => void;
    getElementAtLoc: (x: number, y: number, getStyle: boolean) => Promise<DomElement>;
    getDomElementByDomId: (domId: string, getStyle: boolean) => Promise<DomElement>;
};

export type WebFrameView = HTMLIFrameElement & {
    setZoomLevel: (level: number) => void;
    loadURL: (url: string) => void;
    supportsOpenDevTools: () => boolean;
    canGoForward: () => boolean;
    canGoBack: () => boolean;
    goForward: () => void;
    goBack: () => void;
    reload: () => void;
    isLoading: () => boolean;
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
        console.log("iFrame creating penpal connection frame ID:", frame.id);
        if (!iframe?.contentWindow) throw new Error('No content window found');
        const messenger = new WindowMessenger({
            remoteWindow: iframe.contentWindow,
            allowedOrigins: ['*'],
        });
        const connection = connect({ messenger, methods: {} });
        const remote = await connection.promise as unknown as PenpalRemote;
        await remote.setFrameId(frame.id);
        await remote.processDom();
        setIframeRemote(remote);
        console.log("Penpal connection set for frame ID:", frame.id);
    }, [frame.id]);

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
        if (!iframe) return;

        if (iframe.contentDocument?.readyState === 'complete') {
            setupIframe(iframe);
        } else {
            iframe.addEventListener('load', () => setupIframe(iframe), { once: true });
            iframe.addEventListener('error', () => {
                console.error('Iframe failed to load:', iframe.src);
                setTimeout(() => reloadIframe(), 5000);
            });
        }
    }, [setupIframe]);

    useEffect(() => {
        handleIframeLoad();
    }, [handleIframeLoad]);

    const reloadIframe = () => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        iframe.src = iframe.src;
    }

    useImperativeHandle(ref, () => {
        const iframe = iframeRef.current!;
        return Object.assign(iframe, {
            supportsOpenDevTools: () => !!iframe.contentWindow && 'openDevTools' in iframe.contentWindow,
            setZoomLevel: (level: number) => {
                zoomLevel.current = level;
                iframe.style.transform = `scale(${level})`;
                iframe.style.transformOrigin = 'top left';
            },
            loadURL: (url: string) => { iframe.src = url; },
            canGoForward: () => (iframe.contentWindow?.history?.length ?? 0) > 0,
            canGoBack: () => (iframe.contentWindow?.history?.length ?? 0) > 0,
            goForward: () => iframe.contentWindow?.history.forward(),
            goBack: () => iframe.contentWindow?.history.back(),
            reload: () => iframe.contentWindow?.location.reload(),
            isLoading: () => iframe.contentDocument?.readyState !== 'complete',
            getElementAtLoc: iframeRemote?.getElementAtLoc,
            getDomElementByDomId: iframeRemote?.getDomElementByDomId,
            setFrameId: iframeRemote?.setFrameId,
        }) as WebFrameView;
    }, [iframeRemote]);

    return (
        <iframe
            ref={iframeRef}
            id={frame.id}
            className={cn('backdrop-blur-sm transition outline outline-4')}
            src={frame.url}
            sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
            allow="geolocation; microphone; camera; midi; encrypted-media"
            style={{ width: frame.dimension.width, height: frame.dimension.height }}
            {...props}
        />
    );
}));
