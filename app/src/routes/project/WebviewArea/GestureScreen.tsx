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

    function getRelativeMousePosition(
        e: React.MouseEvent<HTMLDivElement>,
        webview: Electron.WebviewTag,
    ) {
        const rect = webview.getBoundingClientRect();
        const scale = editorEngine.scale;
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
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
            console.log('start drawing');
        }
    }

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (editorEngine.mode === EditorMode.DESIGN) {
            handleMouseEvent(e, MouseAction.MOVE);
        } else if (isDrawing) {
            console.log('drawing');
        }
    }

    function handleMouseUp(e: React.MouseEvent<HTMLDivElement>) {
        if (isDrawing) {
            setIsDrawing(false);
            console.log('done drawing');
        }
    }

    async function handleMouseEvent(e: React.MouseEvent<HTMLDivElement>, action: MouseAction) {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }

        const { x, y } = getRelativeMousePosition(e, webview);
        const el: DomElement = await webview.executeJavaScript(
            `window.api.getElementAtLoc(${x}, ${y}, ${action === MouseAction.CLICK} )`,
        );
        const webviewEl: WebViewElement = { ...el, webviewId: metadata.id };
        switch (action) {
            case MouseAction.MOVE:
                editorEngine.elements.mouseover(webviewEl, webview);
                break;
            case MouseAction.CLICK:
                editorEngine.elements.click([webviewEl], webview);
                break;
        }
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
