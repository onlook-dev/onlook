import { useEditorEngine } from '@/components/Context';
import { EditorMode } from '@/lib/models';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { HoverRect, InsertRect, ClickRect } from '@/lib/editor/engine/overlay/components';
import type { RectDimensions } from '@/lib/editor/engine/overlay/components';

interface ClickRectState extends RectDimensions {
    isComponent?: boolean;
    margin?: string;
    padding?: string;
    id: string;
}

const Overlay = observer(({ children }: { children: React.ReactNode }) => {
    const overlayContainerRef = useRef(null);
    const editorEngine = useEditorEngine();
    const [hoverRect, setHoverRect] = useState<{
        rect: RectDimensions;
        isComponent?: boolean;
    } | null>(null);
    const [insertRect, setInsertRect] = useState<RectDimensions | null>(null);
    const [clickRects, setClickRects] = useState<ClickRectState[]>([]);

    useEffect(() => {
        if (overlayContainerRef.current) {
            const overlayContainer = overlayContainerRef.current;
            // Set both DOM element and container interface
            editorEngine.overlay.setOverlayContainer(overlayContainer);
            editorEngine.overlay.setOverlayContainer({
                updateHoverRect: (rect: RectDimensions | null, isComponent?: boolean) => {
                    setHoverRect(rect ? { rect, isComponent } : null);
                },
                updateInsertRect: (rect: RectDimensions | null) => {
                    setInsertRect(rect);
                },
                addClickRect: (
                    rect: RectDimensions,
                    styles?: { margin?: string; padding?: string },
                    isComponent?: boolean,
                ) => {
                    setClickRects((prev) => [
                        ...prev,
                        {
                            ...rect,
                            margin: styles?.margin,
                            padding: styles?.padding,
                            isComponent,
                            id: Date.now().toString(),
                        },
                    ]);
                },
                removeClickRect: () => {
                    setClickRects((prev) => prev.slice(0, -1));
                },
                clear: () => {
                    setHoverRect(null);
                    setInsertRect(null);
                    setClickRects([]);
                },
            });
            return () => {
                editorEngine.overlay.clear();
            };
        }
    }, [editorEngine.overlay]);

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
            >
                {hoverRect && (
                    <HoverRect rect={hoverRect.rect} isComponent={hoverRect.isComponent} />
                )}
                {insertRect && <InsertRect rect={insertRect} />}
                {clickRects.map((rect) => (
                    <ClickRect
                        key={rect.id}
                        width={rect.width}
                        height={rect.height}
                        top={rect.top}
                        left={rect.left}
                        isComponent={rect.isComponent}
                        margin={rect.margin}
                        padding={rect.padding}
                    />
                ))}
            </div>
        </>
    );
});

export default Overlay;
