'use client';

import { useEditorEngine } from '@/components/store/editor';
import type { WebFrame } from '@onlook/models';
import {
    PENPAL_PARENT_CHANNEL,
    promisifyMethod,
    type PenpalChildMethods,
    type PenpalParentMethods,
    type PromisifiedPendpalChildMethods,
    ConnectionState,
    ExponentialBackoff,
    Heartbeat
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
        const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
        const heartbeatRef = useRef<Heartbeat | null>(null);
        const reconnectBackoffRef = useRef<ExponentialBackoff | null>(null);
        const connectionQuality = useRef({
            latency: 0,
            successRate: 1.0,
            lastSuccessfulConnection: 0,
            reconnectAttempts: 0
        });

        const reloadIframe = () => {
            const iframe = iframeRef.current;
            if (!iframe) return;
            iframe.src = iframe.src;
            setupPenpalConnection();
        };

        const setupPenpalConnection = () => {
            if (!iframeRef.current?.contentWindow) {
                console.error(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - No iframe found`);
                return;
            }

            setConnectionState(ConnectionState.CONNECTING);
            connectionQuality.current.reconnectAttempts++;

            if (connectionRef.current) {
                connectionRef.current.destroy();
                connectionRef.current = null;
            }

            if (heartbeatRef.current) {
                heartbeatRef.current.stop();
                heartbeatRef.current = null;
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

            connectionRef.current = connection;

            connection.promise.then((child) => {
                if (!child) {
                    console.error(
                        `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Failed to setup penpal connection: child is null`,
                    );
                    setConnectionState(ConnectionState.DISCONNECTED);
                    reconnectBackoffRef.current?.execute();
                    return;
                }
                
                const remote = child as unknown as PenpalChildMethods;
                setPenpalChild(remote);
                setConnectionState(ConnectionState.CONNECTED);
                connectionQuality.current.lastSuccessfulConnection = Date.now();
                connectionQuality.current.reconnectAttempts = 0;
                
                if (reconnectBackoffRef.current) {
                    reconnectBackoffRef.current.reset();
                }
                
                remote.setFrameId(frame.id);
                remote.processDom();
                
                startHeartbeat();
                
                console.log(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Penpal connection established successfully`);
            });

            connection.promise.catch((error) => {
                console.error(
                    `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Failed to setup penpal connection:`,
                    error,
                );
                setConnectionState(ConnectionState.DISCONNECTED);
                reconnectBackoffRef.current?.execute();
            });
        };

        const startHeartbeat = () => {
            if (heartbeatRef.current?.isActive()) return;
            
            heartbeatRef.current = new Heartbeat(async () => {
                if (!penpalChild || connectionState !== ConnectionState.CONNECTED) {
                    return false;
                }
                
                try {
                    const startTime = Date.now();
                    await penpalChild.getFrameId();
                    connectionQuality.current.latency = Date.now() - startTime;
                    return true;
                } catch (error) {
                    console.warn(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Heartbeat failed:`, error);
                    return false;
                }
            }, {
                interval: 30000,
                maxFailures: 2,
                onHealthy: () => {
                    console.log(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Connection health restored`);
                },
                onUnhealthy: () => {
                    console.warn(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Connection unhealthy, triggering reconnection`);
                    setConnectionState(ConnectionState.DISCONNECTED);
                    reconnectBackoffRef.current?.execute();
                }
            });
            
            heartbeatRef.current.start();
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
                buildLayerTree: promisifyMethod(penpalChild?.buildLayerTree),
            };

            // Register the iframe with the editor engine
            editorEngine.frames.register(frame, iframe as WebFrameView);

            return Object.assign(iframe, {
                ...syncMethods,
                ...remoteMethods,
            }) satisfies WebFrameView;
        }, [penpalChild, frame, iframeRef]);

        useEffect(() => {
            reconnectBackoffRef.current = new ExponentialBackoff(() => {
                if (connectionState === ConnectionState.RECONNECTING) return;
                setConnectionState(ConnectionState.RECONNECTING);
                console.log(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Attempting reconnection`);
                setupPenpalConnection();
            }, {
                initialDelay: 1000,
                maxDelay: 30000,
                maxAttempts: 5,
                backoffFactor: 2
            });

            setupPenpalConnection();

            return () => {
                if (connectionRef.current) {
                    connectionRef.current.destroy();
                    connectionRef.current = null;
                }
                if (heartbeatRef.current) {
                    heartbeatRef.current.stop();
                    heartbeatRef.current = null;
                }
                if (reconnectBackoffRef.current) {
                    reconnectBackoffRef.current.cancel();
                    reconnectBackoffRef.current = null;
                }
                setPenpalChild(null);
                setConnectionState(ConnectionState.DISCONNECTED);
            };
        }, []);

        const handleConnectionError = () => {
            if (reconnectBackoffRef.current) {
                reconnectBackoffRef.current.execute();
            } else {
                reloadIframe();
            }
        };

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
                onError={handleConnectionError}
                {...props}
            />
        );
    }),
);
