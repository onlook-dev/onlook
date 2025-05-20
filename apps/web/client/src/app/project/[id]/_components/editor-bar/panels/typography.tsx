'use client';

import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { useState } from 'react';
import { InputColor } from '../inputs/input-color';
import { InputIcon } from '../inputs/input-icon';
import { InputRadio } from '../inputs/input-radio';

interface TypographyProps {
    className?: string;
}

export function Typography({ className }: TypographyProps) {
    // State for typography properties
    const [fontSize, setFontSize] = useState('16');
    const [fontWeight, setFontWeight] = useState('Regular');
    const [lineHeight, setLineHeight] = useState('1.5');
    const [letterSpacing, setLetterSpacing] = useState('0');
    const [textAlign, setTextAlign] = useState('left');
    const [textDecoration, setTextDecoration] = useState('none');
    const [fontFamily, setFontFamily] = useState('Inter');
    const [capitalization, setCapitalization] = useState('none');
    const [textColor, setTextColor] = useState('#FFFFFF');
    const [textOpacity, setTextOpacity] = useState(100);

    // Section collapse states
    const [textOpen, setTextOpen] = useState(true);
    const [spacingOpen, setSpacingOpen] = useState(true);
    const [decorationOpen, setDecorationOpen] = useState(true);

    const alignmentOptions = [
        { value: 'left', icon: <Icons.TextAlignLeft className="h-4 w-4" /> },
        { value: 'center', icon: <Icons.TextAlignCenter className="h-4 w-4" /> },
        { value: 'right', icon: <Icons.TextAlignRight className="h-4 w-4" /> },
        { value: 'justify', icon: <Icons.TextAlignJustified className="h-4 w-4" /> },
    ];

    const capitalizationOptions = [
        { value: 'uppercase', label: 'AA' },
        { value: 'capitalize', label: 'Aa' },
        { value: 'lowercase', label: 'aa' },
        { value: 'none', icon: <Icons.CrossL className="h-4 w-4" /> },
    ];

    const decorationOptions = [
        { value: 'underline', icon: <Icons.TextUnderline className="h-4 w-4" /> },
        { value: 'overline', icon: <Icons.TextOverline className="h-4 w-4" /> },
        { value: 'strikethrough', icon: <Icons.TextStrikeThrough className="h-4 w-4" /> },
        { value: 'none', icon: <Icons.CrossL className="h-4 w-4" /> },
    ];

    return (
        <div className={cn('space-y-1', className)}>
            {/* Text Properties Section */}
            <div className="rounded-lg bg-background backdrop-blur p-4">
                <div
                    className="flex items-center justify-between mb-0 cursor-pointer"
                    onClick={() => setTextOpen(!textOpen)}
                >
                    <span className="text-sm font-medium text-white w-24">Text</span>
                    <Icons.ChevronUp
                        className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform',
                            !textOpen && 'rotate-180',
                        )}
                    />
                </div>

                {textOpen && (
                    <div className="pt-3 space-y-2">
                        {/* Font Family */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground w-24">Font</span>
                            <div className="flex-1">
                                <Button
                                    variant="ghost"
                                    className="h-[36px] w-full bg-background-tertiary/50 hover:bg-background-tertiary/80 rounded-md ml-[1px] px-2.5 flex items-center justify-between cursor-pointer"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {fontFamily}
                                        </span>
                                    </div>
                                </Button>
                            </div>
                        </div>

                        {/* Font Size */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground w-24">Size</span>
                            <div className="flex-1">
                                <InputIcon
                                    value={parseInt(fontSize)}
                                    onChange={(value) => setFontSize(value.toString())}
                                />
                            </div>
                        </div>

                        {/* Font Weight */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground w-24">Weight</span>
                            <div className="flex-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="h-[36px] w-full bg-background-tertiary/50 hover:bg-background-tertiary/80 rounded-md ml-[1px] px-2.5 flex items-center justify-between cursor-pointer"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-muted-foreground">
                                                    {fontWeight}
                                                </span>
                                            </div>
                                            <Icons.ChevronDown className="h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="start"
                                        className="w-full min-w-[100px] -mt-[1px] p-1 rounded-lg"
                                    >
                                        {['Light', 'Regular', 'Medium', 'SemiBold', 'Bold'].map(
                                            (weight) => (
                                                <DropdownMenuItem
                                                    key={weight}
                                                    className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                                                    onSelect={() => setFontWeight(weight)}
                                                >
                                                    {weight}
                                                </DropdownMenuItem>
                                            ),
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Text Color */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground w-24">Color</span>
                            <div className="flex-1">
                                <InputColor color={textColor} onColorChange={setTextColor} elementStyleKey="color" />
                            </div>
                        </div>

                        {/* Text Alignment */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-24">Align</span>
                            <div className="w-[225px]">
                                <InputRadio
                                    options={alignmentOptions}
                                    value={textAlign}
                                    onChange={setTextAlign}
                                    className="flex-1"
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground w-24">Line Height</span>
                            <div className="flex-1">
                                <InputIcon
                                    value={parseFloat(lineHeight)}
                                    onChange={(value) => setLineHeight(value.toString())}
                                />
                            </div>
                        </div>

                        {/* Letter Spacing */}
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground w-24">Letter</span>
                            <div className="flex-1">
                                <InputIcon
                                    value={parseFloat(letterSpacing)}
                                    onChange={(value) => setLetterSpacing(value.toString())}
                                />
                            </div>
                        </div>

                        {/* Capitalization */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-24">Capitalize</span>
                            <div className="w-[225px]">
                                <InputRadio
                                    options={capitalizationOptions}
                                    value={capitalization}
                                    onChange={setCapitalization}
                                    className="flex-1"
                                />
                            </div>
                        </div>

                        {/* Text Decoration */}
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-24">Decorate</span>
                            <div className="w-[225px]">
                                <InputRadio
                                    options={decorationOptions}
                                    value={textDecoration}
                                    onChange={setTextDecoration}
                                    className="flex-1"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
