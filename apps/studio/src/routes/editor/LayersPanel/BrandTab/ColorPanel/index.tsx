import { useEditorEngine } from '@/components/Context';
import { Theme } from '@onlook/models/assets';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import type { Color } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { BrandPalletGroup } from './ColorPalletGroup';

interface ColorPanelProps {
    onClose: () => void;
}

const ColorPanel = observer(({ onClose }: ColorPanelProps) => {
    const [theme, setTheme] = useState<Theme>(Theme.LIGHT);
    const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);

    const editorEngine = useEditorEngine();
    const themeManager = editorEngine.theme;

    const { colorGroups, colorDefaults } = themeManager;

    useEffect(() => {
        themeManager.scanConfig();
    }, []);

    const handleRename = (groupName: string, newName: string) => {
        themeManager.rename(groupName, newName);
    };

    const handleDelete = (groupName: string, colorName?: string) => {
        themeManager.delete(groupName, colorName);
    };

    const handleColorChange = (
        groupName: string,
        index: number,
        newColor: Color,
        newName: string,
        parentName?: string,
        theme?: Theme,
    ) => {
        themeManager.update(groupName, index, newColor, newName, parentName, theme);
    };

    const handleDuplicate = (
        groupName: string,
        colorName: string,
        isDefaultPalette?: boolean,
        theme?: Theme,
    ) => {
        themeManager.duplicate(groupName, colorName, isDefaultPalette, theme);
    };

    const handleAddNewGroup = (newName: string) => {
        themeManager.add(newName);
        setIsAddingNewGroup(false);
    };

    const handleDefaultColorChange = (
        groupName: string,
        colorIndex: number,
        newColor: Color,
        theme?: Theme,
    ) => {
        themeManager.handleDefaultColorChange(groupName, colorIndex, newColor, theme);
    };

    const handleClose = () => {
        onClose();
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8.25rem)] text-xs text-active flex-grow w-full p-0 overflow-y-auto">
            <div className="flex justify-between items-center pl-4 pr-2.5 py-1.5 border-b border-border">
                <h2 className="text-sm font-normal text-foreground">Brand Colors</h2>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md hover:bg-background-secondary"
                    onClick={handleClose}
                >
                    <Icons.CrossS className="h-4 w-4" />
                </Button>
            </div>
            {/* Theme Toggle */}
            <div className="flex gap-1 px-4 py-2 text-sm border-b border-border">
                <Button
                    variant={theme === Theme.LIGHT ? 'default' : 'outline'}
                    className={cn(
                        'flex-1 gap-2 px-0 w-full border-none text-gray-200 bg-transparent hover:bg-background-secondary shadow-none',
                        theme === Theme.LIGHT && 'bg-gray-900 text-white',
                    )}
                    onClick={() => setTheme(Theme.LIGHT)}
                >
                    <Icons.Sun className="h-4 w-4" />
                    Light mode
                </Button>
                <Button
                    variant={theme === Theme.DARK ? 'default' : 'outline'}
                    className={cn(
                        'flex-1 gap-2 px-0 w-full border-none text-gray-200 bg-transparent hover:bg-background-secondary shadow-none',
                        theme === Theme.DARK && 'bg-gray-900 text-white',
                    )}
                    onClick={() => setTheme(Theme.DARK)}
                >
                    <Icons.Moon className="h-4 w-4" />
                    Dark mode
                </Button>
            </div>

            {/* Brand Palette Groups section */}
            <div className="flex flex-col gap-4 px-4 py-[18px] border-b border-border">
                <div className="flex flex-col gap-4">
                    {/* Theme color groups */}
                    {Object.entries(colorGroups).map(([groupName, colors]) => (
                        <BrandPalletGroup
                            key={groupName}
                            theme={theme}
                            title={groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                            colors={colors}
                            onRename={handleRename}
                            onDelete={(colorName) => handleDelete(groupName, colorName)}
                            onColorChange={handleColorChange}
                            onDuplicate={(colorName) => handleDuplicate(groupName, colorName)}
                        />
                    ))}
                </div>
                {isAddingNewGroup ? (
                    <div className="flex flex-col gap-1">
                        <input
                            type="text"
                            autoFocus
                            placeholder="Enter group name"
                            className="w-full rounded-md border border-white/10 bg-background-secondary px-2 py-1 text-sm"
                            onBlur={(e) => {
                                if (e.target.value.trim()) {
                                    handleAddNewGroup(e.target.value);
                                } else {
                                    setIsAddingNewGroup(false);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                    handleAddNewGroup(e.currentTarget.value);
                                } else if (e.key === 'Escape') {
                                    setIsAddingNewGroup(false);
                                }
                            }}
                        />
                    </div>
                ) : (
                    <Button
                        variant="ghost"
                        className="w-full h-10 text-sm text-muted-foreground hover:text-foreground bg-background-secondary hover:bg-background-secondary/70 rounded-lg border border-white/5"
                        onClick={() => setIsAddingNewGroup(true)}
                    >
                        Add a new group
                    </Button>
                )}
            </div>

            {/* Color Palette section */}
            <div className="flex flex-col gap-4 px-4 py-[18px] border-b border-border">
                <h3 className="text-sm font-medium mb-2">Default Colors</h3>
                {Object.entries(colorDefaults).map(([colorName, colors]) => (
                    <BrandPalletGroup
                        key={colorName}
                        theme={theme}
                        title={colorName.charAt(0).toUpperCase() + colorName.slice(1)}
                        colors={colors}
                        onRename={handleRename}
                        onDelete={(colorItem) => handleDelete(colorName, colorItem)}
                        onColorChange={(groupName, colorIndex, newColor) =>
                            handleDefaultColorChange(colorName, colorIndex, newColor)
                        }
                        onDuplicate={(colorItem) => handleDuplicate(colorName, colorItem, true)}
                        isDefaultPalette={true}
                    />
                ))}
            </div>
        </div>
    );
});

export default ColorPanel;
