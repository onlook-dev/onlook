'use client';

import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Color } from '@onlook/utility';
import { useCallback, useState } from 'react';
import { ColorPickerContent } from './color-picker';
import type { TailwindColor } from '@onlook/models';
import { useColorUpdate } from '../hooks/use-color-update';

interface InputColorProps {
    color: string;
    elementStyleKey: string;
    onColorChange: (color: string) => void;
}

export const InputColor = ({ color, elementStyleKey, onColorChange }: InputColorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempColor, setTempColor] = useState<Color>(Color.from(color));

    const { handleColorUpdate } = useColorUpdate({
        elementStyleKey,
        onValueChange: (_, value) => onColorChange(value),
    });

    const handleColorChange = useCallback((newColor: Color | TailwindColor) => {
        setTempColor(newColor instanceof Color ? newColor : Color.from(newColor.lightColor));
    }, []);

    const handleColorChangeEnd = useCallback(
        (newColor: Color | TailwindColor) => {
            try {
                if (newColor instanceof Color) {
                    setTempColor(newColor);
                } else {
                    setTempColor(Color.from(newColor.lightColor));
                }
                handleColorUpdate(newColor);
            } catch (error) {
                console.error('Error updating color:', error);
            }
        },
        [handleColorUpdate],
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setTempColor(Color.from(value));
            onColorChange?.(value);
        },
        [onColorChange],
    );

    return (
        <div className="flex h-9 w-full items-center">
            <div className="bg-background-tertiary/50 mr-[1px] flex h-full flex-1 items-center rounded-md px-3 py-1.5 pl-1.5">
                <Popover onOpenChange={setIsOpen}>
                    <PopoverAnchor className="absolute bottom-0 left-0" />

                    <PopoverTrigger>
                        <div
                            className="mr-2 aspect-square h-5 w-5 rounded-sm"
                            style={{ backgroundColor: tempColor.toHex() }}
                            onClick={() => setIsOpen(!isOpen)}
                        />
                    </PopoverTrigger>
                    <PopoverContent
                        className="w-[280px] overflow-hidden rounded-lg p-0 shadow-xl backdrop-blur-lg"
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

                <input
                    type="text"
                    value={tempColor.toHex()}
                    onChange={handleInputChange}
                    className="h-full w-full bg-transparent text-sm text-white focus:outline-none"
                />
            </div>
        </div>
    );
};
