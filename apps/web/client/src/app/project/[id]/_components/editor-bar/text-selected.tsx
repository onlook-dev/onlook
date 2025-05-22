'use client';

import { useEditorEngine } from '@/components/store/editor';
import { VARIANTS } from '@onlook/fonts';
import { BrandTabValue, LeftPanelTabValue } from '@onlook/models';
import type { Font } from '@onlook/models/assets';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { convertFontWeight, toNormalCase } from '@onlook/utility';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { FontFamily } from '../left-panel/brand-tab/font-panel/font-family';
import { Border } from './dropdowns/border';
import { ColorBackground } from './dropdowns/color-background';
import { Display } from './dropdowns/display';
import { Height } from './dropdowns/height';
import { Margin } from './dropdowns/margin';
import { Opacity } from './dropdowns/opacity';
import { Padding } from './dropdowns/padding';
import { Radius } from './dropdowns/radius';
import { Width } from './dropdowns/width';
import { useColorUpdate } from './hooks/use-color-update';
import { useTextControl, type TextAlign } from './hooks/use-text-control';
import { ColorPickerContent } from './inputs/color-picker';
import { InputColor } from './inputs/input-color';
import { InputIcon } from './inputs/input-icon';
import { InputRadio } from './inputs/input-radio';
import { ViewButtons } from './panels/panel-bar/bar';
import { InputSeparator } from './separator';

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96];

// Group definitions for the text-selected toolbar
export const TEXT_SELECTED_GROUPS = [
    {
        key: 'typography',
        label: 'Typography',
        components: ['FontFamily', 'FontWeight', 'FontSize', 'TextColor', 'TextAlign', 'AdvancedTypography'],
    },
    {
        key: 'dimensions',
        label: 'Dimensions',
        components: ['Width', 'Height'],
    },
    {
        key: 'base',
        label: 'Base',
        components: ['ColorBackground', 'Border', 'Radius'],
    },
    {
        key: 'layout',
        label: 'Layout',
        components: ['Display', 'Padding', 'Margin'],
    },
    {
        key: 'opacity',
        label: 'Opacity',
        components: ['Opacity'],
    },
];

const FontFamilySelector = memo(({ fontFamily }: { fontFamily: string }) => {
    const editorEngine = useEditorEngine();
    const [fonts, setFonts] = useState<Font[]>([]);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const { handleFontFamilyChange } = useTextControl();

    useEffect(() => {
        (async () => {
            try {
                const fonts = await editorEngine.font.scanFonts();
                setFonts(fonts);
            } catch (error) {
                console.error('Failed to scan fonts:', error);
            }
        })();
    }, []);

    // Filter fonts by search
    const filteredFonts = fonts.filter((font) =>
        font.family.toLowerCase().includes(search.toLowerCase()),
    );

    const handleClose = () => {
        setOpen(false);
        editorEngine.state.brandTab = null;
        if (editorEngine.state.leftPanelTab === LeftPanelTabValue.BRAND) {
            editorEngine.state.leftPanelTab = null;
        }
        setSearch('');
    };

    return (
        <Popover
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                if (!v) editorEngine.state.brandTab = null;
            }}
        >
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="toolbar"
                            className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex cursor-pointer items-center gap-2 rounded-lg border px-3 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                            aria-label="Font Family Selector"
                            tabIndex={0}
                            onClick={handleClose}
                        >
                            <span className="truncate text-sm">{toNormalCase(fontFamily)}</span>
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="mt-1" hideArrow>
                    Font Family
                </TooltipContent>
            </Tooltip>
            <PopoverContent
                side="bottom"
                align="start"
                className="mt-1 min-w-[300px] max-h-[400px] overflow-y-auto rounded-xl p-0 bg-background shadow-lg border border-border flex flex-col"
            >
                <div className="flex justify-between items-center pl-4 pr-2.5 py-1.5 border-b border-border">
                    <h2 className="text-sm font-normal text-foreground">Fonts</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md hover:bg-background-secondary"
                        onClick={handleClose}
                    >
                        <Icons.CrossS className="h-4 w-4" />
                    </Button>
                </div>
                <div className="px-4 py-2">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search fonts..."
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label="Search fonts"
                        tabIndex={0}
                    />
                    <div className="text-sm text-muted-foreground mb-1 mt-2">Brand fonts</div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2 divide-y divide-border">
                    {filteredFonts.length === 0 ? (
                        <div className="flex justify-center items-center h-20">
                            <span className="text-sm text-muted-foreground">No fonts found</span>
                        </div>
                    ) : (
                        filteredFonts.map((font) => (
                            <div key={font.id} className="py-1">
                                <FontFamily
                                    name={font.family}
                                    variants={
                                        font.weight?.map(
                                            (weight) =>
                                                VARIANTS.find((v) => v.value === weight)?.name ||
                                                weight,
                                        ) as string[]
                                    }
                                    showDropdown={false}
                                    showAddButton={false}
                                    isDefault={fontFamily === font.family}
                                    onSetFont={() => handleFontFamilyChange(font)}
                                />
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 border-t border-border bg-background sticky bottom-0">
                    <Button
                        variant="secondary"
                        size="lg"
                        className="w-full rounded-md text-sm font-medium"
                        aria-label="Manage Brand fonts"
                        tabIndex={0}
                        onClick={() => {
                            editorEngine.state.brandTab = BrandTabValue.FONTS;
                            editorEngine.state.leftPanelTab = LeftPanelTabValue.BRAND;

                            setOpen(false);
                        }}
                    >
                        Manage Brand fonts
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
});

FontFamilySelector.displayName = 'FontFamilySelector';

const FontWeightSelector = memo(
    ({
        fontWeight,
        handleFontWeightChange,
    }: {
        fontWeight: string;
        handleFontWeightChange: (weight: string) => void;
    }) => (
        <DropdownMenu>
            <Tooltip>
                <div>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="toolbar"
                                className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex w-24 cursor-pointer items-center justify-start gap-2 rounded-lg border px-3 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                            >
                                <span className="text-smallPlus">
                                    {convertFontWeight(fontWeight)}
                                </span>
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="mt-1" hideArrow>
                        Font Weight
                    </TooltipContent>
                </div>
            </Tooltip>
            <DropdownMenuContent align="center" className="mt-1 min-w-[120px] rounded-lg p-1">
                {VARIANTS.map((weight) => (
                    <DropdownMenuItem
                        key={weight.value}
                        onClick={() => handleFontWeightChange(weight.value)}
                        className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border flex items-center justify-between rounded-md border px-2 py-1.5 text-sm data-[highlighted]:text-white cursor-pointer transition-colors duration-150 hover:bg-background-tertiary/20 hover:text-foreground ${fontWeight === weight.value
                            ? 'bg-background-tertiary/20 border-border border text-white'
                            : ''
                            }`}
                    >
                        {weight.name}
                        {fontWeight === weight.value && (
                            <Icons.Check className="ml-2 h-4 w-4 text-foreground-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    ),
);

FontWeightSelector.displayName = 'FontWeightSelector';

const FontSizeSelector = memo(
    ({
        fontSize,
        handleFontSizeChange,
    }: {
        fontSize: number;
        handleFontSizeChange: (size: number) => void;
    }) => {
        const [open, setOpen] = useState(false);
        const inputRef = useRef<HTMLInputElement>(null);

        const adjustFontSize = (amount: number) => {
            handleFontSizeChange(Math.max(1, fontSize + amount));
        };

        const handleInputClick = () => {
            setOpen(true);
            // Use setTimeout to ensure the input is focused after the popover opens
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 0);
        };

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <Tooltip>
                    <div>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-0.5">
                                <Button
                                    variant="ghost"
                                    size="toolbar"
                                    onClick={() => adjustFontSize(-1)}
                                    className="border-border/0 hover:bg-background-tertiary/20 hover:border-border text-muted-foreground data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border h-8 w-8 cursor-pointer rounded-lg border px-2 hover:border hover:text-white data-[state=open]:border data-[state=open]:text-white"
                                >
                                    <Icons.Minus className="h-4 w-4" />
                                </Button>
                                <PopoverTrigger asChild>
                                    <input
                                        ref={inputRef}
                                        type="number"
                                        value={fontSize}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            if (!isNaN(value) && value > 0) {
                                                handleFontSizeChange(value);
                                            }
                                        }}
                                        onClick={handleInputClick}
                                        className="border-border/0 text-muted-foreground hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border focus:bg-background-tertiary/20 focus:ring-border h-8 max-w-[40px] min-w-[40px] [appearance:textfield] rounded-lg border px-1 text-center text-sm hover:border hover:text-white focus:ring-1 focus:outline-none data-[state=open]:border data-[state=open]:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                </PopoverTrigger>

                                <Button
                                    variant="ghost"
                                    size="toolbar"
                                    onClick={() => adjustFontSize(1)}
                                    className="border-border/0 hover:bg-background-tertiary/20 hover:border-border text-muted-foreground data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border h-8 w-8 cursor-pointer rounded-lg border px-2 hover:border hover:text-white data-[state=open]:border data-[state=open]:text-white"
                                >
                                    <Icons.Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="mt-1" hideArrow>
                            Font Size
                        </TooltipContent>
                    </div>
                </Tooltip>
                <PopoverContent
                    align="center"
                    className="mt-1 w-[48px] min-w-[48px] rounded-lg p-1"
                >
                    <div className="grid grid-cols-1 gap-1">
                        {FONT_SIZES.map((size) => (
                            <button
                                key={size}
                                onClick={() => {
                                    handleFontSizeChange(size);
                                    setOpen(false);
                                }}
                                className={`cursor-pointer text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border justify-center rounded-md border px-2 py-1 text-sm data-[highlighted]:text-white ${size === fontSize
                                    ? 'bg-background-tertiary/20 border-border border text-white'
                                    : ''
                                    }`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        );
    },
);

FontSizeSelector.displayName = 'FontSizeSelector';

const TextAlignSelector = memo(
    ({
        textAlign,
        handleTextAlignChange,
    }: {
        textAlign: TextAlign;
        handleTextAlignChange: (align: TextAlign) => void;
    }) => (
        <DropdownMenu>
            <Tooltip>
                <div>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="toolbar"
                                className="text-white border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex max-w-9 min-w-9 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                            >
                                {(() => {
                                    switch (textAlign) {
                                        case 'center':
                                            return <Icons.TextAlignCenter className="h-4 w-4" />;
                                        case 'right':
                                            return <Icons.TextAlignRight className="h-4 w-4" />;
                                        case 'justify':
                                            return <Icons.TextAlignJustified className="h-4 w-4" />;
                                        case 'left':
                                        default:
                                            return <Icons.TextAlignLeft className="h-4 w-4" />;
                                    }
                                })()}
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="mt-1" hideArrow>
                        Text Align
                    </TooltipContent>
                </div>
            </Tooltip>
            <DropdownMenuContent
                align="center"
                className="mt-1 flex min-w-fit gap-1 rounded-lg p-1"
            >
                {[
                    { value: 'left' as TextAlign, icon: Icons.TextAlignLeft },
                    { value: 'center' as TextAlign, icon: Icons.TextAlignCenter },
                    { value: 'right' as TextAlign, icon: Icons.TextAlignRight },
                    { value: 'justify' as TextAlign, icon: Icons.TextAlignJustified },
                ].map(({ value, icon: Icon }) => (
                    <DropdownMenuItem
                        key={value}
                        onClick={() => handleTextAlignChange(value)}
                        className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border rounded-md border px-2 py-1.5 data-[highlighted]:text-foreground cursor-pointer transition-colors duration-150 hover:bg-background-tertiary/20 hover:text-foreground ${textAlign === value
                                ? 'bg-background-tertiary/20 border-border border text-white'
                                : ''
                            }`}
                    >
                        <Icon className="h-4 w-4" />
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    ),
);

const TextColor = memo(
    ({
        handleTextColorChange,
        textColor,
    }: {
        handleTextColorChange: (color: string) => void;
        textColor: string;
    }) => {
        const { handleColorUpdate, handleColorUpdateEnd, tempColor } = useColorUpdate({
            elementStyleKey: 'color',
            onValueChange: (_, value) => handleTextColorChange(value),
            initialColor: textColor,
        });

        return (
            <Popover>
                <Tooltip>
                    <div>
                        <TooltipTrigger asChild>
                            <PopoverTrigger>
                                <div className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-2 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white">
                                    <Icons.TextColorSymbol className="h-3.5 w-3.5" />
                                    <div
                                        className="h-[2.5px] w-5.5 rounded-full bg-current"
                                        style={{ backgroundColor: tempColor.toHex() || '#000000' }}
                                    />
                                </div>
                            </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="mt-1" hideArrow>
                            Text Color
                        </TooltipContent>
                    </div>
                </Tooltip>
                <PopoverContent
                    className="w-[224px] overflow-hidden rounded-lg p-0 shadow-xl backdrop-blur-lg"
                    side="bottom"
                    align="start"
                >
                    <ColorPickerContent
                        color={tempColor}
                        onChange={handleColorUpdate}
                        onChangeEnd={handleColorUpdateEnd}
                    />
                </PopoverContent>
            </Popover>
        );
    },
);

TextColor.displayName = 'TextColor';

const AdvancedTypography = () => {
    const {
        textState,
        handleLetterSpacingChange,
        handleCapitalizationChange,
        handleTextDecorationChange,
        handleLineHeightChange,
    } = useTextControl();

    const [open, setOpen] = useState(false);
    const handleClose = () => {
        setOpen(false);
    };

    const capitalizationOptions = [
        { value: 'uppercase', label: 'AA' },
        { value: 'capitalize', label: 'Aa' },
        { value: 'lowercase', label: 'aa' },
        { value: 'none', icon: <Icons.CrossL className="h-4 w-4" /> },
    ];

    const decorationOptions = [
        { value: 'underline', icon: <Icons.TextUnderline className="h-4 w-4" /> },
        { value: 'overline', icon: <Icons.TextOverline className="h-4 w-4" /> },
        { value: 'line-through', icon: <Icons.TextStrikeThrough className="h-4 w-4" /> },
        { value: 'none', icon: <Icons.CrossL className="h-4 w-4" /> },
    ];

    return (
        <Popover open={open} onOpenChange={(v) => setOpen(v)}>
            <Tooltip>
                <div>
                    <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="toolbar"
                                className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border px-2 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                            >
                                <Icons.AdvancedTypography className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="mt-1" hideArrow>
                        Advanced Typography
                    </TooltipContent>
                </div>
            </Tooltip>
            <PopoverContent
                side="bottom"
                align="start"
                className="mt-1 w-[300px] rounded-xl p-0 bg-background shadow-lg border border-border"
            >
                <div className="flex justify-between items-center pl-4 pr-2.5 py-1.5 border-b border-border">
                    <h2 className="text-sm font-normal text-foreground">Advanced Typography</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-md hover:bg-background-secondary"
                        onClick={handleClose}
                    >
                        <Icons.CrossS className="h-4 w-4" />
                    </Button>
                </div>
                <div className="space-y-4 px-4 py-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground w-20">Color</span>
                        <div className="flex-1">
                            <InputColor color={textState.textColor} elementStyleKey="color" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground w-20">Line</span>
                        <div className="flex-1">
                            <InputIcon
                                value={isNaN(parseFloat(textState.lineHeight)) ? 0 : parseFloat(textState.lineHeight)}
                                onChange={(value) => handleLineHeightChange(value.toString())}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground w-20">Letter</span>
                        <div className="flex-1">
                            <InputIcon
                                value={isNaN(parseFloat(textState.letterSpacing)) ? 0 : parseFloat(textState.letterSpacing)}
                                onChange={(value) => handleLetterSpacingChange(value.toString())}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-20">Capitalize</span>
                        <div className="w-[225px]">
                            <InputRadio
                                options={capitalizationOptions}
                                value={textState.capitalization}
                                onChange={handleCapitalizationChange}
                                className="flex-1"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-20">Decorate</span>
                        <div className="w-[225px]">
                            <InputRadio
                                options={decorationOptions}
                                value={textState.textDecorationLine}
                                onChange={handleTextDecorationChange}
                                className="flex-1"
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

export const TextSelected = ({ availableWidth = 0 }: { availableWidth?: number }) => {
    const {
        textState,
        handleFontSizeChange,
        handleFontWeightChange,
        handleTextAlignChange,
        handleTextColorChange,
    } = useTextControl();

    const groupRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [groupWidths, setGroupWidths] = useState<number[]>([]);
    const [overflowOpen, setOverflowOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(TEXT_SELECTED_GROUPS.length);

    // Calculate total width of a group including margins and padding
    const calculateGroupWidth = useCallback((element: HTMLElement | null): number => {
        if (!element) return 0;
        const style = window.getComputedStyle(element);
        const width = element.offsetWidth;
        const marginLeft = parseFloat(style.marginLeft);
        const marginRight = parseFloat(style.marginRight);
        const paddingLeft = parseFloat(style.paddingLeft);
        const paddingRight = parseFloat(style.paddingRight);
        return width + marginLeft + marginRight + paddingLeft + paddingRight;
    }, []);

    // Measure all group widths
    const measureGroups = useCallback(() => {
        const widths = groupRefs.current.map(ref => calculateGroupWidth(ref));
        setGroupWidths(widths);
    }, [calculateGroupWidth]);

    // Update visible count based on available width
    const updateVisibleCount = useCallback(() => {
        if (!groupWidths.length || !availableWidth) return;

        const OVERFLOW_BUTTON_WIDTH = 32; // Reduced from 48px
        const MIN_GROUP_WIDTH = 80; // Reduced from 100px
        const SEPARATOR_WIDTH = 8; // Width of the InputSeparator
        let used = 0;
        let count = 0;

        for (let i = 0; i < groupWidths.length; i++) {
            const width = groupWidths[i] ?? 0;
            if (width < MIN_GROUP_WIDTH) continue;

            // Add separator width if this isn't the first group
            const totalWidth = width + (count > 0 ? SEPARATOR_WIDTH : 0);

            if (used + totalWidth <= availableWidth - OVERFLOW_BUTTON_WIDTH) {
                used += totalWidth;
                count++;
            } else {
                break;
            }
        }

        setVisibleCount(count);
    }, [groupWidths, availableWidth]);

    // Measure group widths after mount and when groupRefs change
    useEffect(() => {
        measureGroups();
    }, [measureGroups, availableWidth]);

    // Update visible count when measurements change
    useEffect(() => {
        updateVisibleCount();
    }, [updateVisibleCount]);

    const visibleGroups = TEXT_SELECTED_GROUPS.slice(0, visibleCount);
    const overflowGroups = TEXT_SELECTED_GROUPS.slice(visibleCount);

    // Create component map with current textState and handlers
    const COMPONENT_MAP: { [key: string]: React.ComponentType<any> } = {
        Opacity,
        Width,
        Height,
        FontFamily: () => <FontFamilySelector fontFamily={textState.fontFamily} />,
        FontWeight: () => (
            <FontWeightSelector
                fontWeight={textState.fontWeight}
                handleFontWeightChange={handleFontWeightChange}
            />
        ),
        FontSize: () => (
            <FontSizeSelector
                fontSize={textState.fontSize}
                handleFontSizeChange={handleFontSizeChange}
            />
        ),
        TextColor: () => (
            <TextColor
                handleTextColorChange={handleTextColorChange}
                textColor={textState.textColor}
            />
        ),
        TextAlign: () => (
            <TextAlignSelector
                textAlign={textState.textAlign}
                handleTextAlignChange={handleTextAlignChange}
            />
        ),
        AdvancedTypography: () => <AdvancedTypography />,
        Display,
        Padding,
        Margin,
        Radius,
        Border,
        ColorBackground,
        ViewButtons,
    };

    return (
        <>
            {/* Hidden measurement container */}
            <div style={{ position: 'absolute', visibility: 'hidden', height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                {TEXT_SELECTED_GROUPS.map((group, groupIdx) => (
                    <div
                        key={group.key}
                        className="flex items-center justify-center gap-0.5"
                        ref={el => { groupRefs.current[groupIdx] = el; }}
                    >
                        {group.components.map((compKey, idx) => {
                            const Comp = COMPONENT_MAP[compKey];
                            return Comp ? <Comp key={compKey + idx} /> : null;
                        })}
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-center gap-0.5 w-full overflow-hidden">
                {TEXT_SELECTED_GROUPS.map((group, groupIdx) => (
                    groupIdx < visibleCount ? (
                        <React.Fragment key={group.key}>
                            {groupIdx > 0 && <InputSeparator />}
                            <div className="flex items-center justify-center gap-0.5">
                                {group.components.map((compKey, idx) => {
                                    const Comp = COMPONENT_MAP[compKey];
                                    return Comp ? <Comp key={compKey + idx} /> : null;
                                })}
                            </div>
                        </React.Fragment>
                    ) : null
                ))}
                <InputSeparator />
                {overflowGroups.length > 0 && (
                    <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="toolbar"
                                className="w-8 h-8 flex items-center justify-center"
                                aria-label="Show more toolbar controls"
                            >
                                <Icons.DotsHorizontal className="w-5 h-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="flex flex-row gap-1 p-1 px-1 bg-background rounded-lg shadow-xl shadow-black/20 min-w-[fit-content] items-center w-[fit-content]">
                            {overflowGroups.map((group, groupIdx) => (
                                <React.Fragment key={group.key}>
                                    {groupIdx > 0 && <InputSeparator />}
                                    <div className="flex items-center gap-0.5">
                                        {group.components.map((compKey, idx) => {
                                            const Comp = COMPONENT_MAP[compKey];
                                            return Comp ? <Comp key={compKey + idx} /> : null;
                                        })}
                                    </div>
                                </React.Fragment>
                            ))}
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        </>
    );
};

export { FontFamilySelector, FontSizeSelector, FontWeightSelector, TextAlignSelector, TextColor };

