import { useEditorEngine } from '@/components/store';
import { observer } from 'mobx-react-lite';
import { useCallback } from 'react';

export const GestureScreen = observer(({
    isResizing,
    frameRef,
    setHovered
}: {
    isResizing: boolean;
    frameRef: React.RefObject<HTMLIFrameElement>;
    setHovered: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const editorEngine = useEditorEngine();
    
    const handleClick = useCallback((e: React.MouseEvent) => {
        if (isResizing) return;
        
        console.log('Gesture screen click detected');
        e.preventDefault();
        e.stopPropagation();
    }, [isResizing]);
    
    return (
        <div
            className="absolute inset-0 z-20 pointer-events-auto"
            onClick={handleClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                pointerEvents: isResizing ? 'none' : 'auto'
            }}
        />
    );
});
