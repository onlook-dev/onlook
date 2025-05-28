'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { useMemo } from 'react';
import { ColorPickerContent } from '../inputs/color-picker';
import { useColorUpdate } from '../hooks/use-color-update';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { observer } from 'mobx-react-lite';

export const BorderColor = observer(() => {
    const editorEngine = useEditorEngine();
    const initialColor = editorEngine.style.selectedStyle?.styles.computed.borderColor;

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'border-color-popover',
    });

    const { handleColorUpdate, handleColorUpdateEnd, tempColor } = useColorUpdate({
        elementStyleKey: 'borderColor',
        initialColor: initialColor,
    });

    const colorHex = useMemo(() => tempColor?.toHex(), [tempColor]);

    const ColorTrigger = useMemo(
        () => (
            <div
                className="gap-1 text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border active:bg-background-tertiary/20 active:border-border flex h-9 w-9 cursor-pointer flex-col items-center justify-center rounded-md border hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border active:text-white"
                role="button"
                tabIndex={0}
                aria-label="Change border color"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.currentTarget.click();
                    }
                }}
            >
                <Icons.PencilIcon className="h-4 w-4 min-h-4 min-w-4" />

                <div
                    className="h-[4px] w-6 rounded-full bg-current"
                    style={{ backgroundColor: colorHex }}
                />
            </div>
        ),
        [colorHex],
    );

    return (
        <div className="flex flex-col gap-2">
            <Popover open={isOpen} onOpenChange={onOpenChange}>
                <Tooltip>
                    <div>
                        <TooltipTrigger asChild>
                            <PopoverTrigger asChild>{ColorTrigger}</PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="mt-1" hideArrow>
                            Border Color
                        </TooltipContent>
                    </div>
                </Tooltip>
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
})