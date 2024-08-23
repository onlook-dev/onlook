import { EditorMode, WebviewMetadata } from '@/lib/models';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { nanoid } from 'nanoid';
import { useState } from 'react';
import { useEditorEngine } from '..';
import RightClickMenu from '../RightClickMenu';
import { ActionElement, ActionTarget } from '/common/actions';
import { EditorAttributes } from '/common/constants';
import { MouseAction } from '/common/models';
import { DomElement } from '/common/models/element';

interface Position {
    x: number;
    y: number;
}

interface GestureScreenProps {
    metadata: WebviewMetadata;
    webviewRef: React.RefObject<Electron.WebviewTag>;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
}

const GestureScreen = observer(({ webviewRef, setHovered, metadata }: GestureScreenProps) => {
    const editorEngine = useEditorEngine();
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawOrigin, setDrawOrigin] = useState<
        { overlay: Position; webview: Position } | undefined
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

    function getRelativeMousePositionToOverlay(e: React.MouseEvent<HTMLDivElement>): Position {
        if (!editorEngine.overlay.overlayContainer) {
            throw new Error('overlay container not found');
        }
        const rect = editorEngine.overlay.overlayContainer?.getBoundingClientRect();
        const { x, y } = getRelativeMousePosition(e, rect);
        return { x, y };
    }

    function getRelativeMousePositionToWebview(e: React.MouseEvent<HTMLDivElement>): Position {
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
            const overlayPos = getRelativeMousePositionToOverlay(e);
            const webviewPos = getRelativeMousePositionToWebview(e);
            setDrawOrigin({ overlay: overlayPos, webview: webviewPos });
            startDraw(overlayPos);
        }
    }

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (
            editorEngine.mode === EditorMode.DESIGN ||
            (editorEngine.mode === EditorMode.INSERT_DIV && !isDrawing)
        ) {
            handleMouseEvent(e, MouseAction.MOVE);
        }
        if (isDrawing) {
            const overlayStart = getRelativeMousePositionToOverlay(e);
            draw(overlayStart);
        }
    }

    async function insertElement(
        webview: Electron.WebviewTag,
        newRect: { x: number; y: number; width: number; height: number },
    ) {
        const location = await webview.executeJavaScript(
            `window.api?.getInsertLocation(${newRect.x}, ${newRect.y})`,
        );
        if (!location) {
            console.error('Insert position not found');
            return;
        }

        const targets: Array<ActionTarget> = [
            {
                webviewId: webview.id,
            },
        ];

        const actionElement: ActionElement = {
            tagName: 'div',
            attributes: {
                id: nanoid(),
                [EditorAttributes.DATA_ONLOOK_INSERTED]: 'true',
                [EditorAttributes.DATA_ONLOOK_TIMESTAMP]: Date.now().toString(),
            },
            children: [],
            textContent: '',
        };

        const width = Math.max(Math.round(newRect.width), 30);
        const height = Math.max(Math.round(newRect.height), 30);
        const defaultStyles = {
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: 'rgb(120, 113, 108)',
        };

        editorEngine.action.run({
            type: 'insert-element',
            targets: targets,
            location: location,
            element: actionElement,
            styles: defaultStyles,
        });
    }

    async function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        if (isDrawing) {
            setIsDrawing(false);
            editorEngine.overlay.removeInsertRect();

            const webview = webviewRef?.current as Electron.WebviewTag | null;
            if (!webview || !drawOrigin) {
                return;
            }
            const webviewPos = getRelativeMousePositionToWebview(e);
            const newRect = getDrawRect(drawOrigin.webview, webviewPos);
            await insertElement(webview, newRect);
        }
    }

    async function handleMouseEvent(e: React.MouseEvent<HTMLDivElement>, action: MouseAction) {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }

        const { x, y } = getRelativeMousePositionToWebview(e);
        const el: DomElement = await webview.executeJavaScript(
            `window.api?.getElementAtLoc(${x}, ${y}, ${action === MouseAction.CLICK} )`,
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
                break;
        }
    }

    function startDraw(pos: Position) {
        const { x, y } = pos;
        const rect = new DOMRect(x, y, 0, 0);
        editorEngine.overlay.updateInsertRect(rect);
    }

    function draw(currentPos: Position) {
        if (!drawOrigin) {
            return;
        }
        const newRect = getDrawRect(drawOrigin.overlay, currentPos);
        editorEngine.overlay.updateInsertRect(newRect);
    }

    function getDrawRect(drawStart: Position, currentPos: Position) {
        const { x, y } = currentPos;
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
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            ></div>
        </RightClickMenu>
    );
});

export default GestureScreen;
