'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Color } from '@onlook/utility';
import { useEffect, useState } from 'react';
import { ColorPickerContent } from '../inputs/color-picker';

export const ColorBackground = () => {
    const [tempColor, setTempColor] = useState('#000000');

    const editorEngine = useEditorEngine();

    useEffect(() => {
        setTempColor(
            editorEngine.style.selectedStyle?.styles.computed.backgroundColor ?? '#000000',
        );
    }, [editorEngine.style.selectedStyle?.styles.computed.backgroundColor]);

    const handleColorChange = (newColor: Color) => {
        setTempColor(newColor.toHex());
    };

    const handleColorChangeEnd = (newColor: Color) => {
        const hexColor = newColor.toHex();
        setTempColor(hexColor);
        editorEngine.style.update('backgroundColor', hexColor);
    };

    return (
        <div className="flex flex-col gap-2">
            <Popover>
                <PopoverTrigger>
                    <div className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border active:bg-background-tertiary/20 active:border-border flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-5 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border active:text-white">
                        <Icons.PaintBucket className="h-4 w-4" />
                        <div
                            className="h-[2.5px] w-5.5 rounded-full bg-current"
                            style={{ backgroundColor: tempColor }}
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    className="z-10 w-[280px] overflow-hidden rounded-lg p-0 shadow-xl backdrop-blur-lg"
                    side="bottom"
                    align="start"
                >
                    <ColorPickerContent
                        color={Color.from(tempColor)}
                        onChange={handleColorChange}
                        onChangeEnd={handleColorChangeEnd}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};
