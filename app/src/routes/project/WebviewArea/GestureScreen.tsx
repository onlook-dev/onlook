import { useState } from 'react';
import { useEditorEngine } from '..';
import { WebviewChannels } from '/common/constants';

enum GestureScreenMode {
    Design = 'Design',
    Interact = 'Interact',
}

interface GestureScreenProps {
    webviewRef: React.RefObject<Electron.WebviewTag>;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
}

function GestureScreen({ webviewRef, setHovered }: GestureScreenProps) {
    const [mode, setMode] = useState<GestureScreenMode>(GestureScreenMode.Design);
    const editorEngine = useEditorEngine();

    function gestureScreensClicked(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.preventDefault();

        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }

        editorEngine.webviews.deselectAll();
        editorEngine.webviews.select(webview);
        editorEngine.webviews.notify();
    }

    function mouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (!webviewRef || !webviewRef.current) {
            return;
        }
        const webview = webviewRef.current as Electron.WebviewTag;

        const { x, y } = getRelativeMousePosition(e, webview, webviewRef);
        webview.send(WebviewChannels.MOUSE_MOVE, {
            x,
            y,
        });
    }

    function getRelativeMousePosition(
        e: React.MouseEvent<HTMLDivElement>,
        webview: Electron.WebviewTag,
        webviewRef: React.RefObject<Electron.WebviewTag> | null = null,
    ) {
        const rect = webview.getBoundingClientRect();
        const scale = editorEngine.scale;
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;
        return { x, y };
    }

    function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.preventDefault();

        const webview = webviewRef?.current as Electron.WebviewTag | null;
        if (!webview) {
            return;
        }

        const { x, y } = getRelativeMousePosition(e, webview);
        webview.send(WebviewChannels.MOUSE_DOWN, {
            x,
            y,
        });
    }

    return (
        <div
            className="absolute inset-0 bg-transparent"
            onClick={gestureScreensClicked}
            onMouseOver={() => setHovered(true)}
            onMouseOut={() => setHovered(false)}
            onMouseMove={mouseMove}
            onMouseDown={onMouseDown}
        ></div>
    );
}

export default GestureScreen;
