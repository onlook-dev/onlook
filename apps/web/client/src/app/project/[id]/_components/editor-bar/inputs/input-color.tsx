'use client';

import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Color } from '@onlook/utility';
import { useCallback, useState } from 'react';
import { ColorPickerContent } from './color-picker';

interface InputColorProps {
    color: string;
    onColorChange?: (color: string) => void;
}

export const InputColor = ({ color, onColorChange }: InputColorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [tempColor, setTempColor] = useState(color);

    const handleColorChange = useCallback((newColor: Color) => {
        setTempColor(newColor.toHex());
    }, []);

    const handleColorChangeEnd = useCallback(
        (newColor: Color) => {
            const hexColor = newColor.toHex();
            setTempColor(hexColor);
            onColorChange?.(hexColor);
        },
        [onColorChange],
    );

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setTempColor(value);
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
                            style={{ backgroundColor: tempColor }}
                            onClick={() => setIsOpen(!isOpen)}
                        />
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

                <input
                    type="text"
                    value={tempColor}
                    onChange={handleInputChange}
                    className="h-full w-full bg-transparent text-sm text-white focus:outline-none"
                />
            </div>
        </div>
    );
};
