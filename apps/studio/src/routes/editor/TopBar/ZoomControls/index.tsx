import { observer } from 'mobx-react-lite';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { useState, type SetStateAction } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Input } from '@onlook/ui/input';
import { DefaultSettings } from '@onlook/models/constants';
const ZoomControls = observer(
    ({
        scale,
        onPositionChange,
        onScaleChange,
    }: {
        scale: number;
        onPositionChange: (position: any) => void;
        onScaleChange: (scale: number) => void;
    }) => {
        const ZOOM_SENSITIVITY = 0.5;
        const MIN_ZOOM = 0.1;
        const MAX_ZOOM = 3;
        const [borderColor, setBorderColor] = useState('border-gray-300');
        const [inputValue, setInputValue] = useState('');
        const isMac = process.platform === 'darwin';
        const ctrl = isMac ? '⌘' : 'Ctrl';
        const handleZoom = (factor: number) => {
            const container = document.getElementById('canvas-container');
            if (container == null) {
                return;
            }

            const zoomFactor = factor * ZOOM_SENSITIVITY;
            const newScale = scale * (1 + zoomFactor);
            const lintedScale = clampZoom(newScale);
            //Zoom in/out
            onScaleChange(lintedScale);
            setInputValue(`${Math.round(lintedScale * 100)}%`);
        };
        function clampZoom(scale: number) {
            return Math.min(Math.max(scale, MIN_ZOOM), MAX_ZOOM);
        }
        const handleZoomToFit = () => {
            const container = document.getElementById('canvas-container');
            const content = container?.firstElementChild as HTMLElement;
            if (container && content) {
                const contentRect = content.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                const scaleX = containerRect.width / contentRect.width;
                const scaleY = containerRect.height / contentRect.height;
                const newScale = Math.min(scaleX, scaleY) * 0.9;
                //Zoom fit
                onScaleChange(newScale);
                setInputValue(`${Math.round(newScale * 100)}%`);
                //Position fit
                const newPosition = {
                    x: DefaultSettings.POSITION.x,
                    y: DefaultSettings.POSITION.y,
                };
                onPositionChange(newPosition);
            }
        };
        const handleCustomZoom = (value: string) => {
            value = value.trim();
            const isZoom = /^[0-9]+%$/.test(value);
            if (isZoom) {
                const numericValue = parseInt(value.replace('%', ''));
                if (!isNaN(numericValue)) {
                    const clampedValue = Math.min(Math.max(numericValue / 100, 0), 1);
                    onScaleChange(clampedValue);
                    setBorderColor('border-gray-300');
                }
            } else {
                setBorderColor('border-red-500');
            }
        };
        return (
            <div className="mx-2 flex flex-row items-center text-small gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center px-2 py-1 rounded hover:bg-accent">
                        <span>{Math.round(scale * 100)}%</span>
                        <ChevronDownIcon className="ml-1 h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="flex flex-col p-3">
                        <Input
                            value={inputValue}
                            onChange={(e: { target: { value: SetStateAction<string> } }) =>
                                setInputValue(e.target.value)
                            }
                            onKeyDown={(e: { key: string }) => {
                                if (e.key === 'Enter') {
                                    handleCustomZoom(inputValue);
                                }
                            }}
                            onClick={(e: any) => setBorderColor('border-blue -300')}
                            className={`p-1 h-7 text-center ${borderColor} rounded border`}
                            autoFocus
                        />
                        <DropdownMenuItem onClick={() => handleZoom(1)}>
                            <span className="flex-grow">Zoom in</span>
                            <span className="text-sm text-gray-500">{ctrl}++</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleZoom(-1)}>
                            <span className="flex-grow">Zoom out</span>
                            <span className="text-sm text-gray-500">{ctrl}+-</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleZoomToFit}>
                            <span className="flex-grow">Zoom fit</span>
                            <span className="text-sm text-gray-500">{ctrl}+0</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onScaleChange(1)}>
                            Zoom 100%
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onScaleChange(2)}>
                            Zoom 200%
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        );
    },
);
export default ZoomControls;
