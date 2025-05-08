import { useEditorEngine } from '@/components/store/editor';
import { EditorMode } from '@onlook/models';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';

interface PanOverlayProps {
    clampPosition: (position: { x: number; y: number }) => { x: number; y: number };
}

export const PanOverlay = observer(({ clampPosition }: PanOverlayProps) => {
    const editorEngine = useEditorEngine();

    const startPan = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        editorEngine.state.canvasPanning = true;
    };

    const pan = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!editorEngine.state.canvasPanning) {
            return;
        }

        const deltaX = -event.movementX;
        const deltaY = -event.movementY;
        editorEngine.canvas.position = clampPosition({
            x: editorEngine.canvas.position.x - deltaX,
            y: editorEngine.canvas.position.y - deltaY,
        });
    };

    const endPan = () => {
        editorEngine.state.canvasPanning = false;
    };

    return (
        <div
            className={cn(
                'absolute w-full h-full cursor-grab',
                editorEngine.state.editorMode === EditorMode.PAN ? 'visible ' : 'hidden',
                editorEngine.state.canvasPanning ? 'cursor-grabbing' : 'cursor-grab',
            )}
            onMouseDown={startPan}
            onMouseMove={pan}
            onMouseUp={endPan}
            onMouseLeave={endPan}
        ></div>
    );
});
