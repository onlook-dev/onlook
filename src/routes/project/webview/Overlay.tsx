import { OverlayManager } from "@/lib/editor/overlay";
import { useEffect, useRef } from "react";

function Overlay({ children, overlayManager }: { children: React.ReactNode, overlayManager: OverlayManager }) {
    const overlayContainerRef = useRef(null);

    useEffect(() => {
        if (overlayContainerRef.current) {
            const overlayContainer = overlayContainerRef.current;
            if (!overlayManager) return;
            overlayManager.setOverlayContainer(overlayContainer);
            return () => {
                overlayManager.clear();
            };
        }
    }, [overlayManager, overlayContainerRef]);
    return (
        <>
            {children}
            <div ref={overlayContainerRef} style={{ position: 'absolute', height: 0, width: 0, top: 0, left: 0, pointerEvents: 'none', zIndex: 99 }} />
        </>
    )
}

export default Overlay;