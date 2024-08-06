import { EditorMode, WebviewMetadata } from '@/lib/models';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useEditorEngine } from '..';
import { MouseAction } from '/common/models';
import { DomElement, WebViewElement } from '/common/models/element';

interface GestureScreenProps {
    metadata: WebviewMetadata;
    webviewRef: React.RefObject<Electron.WebviewTag>;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
}

const GestureScreen = observer(({ webviewRef, setHovered, metadata }: GestureScreenProps) => {
    const editorEngine = useEditorEngine();
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawStart, setDrawStart] = useState<
        { overlay: { x: number; y: number }; webview: { x: number; y: number } } | undefined
    >();

    function selectWebview(webview: Electron.WebviewTag) {
        editorEngine.webviews.deselectAll();
        editorEngine.webviews.select(webview);
        editorEngine.webviews.notify();
    }

    function handleClick(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.preventDefault();

        const webview = webviewRef?.current as Electron.WebviewTag | null;
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

    function getRelativeMousePositionToOverlay(e: React.MouseEvent<HTMLDivElement>): {
        x: number;
        y: number;
    } {
        if (!editorEngine.overlay.overlayContainer) {
            throw new Error('overlay container not found');
        }
        const rect = editorEngine.overlay.overlayContainer?.getBoundingClientRect();
        const { x, y } = getRelativeMousePosition(e, rect);
        return { x, y };
    }

    function getRelativeMousePositionToWebview(e: React.MouseEvent<HTMLDivElement>): {
        x: number;
        y: number;
    } {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
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
            setIsDrawing(true);
            const overlayStart = getRelativeMousePositionToOverlay(e);
            setDrawStart({ overlay: overlayStart, webview: getRelativeMousePositionToWebview(e) });
            startDraw(overlayStart);
        }
    }

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.mode === EditorMode.DESIGN) {
            handleMouseEvent(e, MouseAction.MOVE);
        } else if (isDrawing) {
            const { x, y } = getRelativeMousePositionToOverlay(e);
            draw({ x, y });
        }
    }

    function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        if (isDrawing) {
            setIsDrawing(false);

            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview || !drawStart) {
                return;
            }
            const { x, y } = getRelativeMousePositionToWebview(e);
            const newRect = getDrawRect(drawStart.webview, x, y);

            webview.executeJavaScript(
                `window.api.insertElement(${newRect.x}, ${newRect.y}, ${newRect.width}, ${newRect.height})`,
            );
            editorEngine.overlay.removeInsertRect();
        }
    }

    async function handleMouseEvent(e: React.MouseEvent<HTMLDivElement>, action: MouseAction) {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }

        const { x, y } = getRelativeMousePositionToWebview(e);
        const el: DomElement = await webview.executeJavaScript(
            `window.api.getElementAtLoc(${x}, ${y})`,
        );
        const webviewEl: WebViewElement = { ...el, webviewId: metadata.id };
        switch (action) {
            case MouseAction.MOVE:
                editorEngine.elements.mouseover([webviewEl], webview);
                break;
            case MouseAction.CLICK:
                editorEngine.elements.click([webviewEl], webview);
                break;
        }
    }

    function startDraw({ x, y }: { x: number; y: number }) {
        const rect = new DOMRect(x, y, 0, 0);
        editorEngine.overlay.updateInsertRect(rect);
    }

    function draw({ x, y }: { x: number; y: number }) {
        if (!drawStart) {
            return;
        }
        const newRect = getDrawRect(drawStart.overlay, x, y);
        editorEngine.overlay.updateInsertRect(newRect);
    }

    function getDrawRect(drawStart: { x: number; y: number }, x: number, y: number) {
        let startX = drawStart.x;
        let startY = drawStart.y;
        let width = x - startX;
        let height = y - startY;

        if (width < 0) {
            startX = x;
            width = Math.abs(width);
        }

        if (height < 0) {
            startY = y;
            height = Math.abs(height);
        }

        return new DOMRect(startX, startY, width, height);
    }

    return (
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
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        ></div>
    );
});

export default GestureScreen;
