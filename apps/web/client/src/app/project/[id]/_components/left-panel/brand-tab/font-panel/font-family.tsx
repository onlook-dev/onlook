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
import { TooltipArrow } from '@radix-ui/react-tooltip';
import { camelCase } from 'lodash';
import { useState, useEffect } from 'react';
import { ensureGoogleFontLoaded } from '@/utils/fontPreview';
import { ensureLocalFontLoaded } from '@/utils/localFontPreview';

const tailwindToWeight: Record<string, string> = {
  'font-thin': '100',
  'font-extralight': '200',
  'font-light': '300',
  'font-normal': '400',
  'font-medium': '500',
  'font-semibold': '600',
  'font-bold': '700',
  'font-extrabold': '800',
  'font-black': '900',
};

interface FontVariantProps {
    name: string;
    isActive?: boolean;
    fontFamily: string;
    fontWeight?: string | number;
    src?: string;
    isLocal?: boolean;
    style?: string;
}

const FontVariant = ({ name, fontFamily, fontWeight, src, isLocal, style }: FontVariantProps) => {
    const fontVariant = `font-${camelCase(name).toLowerCase()}`;
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (isLocal && src) {
            ensureLocalFontLoaded(fontFamily, src, fontWeight, style);
        }
        const checkFont = async () => {
            try {
                await document.fonts.ready;
                const isFontLoaded = document.fonts.check(`12px \"${fontFamily}\"`);
                setIsLoaded(isFontLoaded);
            } catch (error) {
                setIsLoaded(false);
            }
        };
        checkFont();
    }, [fontFamily, src, fontWeight, isLocal, style]);

    return (
        <div 
            className={cn(
                'text-sm text-muted-foreground',
                fontVariant,
                !isLoaded && 'opacity-50'
            )}
            style={{ 
                fontFamily: `\"${fontFamily}\", sans-serif`,
                fontWeight: fontWeight,
                fontStyle: style,
                transition: 'opacity 0.2s ease-in-out'
            }}
        >
            {name}
        </div>
    );
};

export interface FontFamilyProps {
    name: string;
    variants: string[];
    onRemoveFont?: () => void;
    onAddFont?: () => void;
    onSetFont?: () => void;
    showDropdown?: boolean;
    showAddButton?: boolean;
    isDefault?: boolean;
    isLocal?: boolean;
    localSrcs?: { src: string; weight: string | number; style?: string }[];
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
    isLocal = false,
    localSrcs = [],
}: FontFamilyProps) => {
    const [expanded, setExpanded] = useState(false);
    const [isFontLoaded, setIsFontLoaded] = useState(false);

    // Map variants to numeric weights for Google Fonts
    const numericVariants = variants.map(v => tailwindToWeight[v] || v);

    useEffect(() => {
        if (isLocal && localSrcs.length) {
            localSrcs.forEach(({ src, weight, style }) => {
                ensureLocalFontLoaded(name, src, weight, style);
            });
        } else {
            ensureGoogleFontLoaded(name, numericVariants);
        }
        const checkFont = async () => {
            try {
                await document.fonts.ready;
                const isFontLoaded = document.fonts.check(`12px \"${name}\"`);
                setIsFontLoaded(isFontLoaded);
            } catch (error) {
                setIsFontLoaded(false);
            }
        };
        checkFont();
    }, [name, numericVariants, isLocal, localSrcs]);

    const handleToggleDefault = () => {
        onSetFont?.();
    };

    return (
        <div
            className="w-full group"
            style={{
                fontFamily: `\"${name}\", sans-serif`,
                opacity: isFontLoaded ? 1 : 0.5,
                transition: 'opacity 0.2s ease-in-out',
            }}
        >
            <div className="flex justify-between items-center py-3">
                <div
                    className="flex flex-1 items-center cursor-pointer max-w-52"
                    onClick={() => setExpanded(!expanded)}
                >
                    <Icons.ChevronRight
                        className={`h-4 w-4 mr-2 transition-transform ${expanded ? 'rotate-90' : ''}`}
                    />
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className={`text-sm truncate transition-opacity duration-200`}>
                                {name}
                            </span>
                        </TooltipTrigger>
                        <TooltipPortal container={document.getElementById('style-panel')}>
                            <TooltipContent
                                side="right"
                                align="center"
                                sideOffset={10}
                                className="animation-none max-w-[200px] shadow"
                            >
                                <TooltipArrow className="fill-foreground" />
                                <p className="break-words">{name}</p>
                            </TooltipContent>
                        </TooltipPortal>
                    </Tooltip>
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
                    {variants.map((variant, idx) => (
                        <FontVariant 
                            key={`${name}-${variant}`} 
                            name={variant} 
                            fontFamily={name}
                            fontWeight={tailwindToWeight[variant] || variant}
                            src={isLocal ? localSrcs[idx]?.src : undefined}
                            isLocal={isLocal}
                            style={isLocal ? localSrcs[idx]?.style : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
