import { cn } from '@onlook/ui/utils';
import { useRef, useState } from 'react';

export default function ResizablePanel({ children }: { children: React.ReactNode }) {
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelWidth, setPanelWidth] = useState(240);

    const startResize = (e: any) => {
        e.preventDefault();
        e.stopPropagation();

        const panel = panelRef.current;
        if (!panel) {
            return;
        }
        const startX = e.clientX;
        const boundingRect = panel.getBoundingClientRect();
        const startWidth = boundingRect.width;

        const resize: any = (e: MouseEvent) => {
            const currentWidth = startWidth + e.clientX - startX;
            setPanelWidth(currentWidth);
        };

        const stopResize = (e: any) => {
            e.preventDefault();
            e.stopPropagation();

            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResize);
        };

        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    };

    return (
        <div
            className={cn('absolute top-10 left-0 w-60 min-w-60 max-w-96')}
            ref={panelRef}
            style={{ width: `${panelWidth}px` }}
            id="layer-tab-id"
        >
            {children}
            <div
                className="top-0 h-full w-2 absolute right-0 cursor-ew-resize z-50 flex items-center justify-center"
                onMouseDown={startResize}
            />
        </div>
    );
}
