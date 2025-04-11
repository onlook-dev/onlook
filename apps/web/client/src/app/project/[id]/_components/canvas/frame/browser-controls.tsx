import { useEditorEngine } from '@/components/store';
import type { WebFrame } from '@onlook/models';
import { Button } from '@onlook/ui-v4/button';
import { Input } from '@onlook/ui-v4/input';
import { cn } from '@onlook/ui-v4/utils';
import { observer } from 'mobx-react-lite';
import { useState, useCallback } from 'react';

export const BrowserControls = observer(({
    frameRef,
    url,
    selected,
    hovered,
    setHovered,
    setDarkmode,
    frame
}: {
    frameRef: React.RefObject<HTMLIFrameElement>,
    url: string,
    selected: boolean,
    hovered: boolean,
    setHovered: React.Dispatch<React.SetStateAction<boolean>>,
    setDarkmode: React.Dispatch<React.SetStateAction<boolean>>,
    frame: WebFrame
}) => {
    const editorEngine = useEditorEngine();
    const [inputUrl, setInputUrl] = useState(url);
    
    const handleUrlChange = useCallback((e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log('URL change requested to:', inputUrl);
    }, [inputUrl]);
    
    const handleStartMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        
        const startX = e.clientX;
        const startY = e.clientY;
        
        const handleMouseMove = (e: MouseEvent) => {
            const scale = editorEngine.canvas.scale;
            const deltaX = (e.clientX - startX) / scale;
            const deltaY = (e.clientY - startY) / scale;
            
            frame.position = {
                x: frame.position.x + deltaX,
                y: frame.position.y + deltaY
            };
        };
        
        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [frame, editorEngine.canvas.scale]);
    
    return (
        <div
            className={cn(
                'flex w-full h-10 bg-background border-x border-t border-border rounded-t-md',
                selected && 'bg-background-selected',
                !selected && hovered && 'bg-background-hover'
            )}
            onMouseDown={handleStartMove}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div className="flex items-center px-2 space-x-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                        frameRef.current?.contentWindow?.history.back();
                    }}
                >
                    ←
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                        frameRef.current?.contentWindow?.history.forward();
                    }}
                >
                    →
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                        frameRef.current?.contentWindow?.location.reload();
                    }}
                >
                    ↻
                </Button>
            </div>
            <form
                className="flex-1 px-2"
                onSubmit={handleUrlChange}
            >
                <Input
                    className="h-8"
                    placeholder="URL"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                />
            </form>
            <div className="flex items-center px-2 space-x-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDarkmode(prev => !prev)}
                >
                    {darkmode ? '☀️' : '🌙'}
                </Button>
            </div>
        </div>
    );
});
