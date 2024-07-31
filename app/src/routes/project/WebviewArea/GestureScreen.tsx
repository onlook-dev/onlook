import { EditorMode } from '@/lib/editor/engine';
import { WebviewMetadata } from '@/lib/models';
import { observer } from 'mobx-react-lite';
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

    function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        handleMouseEvent(e, MouseAction.HOVER);
    }

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        handleMouseEvent(e, MouseAction.CLICK);
    }

    async function handleMouseEvent(e: React.MouseEvent<HTMLDivElement>, action: MouseAction) {
        e.stopPropagation();
        e.preventDefault();

        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }

        const { x, y } = getRelativeMousePosition(e, webview);
        const el: DomElement = await webview.executeJavaScript(
            `window.api.getElementAtLoc(${x}, ${y})`,
        );
        const webviewEl: WebViewElement = { ...el, webviewId: metadata.id };
        switch (action) {
            case MouseAction.HOVER:
                editorEngine.mouseover([webviewEl], webview);
                break;
            case MouseAction.CLICK:
                editorEngine.click([webviewEl], webview);
                break;
        }
    }

    return (
        editorEngine.mode === EditorMode.Design && (
            <div
                className="absolute inset-0 bg-transparent"
                onClick={handleClick}
                onMouseOver={() => setHovered(true)}
                onMouseOut={() => {
                    setHovered(false);
                    editorEngine.state.clearHoveredElement();
                    editorEngine.overlay.removeHoverRect();
                }}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
            ></div>
        )
    );
});

export default GestureScreen;
