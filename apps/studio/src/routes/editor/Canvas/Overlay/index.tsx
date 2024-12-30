import { useEditorEngine } from '@/components/Context';
import type { ClickRectState } from '@/lib/editor/engine/overlay/state';
import { EditorMode } from '@/lib/models';
import { EditorAttributes } from '@onlook/models/constants';
import { observer } from 'mobx-react-lite';
import { ClickRect } from './ClickRect';
import { HoverRect } from './HoverRect';
import { InsertRect } from './InsertRect';
import { TextEditor } from './TextEditor';

const Overlay = observer(({ children }: { children: React.ReactNode }) => {
    const editorEngine = useEditorEngine();
    const state = editorEngine.overlay.state;

    return (
        <>
            {children}
            <div
                style={{
                    position: 'absolute',
                    height: 0,
                    width: 0,
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    visibility: editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                }}
                id={EditorAttributes.OVERLAY_CONTAINER_ID}
            >
                {state.hoverRect && (
                    <HoverRect
                        rect={state.hoverRect.rect}
                        isComponent={state.hoverRect.isComponent}
                    />
                )}
                {state.insertRect && <InsertRect rect={state.insertRect} />}
                {state.clickRects.map((rectState: ClickRectState) => (
                    <ClickRect
                        key={rectState.id}
                        width={rectState.width}
                        height={rectState.height}
                        top={rectState.top}
                        left={rectState.left}
                        isComponent={rectState.isComponent}
                        styles={rectState.styles ?? {}}
                        shouldShowResizeHandles={editorEngine.elements.selected.length === 1}
                    />
                ))}
                {state.textEditor && (
                    <TextEditor
                        rect={state.textEditor.rect}
                        content={state.textEditor.content}
                        styles={state.textEditor.styles}
                        onChange={state.textEditor.onChange}
                        onStop={state.textEditor.onStop}
                        isComponent={state.textEditor.isComponent}
                    />
                )}
            </div>
        </>
    );
});

export default Overlay;
