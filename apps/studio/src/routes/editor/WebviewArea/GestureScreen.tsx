import { useEditorEngine } from '@/components/Context';
import { EditorMode } from '@/lib/models';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import RightClickMenu from '../RightClickMenu';
import { MouseAction } from '@onlook/models/editor';
import type { DomElement, ElementPosition } from '@onlook/models/element';

interface GestureScreenProps {
    webviewRef: React.RefObject<Electron.WebviewTag>;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
}

const GestureScreen = observer(({ webviewRef, setHovered }: GestureScreenProps) => {
    const editorEngine = useEditorEngine();

    function selectWebview(webview: Electron.WebviewTag) {
        editorEngine.webviews.deselectAll();
        editorEngine.webviews.select(webview);
        editorEngine.webviews.notify();
    }

    function handleClick(e: React.MouseEvent<HTMLDivElement>) {
        const webview = getWebview();
        selectWebview(webview);
    }

    function handleDoubleClick(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.mode !== EditorMode.DESIGN) {
            return;
        }
        handleMouseEvent(e, MouseAction.DOUBLE_CLICK);
    }

    function getRelativeMousePosition(e: React.MouseEvent<HTMLDivElement>, rect: DOMRect) {
        const scale = editorEngine.canvas.scale;
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        return { x, y };
    }

    function getRelativeMousePositionToOverlay(
        e: React.MouseEvent<HTMLDivElement>,
    ): ElementPosition {
        if (!editorEngine.overlay.overlayContainer) {
            throw new Error('overlay container not found');
        }
        const rect = editorEngine.overlay.overlayContainer?.getBoundingClientRect();
        const { x, y } = getRelativeMousePosition(e, rect);
        return { x, y };
    }

    function getRelativeMousePositionToWebview(
        e: React.MouseEvent<HTMLDivElement>,
    ): ElementPosition {
        const webview = getWebview();
        const rect = webview.getBoundingClientRect();
        const { x, y } = getRelativeMousePosition(e, rect);
        return { x, y };
    }

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.mode === EditorMode.DESIGN) {
            handleMouseEvent(e, MouseAction.MOUSE_DOWN);
        } else if (
            editorEngine.mode === EditorMode.INSERT_DIV ||
            editorEngine.mode === EditorMode.INSERT_TEXT
        ) {
            editorEngine.insert.start(
                e,
                getRelativeMousePositionToOverlay,
                getRelativeMousePositionToWebview,
            );
        }
    }

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.move.isDragging) {
            editorEngine.move.drag(e, webviewRef.current, getRelativeMousePositionToWebview);
        } else if (
            editorEngine.mode === EditorMode.DESIGN ||
            ((editorEngine.mode === EditorMode.INSERT_DIV ||
                editorEngine.mode === EditorMode.INSERT_TEXT) &&
                !editorEngine.insert.isDrawing)
        ) {
            handleMouseEvent(e, MouseAction.MOVE);
        } else if (editorEngine.insert.isDrawing) {
            editorEngine.insert.draw(e, getRelativeMousePositionToOverlay);
        }
    }

    async function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        editorEngine.insert.end(e, webviewRef.current, getRelativeMousePositionToWebview);
        editorEngine.move.end(e, webviewRef.current);
    }

    async function handleMouseEvent(e: React.MouseEvent<HTMLDivElement>, action: MouseAction) {
        const webview = getWebview();
        const pos = getRelativeMousePositionToWebview(e);
        const el: DomElement = await webview.executeJavaScript(
            `window.api?.getElementAtLoc(${pos.x}, ${pos.y}, ${action === MouseAction.MOUSE_DOWN})`,
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
                    editorEngine.text.end(webview);
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

    function getWebview(): Electron.WebviewTag {
        const webview = webviewRef.current as Electron.WebviewTag | null;
        if (!webview) {
            throw Error('No webview found');
        }
        return webview;
    }

    return (
        <RightClickMenu>
            <div
                className={cn(
                    'absolute inset-0 bg-transparent',
                    editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                    editorEngine.mode === EditorMode.INSERT_DIV && 'cursor-crosshair',
                    editorEngine.mode === EditorMode.INSERT_TEXT && 'cursor-text',
                )}
                onClick={handleClick}
                onMouseOver={() => setHovered(true)}
                onMouseOut={() => {
                    setHovered(false);
                    editorEngine.elements.clearHoveredElement();
                    editorEngine.overlay.removeHoverRect();
                }}
                onMouseLeave={handleMouseUp}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onDoubleClick={handleDoubleClick}
            ></div>
        </RightClickMenu>
    );
});

export default GestureScreen;
