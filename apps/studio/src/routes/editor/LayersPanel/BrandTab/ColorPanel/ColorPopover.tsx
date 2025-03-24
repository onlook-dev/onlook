import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import type { Color } from '@onlook/utility';
import { useState } from 'react';
import ColorPickerContent from '../../../EditPanel/StylesTab/single/ColorInput/ColorPicker';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';

export const ColorPopover = ({
    color,
    brandColor,
    onClose,
    onColorChange,
    onColorChangeEnd,
    isDefaultPalette = false,
    existedName,
}: {
    color: Color;
    brandColor: string;
    onClose?: () => void;
    onColorChange?: (newColor: Color, newName: string) => void;
    onColorChangeEnd?: (newColor: Color, newName: string) => void;
    isDefaultPalette?: boolean;
    existedName?: string[];
}) => {
    const [editedColor, setEditedColor] = useState<Color>(color);
    const [editedName, setEditedName] = useState<string>(brandColor);
    const [error, setError] = useState<string | null>(null);

    const handleColorChange = (newColor: Color) => {
        setEditedColor(newColor);
        if (onColorChange) {
            onColorChange(newColor, editedName);
        }
    };

    const handleSave = () => {
        if (existedName?.includes(editedName) && editedName !== brandColor) {
            setError('Color name already exists');
            return;
        }

        if (onColorChangeEnd) {
            onColorChangeEnd(editedColor, editedName);
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
            <PopoverContent className="p-0 w-56" side="right" align="start">
                <div className="flex flex-col gap-0 p-0">
                    <div className="flex flex-col gap-1 p-2 pb-1">
                        <label className="text-xs text-muted-foreground">Color Name</label>
                        <Tooltip open={!!error}>
                            <TooltipTrigger asChild>
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => {
                                        setEditedName(e.target.value);
                                        setError(null);
                                    }}
                                    className={`w-full rounded-md border ${
                                        error ? 'border-red-500' : 'border-white/10'
                                    } bg-background-secondary px-2 py-1 text-sm`}
                                    disabled={isDefaultPalette || editedName === 'DEFAULT'}
                                />
                            </TooltipTrigger>
                            {error && (
                                <TooltipContent side="top" className="bg-red-500 text-white">
                                    {error}
                                </TooltipContent>
                            )}
                        </Tooltip>
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
