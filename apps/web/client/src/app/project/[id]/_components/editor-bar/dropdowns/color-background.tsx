'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { useMemo } from 'react';
import { ColorPickerContent } from '../inputs/color-picker';
import { useColorUpdate } from '../hooks/use-color-update';

interface ColorBackgroundProps {
    className?: string;
}

export const ColorBackground = ({ className }: ColorBackgroundProps) => {
    const editorEngine = useEditorEngine();
    const initialColor = editorEngine.style.selectedStyle?.styles.computed.backgroundColor;


    const { handleColorUpdate, handleColorUpdateEnd, tempColor } = useColorUpdate({
        elementStyleKey: 'backgroundColor',
        initialColor: initialColor,
    });

    const colorHex = useMemo(() => tempColor?.toHex(), [tempColor]);

    const ColorTrigger = useMemo(() => (
        <div 
            className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border active:bg-background-tertiary/20 active:border-border flex h-9 w-9 cursor-pointer flex-col items-center justify-center rounded-md border hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border active:text-white"
            role="button"
            tabIndex={0}
            aria-label="Change background color"
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.currentTarget.click();
                }
            }}
        >
            <Icons.PaintBucket className="h-2 w-2" />
            <div
                className="h-[4px] w-6 rounded-full bg-current"
                style={{ backgroundColor: colorHex }}
            />
        </div>
    ), [colorHex]);

    return (
        <div className={`flex flex-col gap-2 ${className ?? ''}`}>
            <Popover>
                <PopoverTrigger asChild>
                    {ColorTrigger}
                </PopoverTrigger>
                <PopoverContent
                    className="w-[220px] overflow-hidden rounded-lg p-0 shadow-xl backdrop-blur-lg"
                    side="bottom"
                    align="start"
                >
                    <ColorPickerContent
                        color={tempColor}
                        onChange={handleColorUpdate}
                        onChangeEnd={handleColorUpdateEnd}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};
