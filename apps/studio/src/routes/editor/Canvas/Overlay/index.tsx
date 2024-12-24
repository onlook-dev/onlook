import { useEditorEngine } from '@/components/Context';
import type { RectDimensions } from '@/lib/editor/engine/overlay/rect';
import { EditorMode } from '@/lib/models';
import { observer } from 'mobx-react-lite';
import { nanoid } from 'nanoid/non-secure';
import { useEffect, useRef, useState } from 'react';
import { ClickRect } from './ClickRect';
import { HoverRect } from './HoverRect';
import { InsertRect } from './InsertRect';
import { TextEditor } from './TextEditor';

interface ClickRectState extends RectDimensions {
    isComponent?: boolean;
    styles?: Record<string, string>;
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
    const [textEditorState, setTextEditorState] = useState<{
        rect: RectDimensions;
        content: string;
        styles: Record<string, string>;
        isComponent?: boolean;
        onChange?: (content: string) => void;
        onStop?: () => void;
    } | null>(null);

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
                    styles: Record<string, string>,
                    isComponent?: boolean,
                ) => {
                    setClickRects((prev) => [
                        ...prev,
                        {
                            ...rect,
                            styles,
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
                    setTextEditorState(null);
                },
                addTextEditor: (
                    rect: RectDimensions,
                    content: string,
                    styles: Record<string, string>,
                    onChange: (content: string) => void,
                    onStop: () => void,
                    isComponent?: boolean,
                ) => {
                    setTextEditorState({ rect, content, styles, onChange, onStop, isComponent });
                },
                updateTextEditor: (rect: RectDimensions) => {
                    setTextEditorState((prev) => (prev ? { ...prev, rect } : null));
                },
                removeTextEditor: () => {
                    setTextEditorState(null);
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
                {clickRects.map((rectState: ClickRectState) => (
                    <ClickRect
                        key={rectState.id}
                        width={rectState.width}
                        height={rectState.height}
                        top={rectState.top}
                        left={rectState.left}
                        isComponent={rectState.isComponent}
                        styles={rectState.styles ?? {}}
                    />
                ))}
                {textEditorState && (
                    <TextEditor
                        rect={textEditorState.rect}
                        content={textEditorState.content}
                        styles={textEditorState.styles}
                        onChange={textEditorState.onChange}
                        onStop={textEditorState.onStop}
                        isComponent={textEditorState.isComponent}
                    />
                )}
            </div>
        </>
    );
});

export default Overlay;
