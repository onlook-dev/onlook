import { useEditorEngine } from '@/components/Context';
import { getRelativeMousePositionToWebview } from '@/lib/editor/engine/overlay/utils';
import { EditorMode } from '@/lib/models';
// Helper for executing JavaScript in both webview and iframe elements
import { MouseAction } from '@onlook/models/editor';
import type { DomElement, DropElementProperties, ElementPosition } from '@onlook/models/element';
import { cn } from '@onlook/ui/utils';
import throttle from 'lodash/throttle';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useMemo } from 'react';
import RightClickMenu from '../RightClickMenu';

interface GestureScreenProps {
    webviewRef: React.RefObject<Electron.WebviewTag | HTMLIFrameElement>;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
    isResizing: boolean;
}

// Helper function to execute JavaScript in both webview and iframe elements
const executeJavaScript = async (element: Electron.WebviewTag | HTMLIFrameElement, code: string): Promise<any> => {
    if ('executeJavaScript' in element) {
        return (element as Electron.WebviewTag).executeJavaScript(code);
    } else {
        // For iframe, we use postMessage and wait for a response
        const iframe = element as HTMLIFrameElement;
        const messageId = `exec_${Date.now()}`;
        
        return new Promise((resolve) => {
            const handler = (e: MessageEvent) => {
                if (e.data && e.data.messageId === messageId) {
                    window.removeEventListener('message', handler);
                    resolve(e.data.result);
                }
            };
            
            window.addEventListener('message', handler);
            if (iframe.contentWindow) {
                iframe.contentWindow.postMessage({
                    channel: 'execute-js',
                    args: { code, messageId }
                }, '*');
            }
        });
    }
};

const GestureScreen = observer(({ webviewRef, setHovered, isResizing }: GestureScreenProps) => {
    const editorEngine = useEditorEngine();

    const getWebview = useCallback((): Electron.WebviewTag | HTMLIFrameElement => {
        const element = webviewRef.current;
        if (!element) {
            throw Error('No webview or iframe found');
        }
        return element;
    }, [webviewRef]);

    const getRelativeMousePosition = useCallback(
        (e: React.MouseEvent<HTMLDivElement>): ElementPosition => {
            const webview = getWebview();
            return getRelativeMousePositionToWebview(e, webview as Electron.WebviewTag);
        },
        [getWebview],
    );

    const handleMouseEvent = useCallback(
        async (e: React.MouseEvent<HTMLDivElement>, action: MouseAction) => {
            const webview = getWebview();
            const pos = getRelativeMousePosition(e);
            const el: DomElement = await executeJavaScript(
                webview,
                `window.api?.getElementAtLoc(${pos.x}, ${pos.y}, ${action === MouseAction.MOUSE_DOWN || action === MouseAction.DOUBLE_CLICK})`,
            );
            if (!el) {
                return;
            }

            switch (action) {
                case MouseAction.MOVE:
                    editorEngine.elements.mouseover(el, webview as Electron.WebviewTag);
                    if (e.altKey) {
                        editorEngine.elements.showMeasurement();
                    } else {
                        editorEngine.overlay.removeMeasurement();
                    }
                    break;
                case MouseAction.MOUSE_DOWN:
                    if (el.tagName.toLocaleLowerCase() === 'body') {
                        editorEngine.webviews.select(webview);
                        return;
                    }
                    // Ignore right-clicks
                    if (e.button == 2) {
                        break;
                    }
                    if (editorEngine.text.isEditing) {
                        editorEngine.text.end();
                    }
                    if (e.shiftKey) {
                        editorEngine.elements.shiftClick(el, webview as Electron.WebviewTag);
                    } else {
                        editorEngine.move.start(el, pos, webview as Electron.WebviewTag);
                        editorEngine.elements.click([el], webview as Electron.WebviewTag);
                    }
                    break;
                case MouseAction.DOUBLE_CLICK:
                    editorEngine.text.start(el, webview as Electron.WebviewTag);
                    break;
            }
        },
        [getWebview, getRelativeMousePosition, editorEngine],
    );

    const throttledMouseMove = useMemo(
        () =>
            throttle((e: React.MouseEvent<HTMLDivElement>) => {
                if (editorEngine.move.isDragging) {
                    editorEngine.move.drag(e, getRelativeMousePosition);
                } else if (
                    editorEngine.mode === EditorMode.DESIGN ||
                    ((editorEngine.mode === EditorMode.INSERT_DIV ||
                        editorEngine.mode === EditorMode.INSERT_TEXT ||
                        editorEngine.mode === EditorMode.INSERT_IMAGE) &&
                        !editorEngine.insert.isDrawing)
                ) {
                    handleMouseEvent(e, MouseAction.MOVE);
                } else if (editorEngine.insert.isDrawing) {
                    editorEngine.insert.draw(e);
                }
            }, 16),
        [editorEngine, getRelativeMousePosition, handleMouseEvent],
    );

    useEffect(() => {
        return () => {
            throttledMouseMove.cancel();
        };
    }, [throttledMouseMove]);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            const webview = getWebview();
            editorEngine.webviews.deselectAll();
            editorEngine.webviews.select(webview);
        },
        [getWebview, editorEngine.webviews],
    );

    function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.mode !== EditorMode.DESIGN) {
            return;
        }
        handleMouseEvent(e, MouseAction.DOUBLE_CLICK);
    }

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.mode === EditorMode.DESIGN) {
            handleMouseEvent(e, MouseAction.MOUSE_DOWN);
        } else if (
            editorEngine.mode === EditorMode.INSERT_DIV ||
            editorEngine.mode === EditorMode.INSERT_TEXT ||
            editorEngine.mode === EditorMode.INSERT_IMAGE
        ) {
            editorEngine.insert.start(e);
        }
    }

    async function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        editorEngine.insert.end(e, webviewRef.current as Electron.WebviewTag);
        editorEngine.move.end(e);
    }

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        handleMouseEvent(e, MouseAction.MOVE);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            const propertiesData = e.dataTransfer.getData('application/json');
            if (!propertiesData) {
                console.error('No element properties in drag data');
                return;
            }

            const properties = JSON.parse(propertiesData);

            if (properties.type === 'image') {
                const webview = getWebview();
                const dropPosition = getRelativeMousePosition(e);
                await editorEngine.insert.insertDroppedImage(webview as Electron.WebviewTag, dropPosition, properties);
            } else {
                const webview = getWebview();
                const dropPosition = getRelativeMousePosition(e);
                await editorEngine.insert.insertDroppedElement(webview as Electron.WebviewTag, dropPosition, properties);
            }

            editorEngine.mode = EditorMode.DESIGN;
        } catch (error) {
            console.error('drop operation failed:', error);
        }
    };

    const gestureScreenClassName = useMemo(() => {
        return cn(
            'absolute inset-0 bg-transparent',
            editorEngine.mode === EditorMode.PREVIEW && !isResizing ? 'hidden' : 'visible',
            editorEngine.mode === EditorMode.INSERT_DIV && 'cursor-crosshair',
            editorEngine.mode === EditorMode.INSERT_TEXT && 'cursor-text',
        );
    }, [editorEngine.mode, isResizing]);

    return (
        <RightClickMenu>
            <div
                className={gestureScreenClassName}
                onClick={handleClick}
                onMouseOver={() => setHovered(true)}
                onMouseOut={useCallback(() => {
                    setHovered(false);
                    editorEngine.elements.clearHoveredElement();
                    editorEngine.overlay.state.updateHoverRect(null);
                }, [editorEngine, setHovered])}
                onMouseLeave={handleMouseUp}
                onMouseMove={throttledMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onDoubleClick={handleDoubleClick}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            ></div>
        </RightClickMenu>
    );
});

export default GestureScreen;
