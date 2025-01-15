import { useEditorEngine } from '@/components/Context';
import { getRelativeMousePositionToWebview } from '@/lib/editor/engine/overlay/utils';
import { EditorMode } from '@/lib/models';
import { MouseAction } from '@onlook/models/editor';
import type { DomElement, DropElementProperties, ElementPosition } from '@onlook/models/element';
import { cn } from '@onlook/ui/utils';
import throttle from 'lodash/throttle';
import { observer } from 'mobx-react-lite';
import { useCallback, useMemo, useRef } from 'react';
import RightClickMenu from '../RightClickMenu';

interface GestureScreenProps {
    webviewRef: React.RefObject<Electron.WebviewTag>;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
    isResizing: boolean;
}

const GestureScreen = observer(({ webviewRef, setHovered, isResizing }: GestureScreenProps) => {
    const editorEngine = useEditorEngine();

    const getWebview = useCallback((): Electron.WebviewTag => {
        const webview = webviewRef.current as Electron.WebviewTag | null;
        if (!webview) {
            throw Error('No webview found');
        }
        return webview;
    }, [webviewRef]);

    const getRelativeMousePosition = useCallback(
        (e: React.MouseEvent<HTMLDivElement>): ElementPosition => {
            const webview = getWebview();
            return getRelativeMousePositionToWebview(e, webview);
        },
        [getWebview],
    );

    const throttledMouseMove = useRef(
        throttle((e: React.MouseEvent<HTMLDivElement>) => {
            if (editorEngine.move.isDragging) {
                editorEngine.move.drag(e, getRelativeMousePosition);
            } else if (
                editorEngine.mode === EditorMode.DESIGN ||
                ((editorEngine.mode === EditorMode.INSERT_DIV ||
                    editorEngine.mode === EditorMode.INSERT_TEXT) &&
                    !editorEngine.insert.isDrawing)
            ) {
                handleMouseEvent(e, MouseAction.MOVE);
            } else if (editorEngine.insert.isDrawing) {
                editorEngine.insert.draw(e);
            }
        }, 16),
    ).current;

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
            editorEngine.mode === EditorMode.INSERT_TEXT
        ) {
            editorEngine.insert.start(e);
        }
    }

    async function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        editorEngine.insert.end(e, webviewRef.current);
        editorEngine.move.end(e);
    }

    async function handleMouseEvent(e: React.MouseEvent<HTMLDivElement>, action: MouseAction) {
        const webview = getWebview();
        const pos = getRelativeMousePosition(e);
        const el: DomElement = await webview.executeJavaScript(
            `window.api?.getElementAtLoc(${pos.x}, ${pos.y}, ${action === MouseAction.MOUSE_DOWN || action === MouseAction.DOUBLE_CLICK})`,
        );
        if (!el) {
            return;
        }
        switch (action) {
            case MouseAction.MOVE:
                editorEngine.elements.mouseover(el, webview);
                if (e.altKey) {
                    editorEngine.elements.showMeasurement();
                } else {
                    editorEngine.overlay.removeMeasurement();
                }
                break;
            case MouseAction.MOUSE_DOWN:
                // Ignore right-clicks
                if (e.button == 2) {
                    break;
                }
                if (editorEngine.text.isEditing) {
                    editorEngine.text.end();
                }
                if (e.shiftKey) {
                    editorEngine.elements.shiftClick(el, webview);
                } else {
                    editorEngine.elements.click([el], webview);
                    editorEngine.move.start(el, pos, webview);
                }
                break;
            case MouseAction.DOUBLE_CLICK:
                editorEngine.text.start(el, webview);
                break;
        }
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

            const properties: DropElementProperties = JSON.parse(propertiesData);
            const webview = getWebview();
            const dropPosition = getRelativeMousePosition(e);

            await editorEngine.insert.insertDroppedElement(webview, dropPosition, properties);
            editorEngine.mode = EditorMode.DESIGN;
        } catch (error) {
            console.error('drop operation failed:', error);
        }
    };

    const gestureScreenClassName = useMemo(() => {
        return cn(
            'absolute inset-0 bg-transparent',
            editorEngine.mode === EditorMode.INTERACT && !isResizing ? 'hidden' : 'visible',
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
