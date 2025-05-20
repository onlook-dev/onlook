'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Color } from '@onlook/utility';
import { useEffect, useState } from 'react';
import { ColorPickerContent } from '../inputs/color-picker';
import { useColorUpdate } from '../hooks/use-color-update';
import type { TailwindColor } from '@onlook/models';
export const ColorBackground = () => {
    const [tempColor, setTempColor] = useState<Color>(Color.from('#000000'));

    const { handleColorUpdate } = useColorUpdate({
        elementStyleKey: 'backgroundColor'
    });

    const editorEngine = useEditorEngine();

    useEffect(() => {
        const color = editorEngine.style.selectedStyle?.styles.computed.backgroundColor;
        if (color) {
            setTempColor(Color.from(color));
        }
    }, [editorEngine.style.selectedStyle?.styles.computed.backgroundColor]);

    const handleColorChange = (newColor: Color | TailwindColor) => {
        try {
            setTempColor(newColor instanceof Color ? newColor : Color.from(newColor.lightColor));
        } catch (error) {
            console.error('Error converting color:', error);
        }
    };

    const handleColorChangeEnd = (newColor: Color | TailwindColor) => {
        try {
            if (newColor instanceof Color) {
                setTempColor(newColor);
            } else {
                setTempColor(Color.from(newColor.lightColor));
            }
            handleColorUpdate(newColor);
        } catch (error) {
            console.error('Error converting color:', error);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <Popover>
                <PopoverTrigger>
                    <div className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border active:bg-background-tertiary/20 active:border-border flex h-9 w-9 cursor-pointer flex-col items-center justify-center rounded-md border hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border active:text-white">
                        <Icons.PaintBucket className="h-2 w-2" />
                        <div
                            className="h-[4px] w-6 rounded-full bg-current"
                            style={{ backgroundColor: tempColor?.toHex() }}
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[220px] overflow-hidden rounded-lg p-0 shadow-xl backdrop-blur-lg"
                    side="bottom"
                    align="start"
                >
                    <ColorPickerContent
                        color={tempColor}
                        onChange={handleColorChange}
                        onChangeEnd={handleColorChangeEnd}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};
