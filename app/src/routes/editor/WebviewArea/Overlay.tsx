import { useEditorEngine } from '@/components/Context/Editor';
import { EditorMode } from '@/lib/models';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef } from 'react';

const Overlay = observer(({ children }: { children: React.ReactNode }) => {
    const overlayContainerRef = useRef(null);
    const editorEngine = useEditorEngine();

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
            <div
                ref={overlayContainerRef}
                style={{
                    position: 'absolute',
                    height: 0,
                    width: 0,
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    zIndex: 99,
                    visibility: editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                }}
            />
        </>
    );
});

export default Overlay;
