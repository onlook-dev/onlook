import { useEditorEngine } from '@/components/Context';
import { HotKeyLabel } from '@/components/ui/hotkeys-label';
import { DefaultSettings, EditorAttributes } from '@onlook/models/constants';
import { Input } from '@onlook/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Hotkey } from '/common/hotkeys';

const ZoomControls = observer(() => {
    const editorEngine = useEditorEngine();
    const scale = editorEngine.canvas.scale;

    const [inputValue, setInputValue] = useState(`${Math.round(scale * 100)}%`);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const ZOOM_SENSITIVITY = 0.5;
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 3;

    const handleZoom = (factor: number) => {
        const container = document.getElementById(EditorAttributes.CANVAS_CONTAINER_ID);
        if (container == null) {
            return;
        }

        const zoomFactor = factor * ZOOM_SENSITIVITY;
        const newScale = scale * (1 + zoomFactor);
        const lintedScale = clampZoom(newScale);
        editorEngine.canvas.scale = lintedScale;
    };

    function clampZoom(scale: number) {
        return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
    }

    const handleZoomToFit = () => {
        const container = document.getElementById(EditorAttributes.CANVAS_CONTAINER_ID);
        const content = container?.firstElementChild as HTMLElement;
        if (container && content) {
            const contentRect = content.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const scaleX = containerRect.width / contentRect.width;
            const scaleY = containerRect.height / contentRect.height;
            const newScale = Math.min(scaleX, scaleY) * 0.9;
            editorEngine.canvas.scale = newScale;
            //Position fit
            const newPosition = {
                x: DefaultSettings.POSITION.x,
                y: DefaultSettings.POSITION.y,
            };
            editorEngine.canvas.position = newPosition;
        }
    };

    const handleCustomZoom = (value: string) => {
        value = value.trim();
        const isZoom = /^[0-9]+%?$/.test(value);
        if (isZoom) {
            const numericValue = parseInt(value.replace('%', ''));
            if (!isNaN(numericValue)) {
                const newScale = numericValue / 100;
                const clampedScale = clampZoom(newScale);
                editorEngine.canvas.scale = clampedScale;
            }
        }
    };

    return (
        <div className="mx-2 flex flex-row items-center text-mini text-foreground-onlook hover:text-foreground-active transition-all duration-300 ease-in-out h-full p-1">
            <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <PopoverTrigger className="group flex items-center px-2 py-1 rounded hover:bg-accent data-[state=open]:text-foreground-active">
                    <span>{Math.round(scale * 100)}%</span>
                    <ChevronDownIcon className="ml-1 h-4 w-4 transition-transform group-data-[state=open]:-rotate-180 duration-200 ease-in-out" />
                </PopoverTrigger>
                <PopoverContent className="flex flex-col p-1.5 bg-background/85 backdrop-blur-md w-42 min-w-42">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e: { key: string }) => {
                            if (e.key === 'Enter') {
                                handleCustomZoom(inputValue);
                            }
                        }}
                        className={`p-1 h-6 text-left text-smallPlus rounded border mb-1 focus-visible:border-red-500`}
                        autoFocus
                    />
                    <button
                        onClick={() => handleZoom(1)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                    >
                        <HotKeyLabel
                            className="w-full justify-between text-mini"
                            hotkey={Hotkey.ZOOM_IN}
                        />
                    </button>
                    <button
                        onClick={() => handleZoom(-1)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                    >
                        <HotKeyLabel
                            className="w-full justify-between text-mini"
                            hotkey={Hotkey.ZOOM_OUT}
                        />
                    </button>
                    <button
                        onClick={handleZoomToFit}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                    >
                        <HotKeyLabel
                            className="w-full justify-between text-mini"
                            hotkey={Hotkey.ZOOM_FIT}
                        />
                    </button>
                    <button
                        onClick={() => (editorEngine.canvas.scale = 1)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                    >
                        <span className="flex-grow text-mini">Zoom 100%</span>
                    </button>
                    <button
                        onClick={() => (editorEngine.canvas.scale = 2)}
                        className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                    >
                        <span className="flex-grow text-mini">Zoom 200%</span>
                    </button>
                </PopoverContent>
            </Popover>
        </div>
    );
});
export default ZoomControls;
