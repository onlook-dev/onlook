'use client';

import { useEditorEngine } from '@/components/store/editor';
import { observer } from 'mobx-react-lite';

const SNAP_VISUAL_CONFIG = {
    TOP_BAR_HEIGHT: 28,
    TOP_BAR_MARGIN: 10,
} as const;

export const SnapGuidelines = observer(() => {
    const editorEngine = useEditorEngine();
    const snapLines = editorEngine.snap.activeSnapLines;

    if (snapLines.length === 0) {
        return null;
    }

    const scale = editorEngine.canvas.scale;
    const canvasPosition = editorEngine.canvas.position;

    return (
        <div
            className="absolute inset-0 pointer-events-none"
            style={{
                transform: `translate(${canvasPosition.x}px, ${canvasPosition.y}px) scale(${scale})`,
                transformOrigin: '0 0',
            }}
        >
            {snapLines.map((line) => {
                if (line.orientation === 'horizontal') {
                    const visualOffset = (SNAP_VISUAL_CONFIG.TOP_BAR_HEIGHT + SNAP_VISUAL_CONFIG.TOP_BAR_MARGIN) / scale;
                    
                    return (
                        <div
                            key={line.id}
                            className="absolute bg-red-500"
                            style={{
                                left: `${line.start}px`,
                                top: `${line.position + visualOffset}px`,
                                width: `${line.end - line.start}px`,
                                height: `${Math.max(1, 1 / scale)}px`,
                                opacity: 0.9,
                                boxShadow: '0 0 4px rgba(239, 68, 68, 0.6)',
                            }}
                        />
                    );
                } else {
                    return (
                        <div
                            key={line.id}
                            className="absolute bg-red-500"
                            style={{
                                left: `${line.position}px`,
                                top: `${line.start}px`,
                                width: `${Math.max(1, 1 / scale)}px`,
                                height: `${line.end - line.start}px`,
                                opacity: 0.9,
                                boxShadow: '0 0 4px rgba(239, 68, 68, 0.6)',
                            }}
                        />
                    );
                }
            })}
        </div>
    );
});