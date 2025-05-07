import { useEditorEngine } from '@/components/store';
import type { Frame } from '@onlook/models';
import { observer } from 'mobx-react-lite';

export const TopBar = observer(
    ({ frame, children }: { frame: Frame; children?: React.ReactNode }) => {
        const editorEngine = useEditorEngine();

        const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();
            clearElements();

            const startX = e.clientX;
            const startY = e.clientY;
            const startPositionX = frame.position.x;
            const startPositionY = frame.position.y;

            const handleMove = (e: MouseEvent) => {
                const scale = editorEngine.canvas.scale;
                const deltaX = (e.clientX - startX) / scale;
                const deltaY = (e.clientY - startY) / scale;

                frame.position = {
                    x: startPositionX + deltaX,
                    y: startPositionY + deltaY,
                };
                editorEngine.canvas.saveFrame(frame.id, frame);
            };

            const endMove = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();

                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', endMove);
            };

            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', endMove);
        };

        const clearElements = () => {
            editorEngine.elements.clear();
            editorEngine.overlay.clear();
        };

        return (
            <div
                className="rounded bg-foreground-primary/10 hover:shadow h-6 m-auto flex flex-row items-center backdrop-blur-sm overflow-hidden relative shadow-sm border-input text-foreground"
                style={{
                    height: `${28 / editorEngine.canvas.scale}px`,
                    width: `${frame.dimension.width}px`,
                    marginBottom: `${20 / editorEngine.canvas.scale}px`,
                }}
                onMouseDown={handleMouseDown}
            >
                {children}
            </div>
        );
    },
);
