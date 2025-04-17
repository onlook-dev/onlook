'use client';

import { useEditorEngine } from "@/components/store";
import type { WebFrame } from "@onlook/models";
import { cn } from "@onlook/ui/utils";
import type { PreloadMethods } from '@onlook/web-preload/script/api';
import { observer } from "mobx-react-lite";
import { WindowMessenger, connect } from 'penpal';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type IframeHTMLAttributes } from 'react';

// Preload methods should be treated as promises
type PromisifiedPreloadMethods = {
    [K in keyof PreloadMethods]: (
        ...args: Parameters<PreloadMethods[K]>
    ) => Promise<ReturnType<PreloadMethods[K]>>;
}

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
} & PromisifiedPreloadMethods;

interface WebFrameViewProps extends IframeHTMLAttributes<HTMLIFrameElement> {
    frame: WebFrame;
}

const promisifyRemoteMethod = <T extends (...args: any[]) => any>(
    method: T | undefined
): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
    return async (...args: Parameters<T>) => {
        if (!method) throw new Error('Remote method not initialized');
        return method(...args);
    };
};

export const WebFrameComponent = observer(forwardRef<WebFrameView, WebFrameViewProps>(({ frame, ...props }, ref) => {
    const editorEngine = useEditorEngine();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const zoomLevel = useRef(1);
    const [iframeRemote, setIframeRemote] = useState<any>(null);

    useEffect(() => {
        if (iframeRemote) {
            console.log('Iframe - Penpal connection set for frame ID:', frame.id);
        }
    }, [iframeRemote]);

    const reloadIframe = () => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        iframe.src = iframe.src;
    }

    useImperativeHandle(ref, () => {
        const iframe = iframeRef.current;
        if (!iframe) {
            console.error('Iframe - Not found');
            return {} as WebFrameView;
        }

        // Register the iframe with the editor engine
        editorEngine.frames.register(frame, iframe as WebFrameView);

        const syncMethods = {
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
        };

        if (!iframeRemote) {
            console.error('Iframe - Failed to setup penpal connection: iframeRemote is null');
            return Object.assign(iframe, syncMethods) as WebFrameView;
        }

        const remoteMethods = {
            processDom: promisifyRemoteMethod(iframeRemote?.processDom),
            getElementAtLoc: promisifyRemoteMethod(iframeRemote?.getElementAtLoc),
            getElementByDomId: promisifyRemoteMethod(iframeRemote?.getElementByDomId),
            setFrameId: promisifyRemoteMethod(iframeRemote?.setFrameId),
            getElementIndex: promisifyRemoteMethod(iframeRemote?.getElementIndex),
            getComputedStyleByDomId: promisifyRemoteMethod(iframeRemote?.getComputedStyleByDomId),
            updateElementInstance: promisifyRemoteMethod(iframeRemote?.updateElementInstance),
            getFirstOnlookElement: promisifyRemoteMethod(iframeRemote?.getFirstOnlookElement),
            setElementType: promisifyRemoteMethod(iframeRemote?.setElementType),
            getElementType: promisifyRemoteMethod(iframeRemote?.getElementType),
            getParentElement: promisifyRemoteMethod(iframeRemote?.getParentElement),
            getChildrenCount: promisifyRemoteMethod(iframeRemote?.getChildrenCount),
            getOffsetParent: promisifyRemoteMethod(iframeRemote?.getOffsetParent),
            getActionLocation: promisifyRemoteMethod(iframeRemote?.getActionLocation),
            getActionElement: promisifyRemoteMethod(iframeRemote?.getActionElement),
            getInsertLocation: promisifyRemoteMethod(iframeRemote?.getInsertLocation),
            getRemoveAction: promisifyRemoteMethod(iframeRemote?.getRemoveAction),
            getTheme: promisifyRemoteMethod(iframeRemote?.getTheme),
            setTheme: promisifyRemoteMethod(iframeRemote?.setTheme),
            startDrag: promisifyRemoteMethod(iframeRemote?.startDrag),
            drag: promisifyRemoteMethod(iframeRemote?.drag),
            endDrag: promisifyRemoteMethod(iframeRemote?.endDrag),
            endAllDrag: promisifyRemoteMethod(iframeRemote?.endAllDrag),
            startEditingText: promisifyRemoteMethod(iframeRemote?.startEditingText),
            editText: promisifyRemoteMethod(iframeRemote?.editText),
            stopEditingText: promisifyRemoteMethod(iframeRemote?.stopEditingText),
            updateStyle: promisifyRemoteMethod(iframeRemote?.updateStyle),
            insertElement: promisifyRemoteMethod(iframeRemote?.insertElement),
            removeElement: promisifyRemoteMethod(iframeRemote?.removeElement),
            moveElement: promisifyRemoteMethod(iframeRemote?.moveElement),
            groupElements: promisifyRemoteMethod(iframeRemote?.groupElements),
            ungroupElements: promisifyRemoteMethod(iframeRemote?.ungroupElements),
            insertImage: promisifyRemoteMethod(iframeRemote?.insertImage),
            removeImage: promisifyRemoteMethod(iframeRemote?.removeImage),
        };

        return Object.assign(iframe, { ...syncMethods, ...remoteMethods }) satisfies WebFrameView;
    }, [iframeRemote, frame, iframeRef]);

    useEffect(() => {
        if (!iframeRef.current || !iframeRef.current.contentWindow) {
            console.error('No iframe found');
            return;
        }
        const messenger = new WindowMessenger({
            remoteWindow: iframeRef.current.contentWindow,
            allowedOrigins: ['*'],
        });

        const connection = connect({
            // iframe: ref.current,
            messenger,
            methods: {},
            timeout: 10000,
        });

        connection.promise.then((child) => {
            if (!child) {
                console.error('Iframe - Failed to setup penpal connection: child is null');
                return;
            }
            const remote = child as unknown as PreloadMethods;
            setIframeRemote(remote);
            remote.setFrameId(frame.id);
            remote.processDom();
            console.log('Iframe - Penpal connection set for frame ID:', frame.id);
        });

        connection.promise.catch((error) => {
            console.error('Iframe - Failed to setup penpal connection:', error);
            setTimeout(() => {
                reloadIframe();
            }, 1000);
        });

        return () => {
            connection.destroy();
            setIframeRemote(null);
        };
    }, []);

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
