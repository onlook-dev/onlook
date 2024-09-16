import { EditorMode } from '@/lib/models';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useEditorEngine } from '..';

interface PanOverlayProps {
    setPosition: React.Dispatch<
        React.SetStateAction<{
            x: number;
            y: number;
        }>
    >;
    isPanning: boolean;
    setIsPanning: React.Dispatch<React.SetStateAction<boolean>>;
}
const PanOverlay = observer(({ setPosition, isPanning, setIsPanning }: PanOverlayProps) => {
    const editorEngine = useEditorEngine();

    const startPan = (event: React.MouseEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsPanning(true);
    };

    const pan = (event: React.MouseEvent<HTMLDivElement>) => {
        if (!isPanning) {
            return;
        }

        const deltaX = -event.movementX;
        const deltaY = -event.movementY;
        setPosition((prevPosition) => ({
            x: prevPosition.x - deltaX,
            y: prevPosition.y - deltaY,
        }));
    };

    const endPan = () => {
        setIsPanning(false);
    };

    return (
        <div
            className={clsx(
                'absolute w-full h-full cursor-grab',
                editorEngine.mode === EditorMode.PAN ? 'visible ' : 'hidden',
                isPanning ? 'cursor-grabbing' : 'cursor-grab',
            )}
            onMouseDown={startPan}
            onMouseMove={pan}
            onMouseUp={endPan}
            onMouseLeave={endPan}
        ></div>
    );
});

export default PanOverlay;
