'use client';

import { useEditorEngine } from '@/components/store/editor';
import type { WebFrame } from '@onlook/models';
import {
    PENPAL_PARENT_CHANNEL,
    promisifyMethod,
    type PenpalChildMethods,
    type PenpalParentMethods,
    type PromisifiedPendpalChildMethods,
} from '@onlook/penpal';
import { cn } from '@onlook/ui/utils';
import { debounce } from 'lodash';
import { observer } from 'mobx-react-lite';
import { WindowMessenger, connect } from 'penpal';
import {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
    type IframeHTMLAttributes,
} from 'react';

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
} & PromisifiedPendpalChildMethods;

interface WebFrameViewProps extends IframeHTMLAttributes<HTMLIFrameElement> {
    frame: WebFrame;
}

export const WebFrameComponent = observer(
    forwardRef<WebFrameView, WebFrameViewProps>(({ frame, ...props }, ref) => {
        const editorEngine = useEditorEngine();
        const iframeRef = useRef<HTMLIFrameElement>(null);
        const zoomLevel = useRef(1);
        const [penpalChild, setPenpalChild] = useState<any>(null);
        const connectionRef = useRef<ReturnType<typeof connect> | null>(null);

        const reloadIframe = () => {
            const iframe = iframeRef.current;
            if (!iframe) return;
            iframe.src = iframe.src;
        };

        const setupPenpalConnection = () => {
            if (!iframeRef.current?.contentWindow) {
                console.error('No iframe found');
                return;
            }

            // Destroy any existing connection before creating a new one
            if (connectionRef.current) {
                connectionRef.current.destroy();
                connectionRef.current = null;
            }

            const messenger = new WindowMessenger({
                remoteWindow: iframeRef.current.contentWindow,
                allowedOrigins: ['*'],
            });

            const connection = connect({
                messenger,
                methods: {
                    getFrameId: () => frame.id,
                } satisfies PenpalParentMethods,
            });

            // Store the connection reference
            connectionRef.current = connection;

            connection.promise.then((child) => {
                if (!child) {
                    console.error(
                        `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Failed to setup penpal connection: child is null`,
                    );
                    debouncedReloadIframe();
                    return;
                }
                const remote = child as unknown as PenpalChildMethods;
                setPenpalChild(remote);
                remote.setFrameId(frame.id);
                remote.processDom();
                console.log(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Penpal connection set `);
            });

            connection.promise.catch((error) => {
                console.error(
                    `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Failed to setup penpal connection:`,
                    error,
                );
                debouncedReloadIframe();
            });
        };

        useImperativeHandle(ref, () => {
            const iframe = iframeRef.current;
            if (!iframe) {
                console.error(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Iframe - Not found`);
                return {} as WebFrameView;
            }

            const syncMethods = {
                supportsOpenDevTools: () =>
                    !!iframe.contentWindow && 'openDevTools' in iframe.contentWindow,
                setZoomLevel: (level: number) => {
                    zoomLevel.current = level;
                    iframe.style.transform = `scale(${level})`;
                    iframe.style.transformOrigin = 'top left';
                },
                loadURL: (url: string) => {
                    iframe.src = url;
                },
                canGoForward: () => (iframe.contentWindow?.history?.length ?? 0) > 0,
                canGoBack: () => (iframe.contentWindow?.history?.length ?? 0) > 0,
                goForward: () => iframe.contentWindow?.history.forward(),
                goBack: () => iframe.contentWindow?.history.back(),
                reload: () => reloadIframe(),
                isLoading: () => iframe.contentDocument?.readyState !== 'complete',
            };

            if (!penpalChild) {
                console.warn(
                    `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Failed to setup penpal connection: iframeRemote is null`,
                );
                return Object.assign(iframe, syncMethods) as WebFrameView;
            }

            const remoteMethods = {
                processDom: promisifyMethod(penpalChild?.processDom),
                getElementAtLoc: promisifyMethod(penpalChild?.getElementAtLoc),
                getElementByDomId: promisifyMethod(penpalChild?.getElementByDomId),
                setFrameId: promisifyMethod(penpalChild?.setFrameId),
                getElementIndex: promisifyMethod(penpalChild?.getElementIndex),
                getComputedStyleByDomId: promisifyMethod(penpalChild?.getComputedStyleByDomId),
                updateElementInstance: promisifyMethod(penpalChild?.updateElementInstance),
                getFirstOnlookElement: promisifyMethod(penpalChild?.getFirstOnlookElement),
                setElementType: promisifyMethod(penpalChild?.setElementType),
                getElementType: promisifyMethod(penpalChild?.getElementType),
                getParentElement: promisifyMethod(penpalChild?.getParentElement),
                getChildrenCount: promisifyMethod(penpalChild?.getChildrenCount),
                getOffsetParent: promisifyMethod(penpalChild?.getOffsetParent),
                getActionLocation: promisifyMethod(penpalChild?.getActionLocation),
                getActionElement: promisifyMethod(penpalChild?.getActionElement),
                getInsertLocation: promisifyMethod(penpalChild?.getInsertLocation),
                getRemoveAction: promisifyMethod(penpalChild?.getRemoveAction),
                getTheme: promisifyMethod(penpalChild?.getTheme),
                setTheme: promisifyMethod(penpalChild?.setTheme),
                startDrag: promisifyMethod(penpalChild?.startDrag),
                drag: promisifyMethod(penpalChild?.drag),
                dragAbsolute: promisifyMethod(penpalChild?.dragAbsolute),
                endDragAbsolute: promisifyMethod(penpalChild?.endDragAbsolute),
                endDrag: promisifyMethod(penpalChild?.endDrag),
                endAllDrag: promisifyMethod(penpalChild?.endAllDrag),
                startEditingText: promisifyMethod(penpalChild?.startEditingText),
                editText: promisifyMethod(penpalChild?.editText),
                stopEditingText: promisifyMethod(penpalChild?.stopEditingText),
                updateStyle: promisifyMethod(penpalChild?.updateStyle),
                insertElement: promisifyMethod(penpalChild?.insertElement),
                removeElement: promisifyMethod(penpalChild?.removeElement),
                moveElement: promisifyMethod(penpalChild?.moveElement),
                groupElements: promisifyMethod(penpalChild?.groupElements),
                ungroupElements: promisifyMethod(penpalChild?.ungroupElements),
                insertImage: promisifyMethod(penpalChild?.insertImage),
                removeImage: promisifyMethod(penpalChild?.removeImage),
                isChildTextEditable: promisifyMethod(penpalChild?.isChildTextEditable),
                handleBodyReady: promisifyMethod(penpalChild?.handleBodyReady),
                captureScreenshot: promisifyMethod(penpalChild?.captureScreenshot),
            };

            // Register the iframe with the editor engine
            editorEngine.frames.register(frame, iframe as WebFrameView);

            return Object.assign(iframe, {
                ...syncMethods,
                ...remoteMethods,
            }) satisfies WebFrameView;
        }, [penpalChild, frame, iframeRef]);

        useEffect(() => {
            setupPenpalConnection();

            return () => {
                if (connectionRef.current) {
                    connectionRef.current.destroy();
                    connectionRef.current = null;
                }
                setPenpalChild(null);
            };
        }, []);

        const debouncedReloadIframe = debounce(() => {
            reloadIframe();
        }, 1000);

        return (
            <iframe
                ref={iframeRef}
                id={frame.id}
                className={cn('backdrop-blur-sm transition outline outline-4')}
                src={frame.url}
                sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
                allow="geolocation; microphone; camera; midi; encrypted-media"
                style={{ width: frame.dimension.width, height: frame.dimension.height }}
                onLoad={setupPenpalConnection}
                onError={debouncedReloadIframe}
                {...props}
            />
        );
    }),
);
