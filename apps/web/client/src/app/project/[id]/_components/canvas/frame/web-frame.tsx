'use client';

import { useEditorEngine } from '@/components/store/editor';
import type { WebFrame } from '@onlook/models';
import {
    PENPAL_PARENT_CHANNEL,
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
    useMemo,
    useRef,
    useState,
    type IframeHTMLAttributes,
} from 'react';

export type WebFrameView = HTMLIFrameElement & {
    setZoomLevel: (level: number) => void;
    supportsOpenDevTools: () => boolean;
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
        const isConnecting = useRef(false);
        const connectionRef = useRef<ReturnType<typeof connect> | null>(null);
        const retryCount = useRef(0);
        const maxRetries = 3;
        const baseDelay = 1000;
        const [penpalChild, setPenpalChild] = useState<PenpalChildMethods | null>(null);
        const isSelected = editorEngine.frames.isSelected(frame.id);

        const undebouncedReloadIframe = () => {
            try {
                const iframe = iframeRef.current;
                if (!iframe) return;
                iframe.src = iframe.src;
            } catch (error) {
                console.error('Failed to reload iframe', error);
            }
        };

        const reloadIframe = debounce(undebouncedReloadIframe, 1000, {
            leading: true,
        });

        const retrySetupPenpalConnection = (error?: Error) => {
            if (retryCount.current >= maxRetries) {
                console.error(
                    `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Max retries (${maxRetries}) reached, reloading iframe`,
                    error,
                );
                retryCount.current = 0;
                reloadIframe();
                return;
            }

            retryCount.current += 1;
            const delay = baseDelay * Math.pow(2, retryCount.current - 1);

            console.log(
                `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Retrying connection attempt ${retryCount.current}/${maxRetries} in ${delay}ms`,
            );

            setTimeout(() => {
                setupPenpalConnection();
            }, delay);
        };

        const setupPenpalConnection = () => {
            try {
                if (!iframeRef.current?.contentWindow) {
                    console.error('No iframe found');
                    throw new Error('No iframe found');
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

                connection.promise
                    .then((child) => {
                        isConnecting.current = false;
                        if (!child) {
                            const error = new Error('Failed to setup penpal connection: child is null');
                            console.error(
                                `${PENPAL_PARENT_CHANNEL} (${frame.id}) - ${error.message}`,
                            );
                            retrySetupPenpalConnection(error);
                            return;
                        }

                        // Reset retry count on successful connection
                        retryCount.current = 0;

                        const remote = child as unknown as PenpalChildMethods;
                        setPenpalChild(remote);
                        remote.setFrameId(frame.id);
                        remote.handleBodyReady();
                        remote.processDom();
                        console.log(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Penpal connection set `);
                    })
                    .catch((error) => {
                        isConnecting.current = false;
                        console.error(
                            `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Failed to setup penpal connection:`,
                            error,
                        );
                        retrySetupPenpalConnection(error);
                    });
            } catch (error) {
                isConnecting.current = false;
                console.error('Failed to setup penpal connection', error);
                retrySetupPenpalConnection(error as Error);
            }
        };

        const promisifyMethod = <T extends (...args: any[]) => any>(
            method: T | undefined,
        ): ((...args: Parameters<T>) => Promise<ReturnType<T>>) => {
            return async (...args: Parameters<T>) => {
                try {
                    if (!method) throw new Error('Method not initialized');
                    return method(...args);
                } catch (error) {
                    console.error(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Method failed:`, error);
                    reloadIframe();
                    throw error;
                }
            };
        };

        const remoteMethods = useMemo((): PromisifiedPendpalChildMethods => {
            if (!penpalChild) {
                return {} as PromisifiedPendpalChildMethods;
            }

            return {
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
        }, [penpalChild]);

        useImperativeHandle(ref, (): WebFrameView => {
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
                reload: () => reloadIframe(),
                isLoading: () => iframe.contentDocument?.readyState !== 'complete',
            };

            if (!penpalChild) {
                console.warn(
                    `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Failed to setup penpal connection: iframeRemote is null`,
                );
                return Object.assign(iframe, syncMethods, remoteMethods) as WebFrameView;
            }

            // Register the iframe with the editor engine
            editorEngine.frames.registerView(frame, iframe as WebFrameView);

            return Object.assign(iframe, {
                ...syncMethods,
                ...remoteMethods,
            });
        }, [penpalChild, frame, iframeRef]);

        useEffect(() => {
            return () => {
                if (connectionRef.current) {
                    connectionRef.current.destroy();
                    connectionRef.current = null;
                }
                setPenpalChild(null);
                isConnecting.current = false;
            };
        }, []);

        return (
            <iframe
                ref={iframeRef}
                id={frame.id}
                className={cn('backdrop-blur-sm transition outline outline-4', isSelected && 'outline-teal-400')}
                src={frame.url}
                sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
                allow="geolocation; microphone; camera; midi; encrypted-media"
                style={{ width: frame.dimension.width, height: frame.dimension.height }}
                onLoad={setupPenpalConnection}
                {...props}
            />
        );
    }),
);
