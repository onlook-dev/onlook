'use client';

import { VARIANTS } from '@onlook/fonts';
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
import { memo, useEffect, useState } from 'react';
import { useTextControl, type TextAlign } from './hooks/use-text-control';
import { ColorPickerContent } from './inputs/color-picker';
import { ViewButtons } from './panels/panel-bar/bar';
import { InputSeparator } from './separator';
import { useEditorEngine } from '@/components/store/editor';
import type { Font } from '@onlook/models/assets';
import { useColorUpdate } from './hooks/use-color-update';
import { FontFamily } from '../left-panel/brand-tab/font-panel/font-family';
import { BrandTabValue, LeftPanelTabValue } from '@onlook/models';
import { InputIcon } from './inputs/input-icon';
import { InputRadio } from './inputs/input-radio';
import { InputColor } from './inputs/input-color';

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96];

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
                        className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border flex items-center justify-between rounded-md border px-2 py-1.5 text-sm data-[highlighted]:text-white cursor-pointer transition-colors duration-150 hover:bg-background-tertiary/20 hover:text-foreground ${
                            fontWeight === weight.value
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
        const adjustFontSize = (amount: number) => {
            handleFontSizeChange(Math.max(1, fontSize + amount));
        };

        return (
            <DropdownMenu>
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
                                <DropdownMenuTrigger asChild>
                                    <input
                                        type="number"
                                        value={fontSize}
                                        onChange={(e) => {
                                            const value = parseInt(e.target.value);
                                            if (!isNaN(value) && value > 0) {
                                                handleFontSizeChange(value);
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="border-border/0 text-muted-foreground hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border focus:bg-background-tertiary/20 focus:ring-border h-8 max-w-[40px] min-w-[40px] [appearance:textfield] rounded-lg border px-1 text-center text-sm hover:border hover:text-white focus:ring-1 focus:outline-none data-[state=open]:border data-[state=open]:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                    />
                                </DropdownMenuTrigger>

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
                <DropdownMenuContent
                    align="center"
                    className="mt-1 w-[48px] min-w-[48px] rounded-lg p-1"
                >
                    {FONT_SIZES.map((size) => (
                        <DropdownMenuItem
                            key={size}
                            onClick={() => handleFontSizeChange(size)}
                            className={`cursor-pointer text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border justify-center rounded-md border px-2 py-1 text-sm data-[highlighted]:text-white ${
                                size === fontSize
                                    ? 'bg-background-tertiary/20 border-border border text-white'
                                    : ''
                            }`}
                        >
                            {size}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
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
                                className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex max-w-9 min-w-9 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                            >
                                {textAlign === 'left' && (
                                    <Icons.TextAlignLeft className="h-4 w-4" />
                                )}
                                {textAlign === 'center' && (
                                    <Icons.TextAlignCenter className="h-4 w-4" />
                                )}
                                {textAlign === 'right' && (
                                    <Icons.TextAlignRight className="h-4 w-4" />
                                )}
                                {textAlign === 'justify' && (
                                    <Icons.TextAlignJustified className="h-4 w-4" />
                                )}
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
                        className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border rounded-md border px-2 py-1.5 data-[highlighted]:text-foreground cursor-pointer transition-colors duration-150 hover:bg-background-tertiary/20 hover:text-foreground ${
                            textAlign === value
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

export const TextSelected = () => {
    const {
        textState,
        handleFontSizeChange,
        handleFontWeightChange,
        handleTextAlignChange,
        handleTextColorChange,
    } = useTextControl();

    return (
        <div className="bg-background flex flex-col drop-shadow-xl backdrop-blur">
            <div className="flex items-center gap-0.5">
                <FontFamilySelector fontFamily={textState.fontFamily} />
                <InputSeparator />
                <FontWeightSelector
                    fontWeight={textState.fontWeight}
                    handleFontWeightChange={handleFontWeightChange}
                />
                <InputSeparator />
                <FontSizeSelector
                    fontSize={textState.fontSize}
                    handleFontSizeChange={handleFontSizeChange}
                />
                <InputSeparator />
                <TextColor
                    handleTextColorChange={handleTextColorChange}
                    textColor={textState.textColor}
                />
                <TextAlignSelector
                    textAlign={textState.textAlign}
                    handleTextAlignChange={handleTextAlignChange}
                />
                <InputSeparator />
                <AdvancedTypography />
                <ViewButtons />
            </div>
        </div>
    );
};
