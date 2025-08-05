'use client';

import { useEditorEngine } from '@/components/store/editor';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { observer } from 'mobx-react-lite';
import { useMemo } from 'react';
import { useColorUpdate } from '../hooks/use-color-update';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { ColorPickerContent } from '../inputs/color-picker';
import { ToolbarButton } from '../toolbar-button';
import { hasGradient } from '../utils/gradient';

export const ColorBackground = observer(() => {
    const editorEngine = useEditorEngine();
    const initialColor = editorEngine.style.selectedStyle?.styles.computed.backgroundColor;
    const backgroundImage = editorEngine.style.selectedStyle?.styles.computed.backgroundImage;

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'color-background-dropdown',
    });

    const { handleColorUpdate, handleColorUpdateEnd, tempColor } = useColorUpdate({
        elementStyleKey: 'backgroundColor',
        initialColor: initialColor,
    });

    const colorHex = useMemo(() => tempColor?.toHex(), [tempColor]);

    const previewStyle = useMemo(() => {
        if (hasGradient(backgroundImage)) {
            return { background: backgroundImage };
        }
        return { backgroundColor: colorHex };
    }, [backgroundImage, colorHex]);

    return (
        <div className="flex flex-col gap-2">
            <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
                <HoverOnlyTooltip
                    content="Background Color"
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
                            <Icons.PaintBucket className="h-2 w-2" />
                            <div className="h-[4px] w-6 rounded-full" style={previewStyle} />
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
                        backgroundImage={backgroundImage}
                    />
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
});