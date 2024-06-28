import { EditorEngine } from "@/lib/editor/engine";
import { useEffect, useRef } from "react";

function Overlay({ children, editorEngine }: { children: React.ReactNode, editorEngine: EditorEngine }) {
    const overlayContainerRef = useRef(null);

    useEffect(() => {
        if (overlayContainerRef.current) {
            const overlayContainer = overlayContainerRef.current;
            editorEngine.overlay.setOverlayContainer(overlayContainer);
            return () => {
                editorEngine.overlay.clear();
            };
        }
    }, [overlayContainerRef]);
    return (
        <>
            {children}
            <div ref={overlayContainerRef} style={{ position: 'absolute', height: 0, width: 0, top: 0, left: 0, pointerEvents: 'none', zIndex: 99 }} />
        </>
    )
}

export default Overlay;