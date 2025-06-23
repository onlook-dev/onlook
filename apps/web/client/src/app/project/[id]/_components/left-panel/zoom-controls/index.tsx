import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { Input } from '@onlook/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';

import { Hotkey } from '@/components/hotkey';
import { EditorAttributes } from '@onlook/constants';
import { HotkeyLabel } from '@onlook/ui/hotkey-label';
import { useTranslations } from 'next-intl';

export const ZoomControls = observer(() => {
    const editorEngine = useEditorEngine();
    const scale = editorEngine.canvas.scale;
    const t = useTranslations();

    const [inputValue, setInputValue] = useState(`${Math.round(scale * 100)}%`);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        setInputValue(`${Math.round(scale * 100)}%`);
    }, [editorEngine.canvas.scale]);

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
        if (!container) {
            console.warn('No container found');
            return;
        }

        const viewport = container.parentElement;
        if (!viewport) {
            console.warn('No viewport found');
            return;
        }

        const iframe = container.querySelector('iframe');
        if (!iframe) {
            console.warn('No iframe found');
            return;
        }

        const iframeStyle = window.getComputedStyle(iframe);
        const contentWidth = parseInt(iframeStyle.width, 10) || iframe.offsetWidth;
        const contentHeight = parseInt(iframeStyle.height, 10) || iframe.offsetHeight;

        const viewportRect = viewport.getBoundingClientRect();
        const availableWidth = viewportRect.width;
        const availableHeight = viewportRect.height;

        if (
            contentWidth <= 0 ||
            contentHeight <= 0 ||
            availableWidth <= 0 ||
            availableHeight <= 0
        ) {
            console.warn('Invalid dimensions');
            return;
        }

        const scaleX = availableWidth / contentWidth;
        const scaleY = availableHeight / contentHeight;
        const newScale = Math.min(scaleX, scaleY) * 0.9;

        if (!isFinite(newScale) || newScale <= 0) {
            console.warn('Invalid scale');
            return;
        }

        editorEngine.canvas.scale = newScale;

        const scaledWidth = contentWidth * newScale;
        const scaledHeight = contentHeight * newScale;

        const newPosition = {
            x: (availableWidth - scaledWidth) / 2,
            y: (availableHeight - scaledHeight) / 2,
        };

        editorEngine.canvas.position = newPosition;
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
        <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger
                        className="w-full h-full flex items-center justify-center"
                        asChild
                    >
                        <button className="w-16 h-10 rounded-xl text-small flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground">
                            <span>{Math.round(scale * 100)}%</span>
                        </button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipPortal>
                    <TooltipContent side="right">{t(transKeys.editor.zoom.level)}</TooltipContent>
                </TooltipPortal>
            </Tooltip>
            <PopoverContent className="flex flex-col p-1.5 bg-background/85 backdrop-blur-md w-42 min-w-42 ml-5">
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
                    <HotkeyLabel
                        className="w-full justify-between text-mini"
                        hotkey={Hotkey.ZOOM_IN}
                    />
                </button>
                <button
                    onClick={() => handleZoom(-1)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                >
                    <HotkeyLabel
                        className="w-full justify-between text-mini"
                        hotkey={Hotkey.ZOOM_OUT}
                    />
                </button>
                <button
                    onClick={handleZoomToFit}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                >
                    <HotkeyLabel
                        className="w-full justify-between text-mini"
                        hotkey={Hotkey.ZOOM_FIT}
                    />
                </button>
                <button
                    onClick={() => (editorEngine.canvas.scale = 1)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                >
                    <span className="flex-grow text-mini">{t(transKeys.editor.zoom.reset)}</span>
                </button>
                <button
                    onClick={() => (editorEngine.canvas.scale = 2)}
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
                >
                    <span className="flex-grow text-mini">{t(transKeys.editor.zoom.double)}</span>
                </button>
            </PopoverContent>
        </Popover>
    );
});
