'use client';

import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

import { useTextControl } from '../hooks/use-text-control';
import { useDropdownControl } from '../hooks/use-dropdown-manager';
import { InputColor } from '../inputs/input-color';
import { InputIcon } from '../inputs/input-icon';
import { InputRadio } from '../inputs/input-radio';
import { HoverOnlyTooltip } from '../hover-tooltip';
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
        id: 'advanced-typography-dropdown' 
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
