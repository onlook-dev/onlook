import { useEditorEngine } from '@/components/store/editor';
import { EditorMode } from '@onlook/models';
import React, { useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DefaultSettings } from '@onlook/constants';
import { FrameType } from '@onlook/models';
import { v4 as uuid } from 'uuid';
import { toast } from '@onlook/ui/sonner';

type Point = { x: number; y: number };

export const SelectionBoxOverlay: React.FC = observer(() => {
    const [start, setStart] = useState<Point | null>(null);
    const [end, setEnd] = useState<Point | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const startRef = useRef<Point | null>(null);
    const editorEngine = useEditorEngine();

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (editorEngine.state.editorMode !== EditorMode.INSERT_WINDOW) {
            return;
        }
        if (e.button !== 0) {
            return;
        }
        const rect = overlayRef.current?.getBoundingClientRect();
        if (!rect) {
            return;
        }
        const startPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setStart(startPoint);
        startRef.current = startPoint;
        setEnd(null);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp as any);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!startRef.current || !overlayRef.current) {
            return;
        }
        const rect = overlayRef.current.getBoundingClientRect();
        const endPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setEnd(endPoint);
    };

    const handleMouseUp = async (e: MouseEvent) => {
        const rect = overlayRef.current?.getBoundingClientRect();
        let computedEnd: Point | null = null;
        if (rect) {
            computedEnd = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }
        if (startRef.current && computedEnd && editorEngine.state.editorMode === EditorMode.INSERT_WINDOW) {
            const left = Math.min(startRef.current.x, computedEnd.x);
            const top = Math.min(startRef.current.y, computedEnd.y);
            const width = Math.abs(startRef.current.x - computedEnd.x);
            const height = Math.abs(startRef.current.y - computedEnd.y);
            let url = DefaultSettings.URL;
            const selected = editorEngine.frames.selected;
            if (!selected || selected.length === 0) {
                setStart(null);
                startRef.current = null;
                setEnd(null);
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp as any);
                return;
            }
            // Convert selection box coordinates to canvas coordinates
            const scale = editorEngine.canvas.scale;
            const position = editorEngine.canvas.position;
            const canvasX = (left - position.x) / scale;
            const canvasY = (top - position.y) / scale - 28;
            const canvasWidth = width / scale;
            const canvasHeight = height / scale;
            if (
                selected &&
                selected.length > 0 &&
                selected[0] &&
                'url' in selected[0].frame &&
                typeof (selected[0].frame as { url?: string }).url === 'string' &&
                (selected[0].frame as { url?: string }).url
            ) {
                url = (selected[0].frame as { url: string }).url;
            }
            if (canvasWidth > 10 && canvasHeight > 10) { // avoid accidental tiny windows
                const newFrame = {
                    id: uuid(),
                    url,
                    position: { x: canvasX, y: canvasY },
                    dimension: { width: canvasWidth, height: canvasHeight },
                    type: FrameType.WEB,
                };
                try {
                    await editorEngine.frames.create(newFrame);
                } catch (err) {
                    toast.error('Failed to create frame', {
                        description: err instanceof Error ? err.message : String(err),
                    });
                }
            }
        }
        setStart(null);
        startRef.current = null;
        setEnd(null);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp as any);
    };

    let boxStyle: React.CSSProperties | undefined;
    if (start && end) {
        const left = Math.min(start.x, end.x);
        const top = Math.min(start.y, end.y);
        const width = Math.abs(start.x - end.x);
        const height = Math.abs(start.y - end.y);
        boxStyle = {
            position: 'absolute',
            left,
            top,
            width,
            height,
            border: '2px solid #fff',
            background: 'rgba(255,255,255,0.2)',
            pointerEvents: 'none',
            zIndex: 10,
        };
    }

    return (
        <div
            ref={overlayRef}
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                pointerEvents: editorEngine.state.editorMode === EditorMode.INSERT_WINDOW ? 'auto' : 'none',
                cursor: editorEngine.state.editorMode === EditorMode.INSERT_WINDOW ? 'crosshair' : 'default',
            }}
            onMouseDown={handleMouseDown}
        >
            {boxStyle && <div style={boxStyle} />}
        </div>
    );
});
