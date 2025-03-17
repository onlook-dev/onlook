import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import type { Color } from '@onlook/utility';
import { useState } from 'react';
import ColorPickerContent from '../../../EditPanel/StylesTab/single/ColorInput/ColorPicker';

export const ColorPopover = ({
    color,
    brandColor,
    onClose,
    onColorChange,
    isDefaultPalette = false,
}: {
    color: Color;
    brandColor: string;
    onClose?: () => void;
    onColorChange?: (newColor: Color, newName: string) => void;
    isDefaultPalette?: boolean;
}) => {
    const [editedColor, setEditedColor] = useState<Color>(color);
    const [editedName, setEditedName] = useState<string>(brandColor);

    const handleColorChange = (newColor: Color) => {
        setEditedColor(newColor);
    };

    const handleSave = () => {
        if (onColorChange) {
            onColorChange(editedColor, editedName);
        }
        if (onClose) {
            onClose();
        }
    };

    return (
        <Popover onOpenChange={(open) => !open && handleSave()} open={true}>
            <PopoverTrigger asChild>
                <div
                    className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-border-primary border border-white/10"
                    style={{ backgroundColor: editedColor.toHex() }}
                />
            </PopoverTrigger>
            <PopoverContent className="p-0 min-w-fit" side="right" align="start">
                <div className="flex flex-col gap-0 p-0">
                    <div className="flex flex-col gap-1 p-2 pb-1">
                        <label className="text-xs text-muted-foreground">Color Name</label>
                        <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="w-full rounded-md border border-white/10 bg-background-secondary px-2 py-1 text-sm"
                            disabled={isDefaultPalette || editedName === 'DEFAULT'} // Disable editing of DEFAULT
                        />
                    </div>
                    <ColorPickerContent
                        color={editedColor}
                        onChange={handleColorChange}
                        onChangeEnd={handleColorChange}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
};
