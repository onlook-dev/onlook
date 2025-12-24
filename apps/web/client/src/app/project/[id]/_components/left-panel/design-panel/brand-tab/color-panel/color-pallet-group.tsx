import { useEditorEngine } from '@/components/store/editor';
import { SystemTheme } from '@onlook/models/assets';
import type { TailwindColor } from '@onlook/models/style';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { Color, generateUniqueName, toNormalCase } from '@onlook/utility';
import { useState } from 'react';
import { ColorNameInput } from './color-name-input';
import { ColorPopover } from './color-popover';

interface BrandPalletGroupProps {
    title: string;
    colors: TailwindColor[];
    theme: SystemTheme;
    onRename: (groupName: string, newName: string) => void;
    onDelete: (colorName?: string) => void;
    onColorChange?: (
        groupName: string,
        colorIndex: number,
        newColor: Color,
        newName: string,
        parentName?: string,
    ) => void;
    onColorChangeEnd?: (
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
    onColorChangeEnd,
    onDuplicate,
    isDefaultPalette = false,
}: BrandPalletGroupProps) => {
    const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
    const [isAddingNewColor, setIsAddingNewColor] = useState(false);
    const [isRenaming, setIsRenaming] = useState(false);
    const editorEngine = useEditorEngine();
    const themeManager = editorEngine.theme;
    const existedName = colors.map((color) => color.name);

    const handleColorChange = (
        index: number,
        newColor: Color,
        newName: string,
        parentName?: string,
    ) => {
        if (onColorChange) {
            onColorChange(title, index, newColor, newName, parentName);
        }
    };

    const handleColorChangeEnd = (
        index: number,
        newColor: Color,
        newName: string,
        parentName?: string,
    ) => {
        if (onColorChangeEnd) {
            onColorChangeEnd(title, index, newColor, newName, parentName);
        }
        setEditingColorIndex(null);
        setIsAddingNewColor(false);
    };

    const getColorValue = (color: TailwindColor) => {
        return theme === SystemTheme.DARK
            ? (color.darkColor ?? color.lightColor)
            : color.lightColor;
    };

    const handleRenameClick = () => {
        setIsRenaming(true);
    };

    const handleViewInCode = (color: TailwindColor) => {
        if (!color.line?.config) {
            return;
        }

        const line =
            theme === SystemTheme.DARK ? color.line.css?.darkMode : color.line.css?.lightMode;

        // invokeMainChannel(MainChannels.VIEW_SOURCE_FILE, {
        //     filePath: themeManager.tailwindConfigPath,
        //     line: color.line.config,
        // });

        // invokeMainChannel(MainChannels.VIEW_SOURCE_FILE, {
        //     filePath: themeManager.tailwindCssPath,
        //     line,
        // });
    };

    const generateUniqueColorName = () => {
        return generateUniqueName(title, existedName);
    };

    return (
        <div className="flex flex-col gap-1 group/palette">
            <div className="flex justify-between items-center">
                {!isDefaultPalette && isRenaming ? (
                    <ColorNameInput
                        initialName={title}
                        onSubmit={(newName) => {
                            onRename(title, newName);
                            setIsRenaming(false);
                        }}
                        onCancel={() => setIsRenaming(false)}
                        onBlur={(newName) => {
                            onRename(title, newName);
                            setIsRenaming(false);
                        }}
                    />
                ) : (
                    <span className="text-small text-foreground-secondary font-normal">
                        {toNormalCase(title)}
                    </span>
                )}
                {!isDefaultPalette && (
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 p-0 hover:bg-transparent opacity-0 group-hover/palette:opacity-100 [&[data-state=open]]:opacity-100 transition-opacity"
                            >
                                <Icons.DotsHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
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
                                        onColorChangeEnd={(newColor, newName) =>
                                            handleColorChangeEnd(index, newColor, newName)
                                        }
                                        isDefaultPalette={isDefaultPalette}
                                        existedName={existedName}
                                    />
                                ) : (
                                    <>
                                        <div
                                            className="w-full aspect-square rounded-lg cursor-pointer hover:ring-2 hover:ring-border-primary border border-primary/10"
                                            style={{ backgroundColor: getColorValue(color) }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 [&[data-state=open]]:opacity-100">
                                            <DropdownMenu modal={false}>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-[85%] w-[85%] p-0 bg-black hover:bg-black rounded-md flex items-center justify-center"
                                                    >
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Icons.DotsHorizontal className="h-4 w-4 text-white" />
                                                            </TooltipTrigger>
                                                            <TooltipPortal>
                                                                <TooltipContent side="top">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-sm">
                                                                            {toNormalCase(
                                                                                color.name,
                                                                            )}
                                                                        </span>
                                                                        <span className="text-xs text-background-tertiary">
                                                                            {getColorValue(color)}
                                                                        </span>
                                                                    </div>
                                                                </TooltipContent>
                                                            </TooltipPortal>
                                                        </Tooltip>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    className="rounded-md bg-background p-0 ml-1 mt-[-4px] min-w-[140px]"
                                                    align="start"
                                                    side="right"
                                                >
                                                    <div className="flex items-start gap-2 px-2.5 py-2 border-b border-border mb-0.5">
                                                        <div
                                                            className="w-4 h-4 rounded-sm mt-[2px] hidden"
                                                            style={{
                                                                backgroundColor:
                                                                    getColorValue(color),
                                                            }}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="text-sm text-foreground">
                                                                {toNormalCase(color.name)}
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
                                                    {/* <DropdownMenuItem asChild>
                                                        <Button
                                                            variant="ghost"
                                                            className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group px-2 py-1"
                                                            onClick={() => handleViewInCode(color)}
                                                        >
                                                            <span className="flex w-full text-sm items-center">
                                                                <Icons.ExternalLink className="mr-2 h-4 w-4" />
                                                                <span>View in code</span>
                                                            </span>
                                                        </Button>
                                                    </DropdownMenuItem> */}
                                                    {!isDefaultPalette ? (
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
                                                    ) : (
                                                        color.override && (
                                                            <DropdownMenuItem asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    className="hover:bg-background-secondary focus:bg-background-secondary w-full rounded-sm group px-2 py-1"
                                                                    onClick={() =>
                                                                        onDelete(color.name)
                                                                    }
                                                                >
                                                                    <span className="flex w-full text-sm items-center">
                                                                        <Icons.Reset className="mr-2 h-4 w-4" />
                                                                        <span>Reset override</span>
                                                                    </span>
                                                                </Button>
                                                            </DropdownMenuItem>
                                                        )
                                                    )}
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
                            brandColor={generateUniqueColorName()}
                            onClose={() => setIsAddingNewColor(false)}
                            onColorChange={(newColor, newName) =>
                                handleColorChange(colors?.length || 0, newColor, newName, title)
                            }
                            onColorChangeEnd={(newColor, newName) =>
                                handleColorChangeEnd(colors?.length || 0, newColor, newName, title)
                            }
                            existedName={existedName}
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
