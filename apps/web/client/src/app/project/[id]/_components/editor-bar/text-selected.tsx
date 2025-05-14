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
import { Color, convertFontWeight } from '@onlook/utility';
import { memo, useEffect, useState } from 'react';
import { StateDropdown } from './dropdowns/state-dropdown';
import { useTextControl, type TextAlign } from './hooks/use-text-control';
import { ColorPickerContent } from './inputs/color-picker';
import { ViewButtons } from './panels/panel-bar/bar';
import { InputSeparator } from './separator';

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96];

const FontFamilySelector = memo(({ fontFamily }: { fontFamily: string }) => {
    return (
        <Button
            variant="ghost"
            className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex cursor-pointer items-center gap-2 rounded-lg border px-3 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
        >
            <span className="truncate text-sm">{fontFamily}</span>
        </Button>
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
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex w-24 cursor-pointer items-center justify-start gap-2 rounded-lg border px-3 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                >
                    <span className="text-smallPlus">{convertFontWeight(fontWeight)}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="center"
                className="mt-1 min-w-[120px] rounded-lg p-1"
            >
                {VARIANTS.map((weight) => (
                    <DropdownMenuItem
                        key={weight.value}
                        onClick={() => handleFontWeightChange(weight.value)}
                        className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border flex items-center justify-between rounded-md border px-2 py-1.5 text-sm data-[highlighted]:text-white cursor-pointer transition-colors duration-150 hover:bg-background-tertiary/20 hover:text-foreground ${fontWeight === weight.value
                                ? "bg-background-tertiary/20 border-border border text-white"
                                : ""
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
            <div className="flex items-center gap-0.5">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => adjustFontSize(-1)}
                    className="border-border/0 hover:bg-background-tertiary/20 hover:border-border text-muted-foreground data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border h-8 w-8 cursor-pointer rounded-lg border px-2 hover:border hover:text-white data-[state=open]:border data-[state=open]:text-white"
                >
                    <Icons.Minus className="h-4 w-4" />
                </Button>
                <DropdownMenu>
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
                    <DropdownMenuContent
                        align="center"
                        className="mt-1 w-[48px] min-w-[48px] rounded-lg p-1"
                    >
                        {FONT_SIZES.map((size) => (
                            <DropdownMenuItem
                                key={size}
                                onClick={() => handleFontSizeChange(size)}
                                className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border justify-center rounded-md border px-2 py-1 text-sm data-[highlighted]:text-white ${size === fontSize
                                        ? 'bg-background-tertiary/20 border-border border text-white'
                                        : ''
                                    }`}
                            >
                                {size}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => adjustFontSize(1)}
                    className="border-border/0 hover:bg-background-tertiary/20 hover:border-border text-muted-foreground data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border h-8 w-8 cursor-pointer rounded-lg border px-2 hover:border hover:text-white data-[state=open]:border data-[state=open]:text-white"
                >
                    <Icons.Plus className="h-4 w-4" />
                </Button>
            </div>
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
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex max-w-9 min-w-9 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                >
                    {textAlign === "left" && <Icons.TextAlignLeft className="h-4 w-4" />}
                    {textAlign === "center" && (
                        <Icons.TextAlignCenter className="h-4 w-4" />
                    )}
                    {textAlign === "right" && (
                        <Icons.TextAlignRight className="h-4 w-4" />
                    )}
                    {textAlign === "justify" && (
                        <Icons.TextAlignJustified className="h-4 w-4" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="center"
                className="mt-1 flex min-w-fit gap-1 rounded-lg p-1"
            >
                {[
                    { value: "left" as TextAlign, icon: Icons.TextAlignLeft },
                    { value: "center" as TextAlign, icon: Icons.TextAlignCenter },
                    { value: "right" as TextAlign, icon: Icons.TextAlignRight },
                    { value: "justify" as TextAlign, icon: Icons.TextAlignJustified },
                ].map(({ value, icon: Icon }) => (
                    <DropdownMenuItem
                        key={value}
                        onClick={() => handleTextAlignChange(value)}
                        className={`text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border rounded-md border px-2 py-1.5 data-[highlighted]:text-foreground cursor-pointer transition-colors duration-150 hover:bg-background-tertiary/20 hover:text-foreground ${textAlign === value
                                ? "bg-background-tertiary/20 border-border border text-white"
                                : ""
                            }`}
                    >
                        <Icon className="h-4 w-4" />
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    ),
);

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
            <div className="flex items-center gap-1">
                <StateDropdown />
                <InputSeparator />
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
                <ViewButtons />
            </div>
        </div>
    );
};

const TextColor = 
    ({
        handleTextColorChange,
        textColor,
    }: {
        handleTextColorChange: (color: string) => void;
        textColor: string;
    }) => {
        const [tempColor, setTempColor] = useState<Color>(Color.from(textColor));
        

        const handleColorChange = (newColor: Color) => {
            try {
                setTempColor(newColor);
            } catch (error) {
                console.error('Error converting color:', error);
            }
        };

        const handleColorChangeEnd = (newColor: Color) => {
            try {
                setTempColor(newColor);
                handleTextColorChange(newColor.toHex());
                
            } catch (error) {
                console.error('Error converting color:', error);
            }
        };

        return (
            <Popover>
                <PopoverTrigger>
                    <div className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border px-2 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white">
                        <Icons.TextColorSymbol className="h-3.5 w-3.5" />
                        <div
                            className="h-[2.5px] w-5.5 rounded-full bg-current"
                            style={{ backgroundColor: tempColor.toHex() || '#000000' }}
                        />
                    </div>
                </PopoverTrigger>
                <PopoverContent
                    className="z-10 w-[280px] overflow-hidden rounded-lg p-0 shadow-xl backdrop-blur-lg"
                    side="bottom"
                    align="start"
                >
                    <ColorPickerContent
                        color={tempColor}
                        onChange={handleColorChange}
                        onChangeEnd={handleColorChangeEnd}
                    />
                </PopoverContent>
            </Popover>
        );
    }