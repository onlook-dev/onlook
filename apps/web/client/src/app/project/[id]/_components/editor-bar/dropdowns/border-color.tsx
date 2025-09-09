'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { ToolbarButton } from '../toolbar-button';
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
                    <ToolbarButton
                        isOpen={isOpen}
                        className="flex min-w-9 flex-col items-center justify-center gap-0.5"
                    >
                        <Icons.PencilIcon className="h-4 w-4 min-h-4 min-w-4" />
                        <div
                            className="w-6 rounded-full bg-current"
                            style={{ backgroundColor: colorHex, height: '4px' }}
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
                />
            </DropdownMenuContent>
        </DropdownMenu>
    );
});