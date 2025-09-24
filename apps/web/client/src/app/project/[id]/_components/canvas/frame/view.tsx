'use client';

import { useEditorEngine } from '@/components/store/editor';
import type { Frame } from '@onlook/models';
import {
    PENPAL_PARENT_CHANNEL,
    type PenpalChildMethods,
    type PenpalParentMethods,
    type PromisifiedPendpalChildMethods,
} from '@onlook/penpal';
import { WebPreview, WebPreviewBody } from '@onlook/ui/ai-elements';
import { cn } from '@onlook/ui/utils';
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

export type IFrameView = HTMLIFrameElement & {
    setZoomLevel: (level: number) => void;
    supportsOpenDevTools: () => boolean;
    reload: () => void;
    isLoading: () => boolean;
} & PromisifiedPendpalChildMethods;

// Creates a proxy that provides safe fallback methods for any property access
const createSafeFallbackMethods = (): PromisifiedPendpalChildMethods => {
    return new Proxy({} as PromisifiedPendpalChildMethods, {
        get(_target, prop: string | symbol) {
            if (typeof prop === 'symbol') return undefined;

            return async (..._args: any[]) => {
                const method = String(prop);
                if (method.startsWith('get') || method.includes('capture') || method.includes('build')) {
                    return null;
                }
                if (method.includes('Count')) {
                    return 0;
                }
                if (method.includes('Editable') || method.includes('supports')) {
                    return false;
                }
                return undefined;
            };
        }
    });
};

interface FrameViewProps extends IframeHTMLAttributes<HTMLIFrameElement> {
    frame: Frame;
    reloadIframe?: () => void;
    isInDragSelection?: boolean;
}

export const FrameComponent = observer(
    forwardRef<IFrameView, FrameViewProps>(({ frame, reloadIframe, isInDragSelection = false, ...props }, ref) => {
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
        const isActiveBranch = editorEngine.branches.activeBranch.id === frame.branchId;

        const retrySetupPenpalConnection = (error?: Error) => {
            if (retryCount.current >= maxRetries) {
                console.error(
                    `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Max retries (${maxRetries}) reached, reloading iframe`,
                    error,
                );
                retryCount.current = 0;
                reloadIframe?.();
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
                }
            };
        };

        const remoteMethods = useMemo((): PromisifiedPendpalChildMethods => {
            if (!penpalChild) {
                return createSafeFallbackMethods();
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

        useImperativeHandle(ref, (): IFrameView => {
            const iframe = iframeRef.current;
            if (!iframe) {
                console.error(`${PENPAL_PARENT_CHANNEL} (${frame.id}) - Iframe - Not found`);
                // Return safe fallback with no-op methods and safe defaults
                const fallbackElement = document.createElement('iframe') as HTMLIFrameElement;
                const safeFallback: IFrameView = Object.assign(fallbackElement, {
                    // Custom sync methods with safe no-op implementations
                    supportsOpenDevTools: () => false,
                    setZoomLevel: () => { },
                    reload: () => { },
                    isLoading: () => false,
                    // Reuse the safe fallback methods from remoteMethods
                    ...remoteMethods,
                });
                return safeFallback;
            }

            // Register the iframe with the editor engine
            editorEngine.frames.registerView(frame, iframe as IFrameView);

            const syncMethods = {
                supportsOpenDevTools: () =>
                    !!iframe.contentWindow && 'openDevTools' in iframe.contentWindow,
                setZoomLevel: (level: number) => {
                    zoomLevel.current = level;
                    iframe.style.transform = `scale(${level})`;
                    iframe.style.transformOrigin = 'top left';
                },
                reload: () => reloadIframe?.(),
                isLoading: () => iframe.contentDocument?.readyState !== 'complete',
            };

            if (!penpalChild) {
                console.warn(
                    `${PENPAL_PARENT_CHANNEL} (${frame.id}) - Failed to setup penpal connection: iframeRemote is null`,
                );
                return Object.assign(iframe, syncMethods, remoteMethods) as IFrameView;
            }

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
            <WebPreview>
                <WebPreviewBody
                    ref={iframeRef}
                    id={frame.id}
                    className={cn(
                        'backdrop-blur-sm transition outline outline-4',
                        isActiveBranch && 'outline-teal-400',
                        isActiveBranch && !isSelected && 'outline-dashed',
                        !isActiveBranch && isInDragSelection && 'outline-teal-500',
                    )}
                    src={frame.url}
                    sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
                    allow="geolocation; microphone; camera; midi; encrypted-media"
                    style={{ width: frame.dimension.width, height: frame.dimension.height }}
                    onLoad={setupPenpalConnection}
                    {...props} />
            </WebPreview>
        );
    }),
);
