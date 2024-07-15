import { useState } from 'react';
import { useEditorEngine } from '..';

enum GestureScreenMode {
    None = 'None',
    Design = 'Design',
    Interact = 'Interact',
}

interface GestureScreenProps {
    webviewRef: React.RefObject<Electron.WebviewTag>;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
}

function GestureScreen({ webviewRef, setHovered }: GestureScreenProps) {
    const [mode, setMode] = useState<GestureScreenMode>(GestureScreenMode.None);
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

    return (
        <div
            className="absolute inset-0 bg-transparent"
            onClick={gestureScreensClicked}
            onMouseOver={() => {
                setHovered(true);
            }}
            onMouseMove={(e) => {
                console.log('mouse move', e.clientX, e.clientY);
            }}
            onMouseDown={(e) => {
                console.log('mouse down', e.clientX, e.clientY);
            }}
            onMouseOut={() => {
                setHovered(false);
            }}
        ></div>
    );
}

export default GestureScreen;
