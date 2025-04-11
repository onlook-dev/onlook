import type { WebFrame } from "@onlook/models";
import { cn } from "@onlook/ui-v4/utils";
import { observer } from "mobx-react-lite";
import { useEditorEngine } from '@/components/store';
import { useState, useRef, useEffect } from 'react';
import { ResizeHandles } from './resize-handles';
import { BrowserControls } from './browser-controls';
import { GestureScreen } from './gesture-screen';

export const WebFrameComponent = observer(({
    frame,
}: { frame: WebFrame }) => {
    const editorEngine = useEditorEngine();
    const [selected, setSelected] = useState<boolean>(false);
    const [hovered, setHovered] = useState<boolean>(false);
    const [darkmode, setDarkmode] = useState<boolean>(false);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    
    useEffect(() => {
        setSelected(editorEngine.webviews?.isSelected?.(frame.id) || false);
    }, [editorEngine.webviews, frame.id]);
    
    return (
        <div
            className="flex flex-col fixed"
            style={{ transform: `translate(${frame.position.x}px, ${frame.position.y}px)` }}
        >
            <BrowserControls
                frameRef={iframeRef}
                url={frame.url}
                selected={selected}
                hovered={hovered}
                setHovered={setHovered}
                setDarkmode={setDarkmode}
                frame={frame}
            />
            <div className="relative">
                <ResizeHandles
                    frame={frame}
                    setIsResizing={setIsResizing}
                />
                <iframe
                    id={frame.id}
                    ref={iframeRef}
                    className={cn(
                        'backdrop-blur-sm transition outline outline-4',
                        selected ? 'outline-teal-400' : 'outline-transparent',
                    )}
                    src={frame.url}
                    sandbox="allow-modals allow-forms allow-same-origin allow-scripts allow-popups allow-downloads"
                    allow="geolocation; microphone; camera; midi; encrypted-media"
                    style={{
                        width: frame.dimension.width,
                        height: frame.dimension.height,
                    }}
                />
                <GestureScreen
                    isResizing={isResizing}
                    frameRef={iframeRef}
                    setHovered={setHovered}
                />
            </div>
        </div>
    );
});
