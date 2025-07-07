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
        const isConnecting = useRef(false);

        const reloadIframe = () => {
            try {
                console.log('Reloading iframe');
                const iframe = iframeRef.current;
                if (!iframe) return;
                iframe.src = iframe.src;
                iframe.contentWindow?.location.reload();
            } catch (error) {
                console.error('Failed to reload iframe', error);
            }
        };

        const setupPenpalConnection = () => {
            if (!iframeRef.current?.contentWindow) {
                console.error('No iframe found');
                return;
            }

            if (isConnecting.current) {
                console.log(
                    `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Connection already in progress`,
                );
                return;
            }
            isConnecting.current = true;

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
                    onWindowMutated: () => {
                        editorEngine.frameEvent.handleWindowMutated();
                    },
                    onWindowResized: () => {
                        editorEngine.frameEvent.handleWindowResized();
                    },
                    onDomProcessed: (data: { layerMap: Record<string, any>; rootNode: any }) => {
                        editorEngine.frameEvent.handleDomProcessed(frame.id, data);
                    },
                } satisfies PenpalParentMethods,
            });

            // Store the connection reference
            connectionRef.current = connection;

            connection.promise.then((child) => {
                isConnecting.current = false;
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
                isConnecting.current = false;
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

            // Create a wrapper that adds error handling to promisified methods
            const promisifyMethodWithErrorHandling = (method: any) => {
                const promisifiedMethod = promisifyMethod(method);
                return async (...args: any[]) => {
                    try {
                        return await promisifiedMethod(...args);
                    } catch (error) {
                        console.error(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Method failed:`, error);
                        debouncedReloadIframe();
                        throw error;
                    }
                };
            };

            const remoteMethods = {
                processDom: promisifyMethodWithErrorHandling(penpalChild?.processDom),
                getElementAtLoc: promisifyMethodWithErrorHandling(penpalChild?.getElementAtLoc),
                getElementByDomId: promisifyMethodWithErrorHandling(penpalChild?.getElementByDomId),
                setFrameId: promisifyMethodWithErrorHandling(penpalChild?.setFrameId),
                getElementIndex: promisifyMethodWithErrorHandling(penpalChild?.getElementIndex),
                getComputedStyleByDomId: promisifyMethodWithErrorHandling(penpalChild?.getComputedStyleByDomId),
                updateElementInstance: promisifyMethodWithErrorHandling(penpalChild?.updateElementInstance),
                getFirstOnlookElement: promisifyMethodWithErrorHandling(penpalChild?.getFirstOnlookElement),
                setElementType: promisifyMethodWithErrorHandling(penpalChild?.setElementType),
                getElementType: promisifyMethodWithErrorHandling(penpalChild?.getElementType),
                getParentElement: promisifyMethodWithErrorHandling(penpalChild?.getParentElement),
                getChildrenCount: promisifyMethodWithErrorHandling(penpalChild?.getChildrenCount),
                getOffsetParent: promisifyMethodWithErrorHandling(penpalChild?.getOffsetParent),
                getActionLocation: promisifyMethodWithErrorHandling(penpalChild?.getActionLocation),
                getActionElement: promisifyMethodWithErrorHandling(penpalChild?.getActionElement),
                getInsertLocation: promisifyMethodWithErrorHandling(penpalChild?.getInsertLocation),
                getRemoveAction: promisifyMethodWithErrorHandling(penpalChild?.getRemoveAction),
                getTheme: promisifyMethodWithErrorHandling(penpalChild?.getTheme),
                setTheme: promisifyMethodWithErrorHandling(penpalChild?.setTheme),
                startDrag: promisifyMethodWithErrorHandling(penpalChild?.startDrag),
                drag: promisifyMethodWithErrorHandling(penpalChild?.drag),
                dragAbsolute: promisifyMethodWithErrorHandling(penpalChild?.dragAbsolute),
                endDragAbsolute: promisifyMethodWithErrorHandling(penpalChild?.endDragAbsolute),
                endDrag: promisifyMethodWithErrorHandling(penpalChild?.endDrag),
                endAllDrag: promisifyMethodWithErrorHandling(penpalChild?.endAllDrag),
                startEditingText: promisifyMethodWithErrorHandling(penpalChild?.startEditingText),
                editText: promisifyMethodWithErrorHandling(penpalChild?.editText),
                stopEditingText: promisifyMethodWithErrorHandling(penpalChild?.stopEditingText),
                updateStyle: promisifyMethodWithErrorHandling(penpalChild?.updateStyle),
                insertElement: promisifyMethodWithErrorHandling(penpalChild?.insertElement),
                removeElement: promisifyMethodWithErrorHandling(penpalChild?.removeElement),
                moveElement: promisifyMethodWithErrorHandling(penpalChild?.moveElement),
                groupElements: promisifyMethodWithErrorHandling(penpalChild?.groupElements),
                ungroupElements: promisifyMethodWithErrorHandling(penpalChild?.ungroupElements),
                insertImage: promisifyMethodWithErrorHandling(penpalChild?.insertImage),
                removeImage: promisifyMethodWithErrorHandling(penpalChild?.removeImage),
                isChildTextEditable: promisifyMethodWithErrorHandling(penpalChild?.isChildTextEditable),
                handleBodyReady: promisifyMethodWithErrorHandling(penpalChild?.handleBodyReady),
                captureScreenshot: promisifyMethodWithErrorHandling(penpalChild?.captureScreenshot),
                buildLayerTree: promisifyMethodWithErrorHandling(penpalChild?.buildLayerTree),
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
                isConnecting.current = false;
            };
        }, []);

        const debouncedReloadIframe = debounce(() => {
            reloadIframe();
        }, 1000);

        return (
            <div className="relative">
                {isConnecting.current && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                        <div className="flex items-center space-x-2 rounded-md bg-background px-4 py-2 shadow-lg">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground border-t-transparent"></div>
                            <span className="text-sm text-foreground">Connecting...</span>
                        </div>
                    </div>
                )}
                <iframe
                    ref={iframeRef}
                    id={frame.id}
                    className={cn('backdrop-blur-sm transition outline outline-4')}
                    src={frame.url}
                    sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
                    allow="geolocation; microphone; camera; midi; encrypted-media"
                    style={{ width: frame.dimension.width, height: frame.dimension.height }}
                    onLoad={setupPenpalConnection}
                    {...props}
                />
            </div>
        );
    }),
);
