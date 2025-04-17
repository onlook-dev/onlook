import { useEditorEngine } from "@/components/store";
import type { WebFrame } from "@onlook/models";
import type { PreloadMethods } from '@onlook/penpal';
import { cn } from "@onlook/ui/utils";
import { observer } from "mobx-react-lite";
import { WindowMessenger, connect } from 'penpal';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type IframeHTMLAttributes } from 'react';

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
} & PreloadMethods;

interface WebFrameViewProps extends IframeHTMLAttributes<HTMLIFrameElement> {
    frame: WebFrame;
}

export const WebFrameComponent = observer(forwardRef<WebFrameView, WebFrameViewProps>(({ frame, ...props }, ref) => {
    const editorEngine = useEditorEngine();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const zoomLevel = useRef(1);
    const [iframeRemote, setIframeRemote] = useState<any>(null);

    const setupPenpalConnection = useCallback(async (iframe: HTMLIFrameElement) => {
        console.log("iFrame creating penpal connection frame ID:", frame.id);
        if (!iframe?.contentWindow) throw new Error('No content window found');
        const messenger = new WindowMessenger({
            remoteWindow: iframe.contentWindow,
            allowedOrigins: ['*'],
        });
        const connection = connect({ messenger, methods: {} });
        const remote = (await connection.promise) as unknown as PreloadMethods;
        await remote.setFrameId(frame.id);
        await remote.processDom();
        setIframeRemote(remote);
        console.log("Penpal connection set for frame ID:", frame.id);
    }, [frame.id]);

    const handleIframeLoad = async (e: React.SyntheticEvent<HTMLIFrameElement>) => {
        try {
            const iframe = e.currentTarget;
            await setupPenpalConnection(iframe);
            editorEngine.frames.register(frame, iframe as WebFrameView);
        } catch (error) {
            console.error('Initialize penpal connection failed:', error);
        }
    }

    const handleIframeError = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
        console.error('Iframe failed to load:', e);
        setTimeout(() => reloadIframe(), 5000);
    }

    const reloadIframe = () => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        iframe.src = iframe.src;
    }

    useImperativeHandle(ref, () => {
        const iframe = iframeRef.current;
        if (!iframe) {
            throw new Error('Iframe not found');
        }
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
            processDom: iframeRemote?.processDom,
            getElementAtLoc: iframeRemote?.getElementAtLoc,
            getElementByDomId: iframeRemote?.getElementByDomId,
            setFrameId: iframeRemote?.setFrameId,
            getElementIndex: iframeRemote?.getElementIndex,
            getComputedStyleByDomId: iframeRemote?.getComputedStyleByDomId,
            updateElementInstance: iframeRemote?.updateElementInstance,
            getFirstOnlookElement: iframeRemote?.getFirstOnlookElement,
            setElementType: iframeRemote?.setElementType,
            getElementType: iframeRemote?.getElementType,
            getParentElement: iframeRemote?.getParentElement,
            getChildrenCount: iframeRemote?.getChildrenCount,
            getOffsetParent: iframeRemote?.getOffsetParent,
            getActionLocation: iframeRemote?.getActionLocation,
            getActionElement: iframeRemote?.getActionElement,
            getInsertLocation: iframeRemote?.getInsertLocation,
            getRemoveAction: iframeRemote?.getRemoveAction,
            getTheme: iframeRemote?.getTheme,
            setTheme: iframeRemote?.setTheme,
        }) satisfies WebFrameView;
    }, [iframeRemote]);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        handleIframeLoad({ currentTarget: iframe } as any);
    }, [frame, handleIframeLoad, iframeRef.current]);

    return (
        <iframe
            ref={iframeRef}
            id={frame.id}
            className={cn('backdrop-blur-sm transition outline outline-4')}
            src={frame.url}
            sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
            allow="geolocation; microphone; camera; midi; encrypted-media"
            style={{ width: frame.dimension.width, height: frame.dimension.height }}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            {...props}
        />
    );
}));
