'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { useBoxControl } from '../hooks/use-box-control';
import { useColorUpdate } from '../hooks/use-color-update';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { ColorPickerContent } from '../inputs/color-picker';

export const BorderColor = observer(() => {
    const editorEngine = useEditorEngine();
    const { borderExists } = useBoxControl('border');
    const initialColor = editorEngine.style.selectedStyle?.styles.computed.borderColor;

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'border-color-dropdown',
    });

    const { handleColorUpdate, handleColorUpdateEnd, tempColor } = useColorUpdate({
        elementStyleKey: 'borderColor',
        initialColor: initialColor,
    });

    const colorHex = useMemo(() => tempColor?.toHex(), [tempColor]);

    if (!borderExists) {
        return null;
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip
                content="Border Color"
                side="bottom"
                className="mt-1"
                hideArrow
                disabled={isOpen}
            >
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="toolbar"
                        className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground border border-border/0 rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-foreground-primary"
                    >
                        <Icons.PencilIcon className="h-4 w-4 min-h-4 min-w-4" />
                        <div
                            className="w-6 rounded-full bg-current"
                            style={{ backgroundColor: colorHex, height: '4px' }}
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
});