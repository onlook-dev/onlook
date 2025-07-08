'use client';

import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useColorUpdate } from '../hooks/use-color-update';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { useTextControl } from '../hooks/use-text-control';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { ColorPickerContent } from '../inputs/color-picker';

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
                        <Button
                            variant="ghost"
                            size="toolbar"
                            className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground border border-border/0 rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                        >
                            <Icons.TextColorSymbol className="h-3.5 w-3.5" />
                            <div
                                className="h-[4px] w-6 rounded-full bg-current"
                                style={{ backgroundColor: textState.textColor || '#000000' }}
                            />
                        </Button>
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
                    />
                </DropdownMenuContent>
            </DropdownMenu>
        );
    },
);
