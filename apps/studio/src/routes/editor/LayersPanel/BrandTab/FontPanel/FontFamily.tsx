import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@onlook/ui/tooltip';

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
    onRemoveFont?: () => void;
    onAddFont?: () => void;
    onSetFont?: () => void;
    isExpanded?: boolean; // Kept for API compatibility but not used for initial state
    isLast?: boolean;
    showDropdown?: boolean;
    showAddButton?: boolean; // New property to control Add button visibility
    isDefault?: boolean;
}

export const FontFamily = ({
    name,
    variants = [],
    onAddFont,
    onRemoveFont,
    onSetFont,
    isExpanded = false, // This prop is kept for API compatibility but not used for initial state
    isLast = false,
    showDropdown = false,
    showAddButton = true, // Default to false
    isDefault = false,
}: FontFamilyProps) => {
    // Always initialize to false, ensuring all font families start closed regardless of isExpanded prop
    const [expanded, setExpanded] = useState(false);

    // Toggle default font status
    const handleToggleDefault = () => {
        onSetFont?.();
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
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-sm font-normal truncate max-w-40">
                                    {name}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{name}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    {isDefault && (
                        <span className="ml-2 text-xs text-muted-foreground">(Default)</span>
                    )}
                </div>
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                    {showAddButton && onAddFont && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 pl-2 pr-1.5 rounded-md bg-background-secondary"
                            onClick={() => onAddFont()}
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
                                <DropdownMenuItem
                                    className="flex items-center"
                                    onClick={() => onRemoveFont?.()}
                                >
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
