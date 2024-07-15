import { EditorMode } from '@/lib/editor/engine';
import { observer } from 'mobx-react-lite';
import { useEditorEngine } from '..';
import { WebviewChannels } from '/common/constants';

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
        sendMouseEvent(e, WebviewChannels.MOUSE_MOVE);
    }

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.preventDefault();
        sendMouseEvent(e, WebviewChannels.MOUSE_DOWN);
    }

    function sendMouseEvent(e: React.MouseEvent<HTMLDivElement>, channel: WebviewChannels) {
        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }
        const { x, y } = getRelativeMousePosition(e, webview);
        webview.send(channel, { x, y });
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
