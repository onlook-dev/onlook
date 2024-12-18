import { useEditorEngine } from '@/components/Context';
import type { RectDimensions } from '@/lib/editor/engine/overlay/components';
import { ClickRect, HoverRect, InsertRect } from '@/lib/editor/engine/overlay/components';
import { EditorMode } from '@/lib/models';
import { observer } from 'mobx-react-lite';
import { nanoid } from 'nanoid/non-secure';
import { useEffect, useRef, useState } from 'react';

interface ClickRectState extends RectDimensions {
    isComponent?: boolean;
    margin?: string;
    padding?: string;
    elWidth?: string;
    elHeight?: string;
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
                    styles?: { margin?: string; padding?: string; width?: string; height?: string },
                    isComponent?: boolean,
                ) => {
                    setClickRects((prev) => [
                        ...prev,
                        {
                            ...rect,
                            margin: styles?.margin,
                            padding: styles?.padding,
                            elWidth: styles?.width,
                            elHeight: styles?.height,
                            isComponent,
                            id: nanoid(4),
                        },
                    ]);
                },
                removeClickRects: () => {
                    setClickRects([]);
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
                        elWidth={rect.elWidth}
                        elHeight={rect.elHeight}
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
