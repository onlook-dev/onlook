'use client';

import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { memo } from 'react';
import { useColorUpdate } from '../hooks/use-color-update';
import { ColorPickerContent } from '../inputs/color-picker';

export const TextColor = memo(
    ({
        handleTextColorChange,
        textColor,
    }: {
        handleTextColorChange: (color: string) => void;
        textColor: string;
    }) => {
        const { handleColorUpdate, handleColorUpdateEnd, tempColor } = useColorUpdate({
            elementStyleKey: 'color',
            onValueChange: (_, value) => handleTextColorChange(value),
            initialColor: textColor,
        });

        return (
            <Popover>
                <Tooltip>
                    <div>
                        <TooltipTrigger asChild>
                            <PopoverTrigger>
                                <div className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-2 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white">
                                    <Icons.TextColorSymbol className="h-3.5 w-3.5" />
                                    <div
                                        className="h-[2.5px] w-5.5 rounded-full bg-current"
                                        style={{ backgroundColor: tempColor.toHex() || '#000000' }}
                                    />
                                </div>
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="mt-1" hideArrow>
                            Text Color
                        </TooltipContent>
                    </div>
                </Tooltip>
                <PopoverContent
                    className="w-[224px] overflow-hidden rounded-lg p-0 shadow-xl backdrop-blur-lg"
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
        );
    },
);
