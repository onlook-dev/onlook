'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useColorUpdate } from '../hooks/use-color-update';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { useTextControl } from '../hooks/use-text-control';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { ColorPickerContent } from '../inputs/color-picker';
import { ToolbarButton } from '../toolbar-button';

export const TextColor = observer(
    () => {
        const { handleTextColorChange, textState } = useTextControl();
        const { isOpen, onOpenChange } = useDropdownControl({
            id: 'text-color-dropdown'
        });

        const { handleColorUpdate, handleColorUpdateEnd, tempColor } = useColorUpdate({
            elementStyleKey: 'color',
            onValueChange: (_, value) => handleTextColorChange(value),
            initialColor: textState.textColor,
        });

        return (
            <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
                <HoverOnlyTooltip
                    content="Text Color"
                    side="bottom"
                    className="mt-1"
                    hideArrow
                    disabled={isOpen}
                >
                    <DropdownMenuTrigger asChild>
                        <ToolbarButton
                            isOpen={isOpen}
                            className="flex w-10 flex-col items-center justify-center gap-0.5"
                        >
                            <Icons.TextColorSymbol className="h-3.5 w-3.5" />
                            <div
                                className="h-[4px] w-6 rounded-full bg-current"
                                style={{ backgroundColor: textState.textColor || '#000000' }}
                            />
                        </ToolbarButton>
                    </DropdownMenuTrigger>
                </HoverOnlyTooltip>
                <DropdownMenuContent
                    align="start"
                    side="bottom"
                    className="w-[224px] mt-1 p-0 rounded-lg overflow-hidden shadow-xl backdrop-blur-lg"
                >
                    <ColorPickerContent
                        color={tempColor}
                        onChange={handleColorUpdate}
                        onChangeEnd={handleColorUpdateEnd}
                        hideGradient={true}
                    />
                </DropdownMenuContent>
            </DropdownMenu>
        );
    },
);
