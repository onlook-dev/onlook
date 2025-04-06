import { useEditorEngine } from '@/components/store';
import type { Frame } from '@onlook/models';
import { observer } from 'mobx-react-lite';

export const TopBar = observer(
    ({
        frame,
        children
    }: {
        frame: Frame;
        children?: React.ReactNode;
    }) => {
        const editorEngine = useEditorEngine();

        const startMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
            e.preventDefault();
            e.stopPropagation();

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

        return (
            <div
                className='rounded bg-foreground-primary/10 hover:shadow h-6 m-auto flex flex-row items-center backdrop-blur-sm overflow-hidden relative shadow-sm border-input text-foreground'
                style={{
                    transform: `scale(${1 / editorEngine.canvas.scale})`,
                    width: `${frame.dimension.width * editorEngine.canvas.scale}px`,
                    marginBottom: `${20 / editorEngine.canvas.scale}px`,
                }}
                onMouseDown={startMove}
            >
                {children}
            </div>
        );
    },
);