import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from '@onlook/ui/dropdown-menu';

interface FontVariantProps {
    name: string;
    isActive?: boolean;
}

const FontVariant = ({ name, isActive = false }: FontVariantProps) => (
    <div className="text-sm font-normal text-muted-foreground">{name}</div>
);

export interface FontFamilyProps {
    name: string;
    variants: string[];
    isExpanded?: boolean; // Kept for API compatibility but not used for initial state
    isLast?: boolean;
    showDropdown?: boolean;
    showAddButton?: boolean; // New property to control Add button visibility
}

export const FontFamily = ({
    name,
    variants = [],
    isExpanded = false, // This prop is kept for API compatibility but not used for initial state
    isLast = false,
    showDropdown = false,
    showAddButton = true, // Default to false
}: FontFamilyProps) => {
    // Always initialize to false, ensuring all font families start closed regardless of isExpanded prop
    const [expanded, setExpanded] = useState(false);
    // State to track if this font is set as default
    const [isDefault, setIsDefault] = useState(false);

    // Toggle default font status
    const handleToggleDefault = () => {
        setIsDefault(!isDefault);
        // Here you would typically also update this in your global state or backend
    };

    return (
        <div className="w-full group">
            <div className="flex justify-between items-center py-3">
                <div
                    className="flex items-center cursor-pointer"
                    onClick={() => setExpanded(!expanded)}
                >
                    <Icons.ChevronRight
                        className={`h-4 w-4 mr-2 transition-transform ${expanded ? 'rotate-90' : ''}`}
                    />
                    <span className="text-sm font-normal">{name}</span>
                    {isDefault && (
                        <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                    )}
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                    {showAddButton && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 pl-2 pr-1.5 rounded-md bg-background-secondary"
                        >
                            Add <Icons.Plus className="ml-1 h-3 w-3" />
                        </Button>
                    )}
                    {showDropdown && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md hover:bg-background-secondary"
                                >
                                    <Icons.DotsHorizontal className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-fit">
                                <DropdownMenuCheckboxItem
                                    checked={isDefault}
                                    onCheckedChange={handleToggleDefault}
                                    className="flex items-center pr-2 cursor-pointer"
                                >
                                    <span>Set as default font</span>
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuItem className="flex items-center">
                                    <Icons.Trash className="h-4 w-4 mr-2" />
                                    <span>Remove</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {expanded && variants.length > 0 && (
                <div className="pl-7 flex flex-col gap-2 pb-6">
                    {variants.map((variant) => (
                        <FontVariant
                            key={`${name}-${variant}`}
                            name={variant}
                            isActive={variant === 'SemiBold' || variant === 'Bold'}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
