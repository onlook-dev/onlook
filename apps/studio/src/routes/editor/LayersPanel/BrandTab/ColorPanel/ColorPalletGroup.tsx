import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Color } from '@onlook/utility';
import { useState } from 'react';
import { ColorPopover } from './ColorPopover';

export interface ColorItem {
    name: string;
    originalKey: string;
    lightColor: string;
    darkColor?: string;
}

interface BrandPalletGroupProps {
    title: string;
    colors: ColorItem[];
    theme: 'dark' | 'light';
    onRename: (groupName: string, newName: string) => void;
    onDelete: (colorName?: string) => void;
    onColorChange?: (
        groupName: string,
        colorIndex: number,
        newColor: Color,
        newName: string,
        parentName?: string,
    ) => void;
    onDuplicate?: (colorName: string) => void;
    isDefaultPalette?: boolean;
}

export const BrandPalletGroup = ({
    title,
    colors,
    theme,
    onRename,
    onDelete,
    onColorChange,
    onDuplicate,
    isDefaultPalette = false,
}: BrandPalletGroupProps) => {
    const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
    const [isAddingNewColor, setIsAddingNewColor] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newGroupName, setNewGroupName] = useState(title);

    const handleColorChange = (
        index: number,
        newColor: Color,
        newName: string,
        parentName?: string,
    ) => {
        if (onColorChange) {
            onColorChange(title.toLowerCase(), index, newColor, newName, parentName);
        }
        setEditingColorIndex(null);
        setIsAddingNewColor(false);
    };

    const getColorValue = (color: ColorItem) => {
        return theme === 'dark' ? color.darkColor || color.lightColor : color.lightColor;
    };

    const handleRenameClick = () => {
        setNewGroupName(title);
        setIsRenaming(true);
    };

    const handleRenameSubmit = () => {
        if (newGroupName.trim() && newGroupName !== title) {
            onRename(title.toLowerCase(), newGroupName.trim());
        }
        setIsRenaming(false);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleRenameSubmit();
        } else if (e.key === 'Escape') {
            setIsRenaming(false);
            setNewGroupName(title);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
                {!isDefaultPalette && isRenaming ? (
                    <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={handleRenameKeyDown}
                        className="text-sm font-normal w-full rounded-md border border-white/10 bg-background-secondary px-2 py-1"
                        placeholder="Enter group name"
                        autoFocus
                    />
                ) : (
                    <span className="text-sm font-normal">{title}</span>
                )}
                {!isDefaultPalette && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 hover:bg-transparent"
                            >
                                <Icons.DotsHorizontal className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="rounded-md bg-background"
                            align="start"
                            side="bottom"
                        >
                            <DropdownMenuItem asChild>
                                <Button
                                    variant="ghost"
                                    className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                    onClick={handleRenameClick}
                                >
                                    <span className="flex w-full text-smallPlus items-center">
                                        <Icons.Pencil className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                        <span>Rename</span>
                                    </span>
                                </Button>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Button
                                    variant="ghost"
                                    className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group"
                                    onClick={() => onDelete()}
                                >
                                    <span className="flex w-full text-smallPlus items-center">
                                        <Icons.Trash className="mr-2 h-4 w-4 text-foreground-secondary group-hover:text-foreground-active" />
                                        <span>Delete</span>
                                    </span>
                                </Button>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            <div className="flex flex-col gap-2">
                <div className="grid grid-cols-6 gap-1">
                    {colors ? (
                        colors.map((color, index) => (
                            <div key={`${title}-${index}`} className="relative group">
                                {editingColorIndex === index ? (
                                    <ColorPopover
                                        color={Color.from(getColorValue(color))}
                                        brandColor={color.name}
                                        onClose={() => setEditingColorIndex(null)}
                                        onColorChange={(newColor, newName) =>
                                            handleColorChange(index, newColor, newName)
                                        }
                                        isDefaultPalette={isDefaultPalette}
                                    />
                                ) : (
                                    <>
                                        <div
                                            className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-border-primary border border-white/10"
                                            style={{ backgroundColor: getColorValue(color) }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 [&[data-state=open]]:opacity-100">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-[85%] w-[85%] p-0 bg-black hover:bg-black rounded-md flex items-center justify-center"
                                                    >
                                                        <Icons.DotsHorizontal className="h-4 w-4 text-white" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    className="rounded-md bg-background p-1 min-w-[140px]"
                                                    align="start"
                                                    side="bottom"
                                                >
                                                    <div className="flex items-start gap-2 px-2 py-1 border-b border-border mb-0.5">
                                                        <div
                                                            className="w-4 h-4 rounded-sm mt-[2px]"
                                                            style={{
                                                                backgroundColor:
                                                                    getColorValue(color),
                                                            }}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-foreground">
                                                                {color.name}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {getColorValue(color)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <DropdownMenuItem asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group px-2 py-1"
                                                            onClick={() =>
                                                                setEditingColorIndex(index)
                                                            }
                                                        >
                                                            <span className="flex w-full text-sm items-center">
                                                                <Icons.Pencil className="mr-2 h-4 w-4" />
                                                                <span>Edit color</span>
                                                            </span>
                                                        </Button>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group px-2 py-1"
                                                            onClick={() =>
                                                                onDuplicate?.(color.name)
                                                            }
                                                        >
                                                            <span className="flex w-full text-sm items-center">
                                                                <Icons.Copy className="mr-2 h-4 w-4" />
                                                                <span>Duplicate</span>
                                                            </span>
                                                        </Button>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group px-2 py-1"
                                                            onClick={() => onDelete(color.name)}
                                                        >
                                                            <span className="flex w-full text-sm items-center">
                                                                <Icons.Trash className="mr-2 h-4 w-4" />
                                                                <span>Delete</span>
                                                            </span>
                                                        </Button>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))
                    ) : (
                        <></>
                    )}
                    {isAddingNewColor ? (
                        <ColorPopover
                            color={Color.from('#FFFFFF')}
                            brandColor="New Color"
                            onClose={() => setIsAddingNewColor(false)}
                            onColorChange={(newColor, newName) =>
                                handleColorChange(
                                    colors?.length || 0,
                                    newColor,
                                    newName,
                                    title.toLowerCase(),
                                )
                            }
                        />
                    ) : (
                        <Button
                            onClick={() => setIsAddingNewColor(true)}
                            variant="outline"
                            size="icon"
                            className="w-full aspect-square rounded-lg border border-dashed flex items-center justify-center bg-transparent hover:bg-transparent"
                        >
                            <Icons.Plus className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
