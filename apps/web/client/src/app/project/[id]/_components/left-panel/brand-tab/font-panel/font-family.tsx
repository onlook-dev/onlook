import { useState } from 'react';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { camelCase } from 'lodash';

import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';

interface FontVariantProps {
    name: string;
    isActive?: boolean;
}

const FontVariant = ({ name }: FontVariantProps) => {
    const fontVariant = `font-${camelCase(name).toLowerCase()}`;

    return <div className={cn('text-muted-foreground text-sm', fontVariant)}>{name}</div>;
};

export interface FontFamilyProps {
    name: string;
    variants: string[];
    onRemoveFont?: () => void;
    onAddFont?: () => void;
    onSetFont?: () => void;
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
    showDropdown = false,
    showAddButton = true,
    isDefault = false,
}: FontFamilyProps) => {
    const [expanded, setExpanded] = useState(false);

    const handleToggleDefault = () => {
        onSetFont?.();
    };

    return (
        <div className="group w-full">
            <div className="flex items-center justify-between py-3">
                <div
                    className="flex max-w-52 flex-1 cursor-pointer items-center"
                    onClick={() => setExpanded(!expanded)}
                >
                    <Icons.ChevronRight
                        className={`mr-2 h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
                    />

                    <span
                        className={`truncate text-sm transition-opacity duration-200`}
                        style={{ fontFamily: name }}
                    >
                        {name}
                    </span>

                    {isDefault && (
                        <span className="text-muted-foreground ml-2 text-xs">(Default)</span>
                    )}
                </div>
                <div className="flex items-center opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                    {showAddButton && onAddFont && (
                        <Button
                            variant="secondary"
                            size="sm"
                            className="bg-background-secondary h-7 rounded-md pr-1.5 pl-2"
                            onClick={() => onAddFont()}
                        >
                            Add <Icons.Plus className="ml-1 h-3 w-3" />
                        </Button>
                    )}
                    {showDropdown && (
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hover:bg-background-secondary h-7 w-7 rounded-md"
                                >
                                    <Icons.DotsHorizontal className="text-muted-foreground hover:text-foreground h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-fit">
                                <DropdownMenuCheckboxItem
                                    checked={isDefault}
                                    onCheckedChange={handleToggleDefault}
                                    className="flex cursor-pointer items-center pr-2"
                                >
                                    <span>Set as default font</span>
                                </DropdownMenuCheckboxItem>
                                <DropdownMenuItem
                                    className="flex items-center"
                                    onClick={() => onRemoveFont?.()}
                                >
                                    <Icons.Trash className="mr-2 h-4 w-4" />
                                    <span>Remove</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {expanded && variants.length > 0 && (
                <div
                    className="flex flex-col gap-2 pb-6 pl-7"
                    style={{
                        fontFamily: name,
                    }}
                >
                    {variants.map((variant) => (
                        <FontVariant key={`${name}-${variant}`} name={variant} />
                    ))}
                </div>
            )}
        </div>
    );
};
