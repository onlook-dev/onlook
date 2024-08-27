import { EditorMode } from '@/lib/models';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useEditorEngine } from '..';
import RightClickMenu from '../RightClickMenu';
import { MouseAction } from '/common/models';
import { DomElement, Position } from '/common/models/element';

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
        e.stopPropagation();
        e.preventDefault();

        const webview = webviewRef.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }
        selectWebview(webview);
    }

    function getRelativeMousePosition(e: React.MouseEvent<HTMLDivElement>, rect: DOMRect) {
        const scale = editorEngine.scale;
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        return { x, y };
    }

    function getRelativeMousePositionToOverlay(e: React.MouseEvent<HTMLDivElement>): Position {
        if (!editorEngine.overlay.overlayContainer) {
            throw new Error('overlay container not found');
        }
        const rect = editorEngine.overlay.overlayContainer?.getBoundingClientRect();
        const { x, y } = getRelativeMousePosition(e, rect);
        return { x, y };
    }

    function getRelativeMousePositionToWebview(e: React.MouseEvent<HTMLDivElement>): Position {
        const webview = webviewRef.current as Electron.WebviewTag | null;
        if (!webview) {
            throw new Error('webview not found');
        }
        const rect = webview.getBoundingClientRect();
        const { x, y } = getRelativeMousePosition(e, rect);
        return { x, y };
    }

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.preventDefault();

        if (editorEngine.mode === EditorMode.DESIGN) {
            handleMouseEvent(e, MouseAction.CLICK);
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
            (editorEngine.mode === EditorMode.INSERT_DIV && !editorEngine.insert.isDrawing)
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
        const webview = webviewRef.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }

        const pos = getRelativeMousePositionToWebview(e);
        const el: DomElement = await webview.executeJavaScript(
            `window.api?.getElementAtLoc(${pos.x}, ${pos.y}, ${action === MouseAction.CLICK} )`,
        );
        if (!el) {
            return;
        }
        switch (action) {
            case MouseAction.MOVE:
                editorEngine.elements.mouseover(el, webview);
                break;
            case MouseAction.CLICK:
                editorEngine.elements.click([el], webview);
                editorEngine.move.start(el, pos, webview);
                break;
        }
    }

    return (
        <RightClickMenu>
            <div
                className={clsx(
                    'absolute inset-0 bg-transparent',
                    editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                    editorEngine.mode === EditorMode.INSERT_DIV ||
                        editorEngine.mode === EditorMode.INSERT_TEXT
                        ? 'cursor-crosshair'
                        : '',
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
            ></div>
        </RightClickMenu>
    );
});

export default GestureScreen;
