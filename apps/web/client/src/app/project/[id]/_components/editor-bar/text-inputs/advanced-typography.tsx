'use client';

import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { useTextControl } from '../hooks/use-text-control';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { InputColor } from '../inputs/input-color';
import { InputIcon } from '../inputs/input-icon';
import { InputRadio } from '../inputs/input-radio';
import { ToolbarButton } from '../toolbar-button';

export const AdvancedTypography = () => {
    const {
        textState,
        handleLetterSpacingChange,
        handleCapitalizationChange,
        handleTextDecorationChange,
        handleLineHeightChange,
    } = useTextControl();

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'advanced-typography-dropdown',
    });

    const handleClose = () => {
        onOpenChange(false);
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
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip
                content="Advanced Typography"
                side="bottom"
                className="mt-1"
                hideArrow
                disabled={isOpen}
            >
                <DropdownMenuTrigger asChild>
                    <ToolbarButton
                        isOpen={isOpen}
                        className="flex min-w-9 items-center justify-center px-2"
                    >
                        <Icons.AdvancedTypography className="h-4 w-4" />
                    </ToolbarButton>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent
                side="bottom"
                align="start"
                className="bg-background border-border mt-1 w-[300px] rounded-xl border p-0 shadow-lg"
            >
                <div className="border-border flex items-center justify-between border-b py-1.5 pr-2.5 pl-4">
                    <h2 className="text-foreground text-sm font-normal">Advanced Typography</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hover:bg-background-secondary h-7 w-7 rounded-md"
                        onClick={handleClose}
                    >
                        <Icons.CrossS className="h-4 w-4" />
                    </Button>
                </div>
                <div className="space-y-4 px-4 py-2">
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground w-20 text-sm">Color</span>
                        <div className="flex-1">
                            <InputColor color={textState.textColor} elementStyleKey="color" />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground w-20 text-sm">Line</span>
                        <div className="flex-1">
                            <InputIcon
                                value={
                                    isNaN(parseFloat(textState.lineHeight))
                                        ? 0
                                        : parseFloat(textState.lineHeight)
                                }
                                onChange={(value) => handleLineHeightChange(value.toString())}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-muted-foreground w-20 text-sm">Letter</span>
                        <div className="flex-1">
                            <InputIcon
                                value={
                                    isNaN(parseFloat(textState.letterSpacing))
                                        ? 0
                                        : parseFloat(textState.letterSpacing)
                                }
                                onChange={(value) => handleLetterSpacingChange(value.toString())}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-muted-foreground w-20 text-sm">Capitalize</span>
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
                        <span className="text-muted-foreground w-20 text-sm">Decorate</span>
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
