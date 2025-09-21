'use client';

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { useEffect, useRef, useState } from 'react';
import { useDropdownControl } from '../../hooks/use-dropdown-manager';
import { useTextControl } from '../../hooks/use-text-control';
import { HoverOnlyTooltip } from '../../hover-tooltip';
import { ToolbarButton } from '../../toolbar-button';

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96];

export const FontSizeSelector = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { handleFontSizeChange, textState } = useTextControl();
    const [inputValue, setInputValue] = useState(textState.fontSize.toString());

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'font-size-dropdown'
    });

    // Update local input value when textState.fontSize changes externally
    useEffect(() => {
        setInputValue(textState.fontSize.toString());
    }, [textState.fontSize]);

    const adjustFontSize = (amount: number) => {
        const newSize = Math.max(1, textState.fontSize + amount);
        handleFontSizeChange(newSize);
    };

    const handleInputClick = () => {
        onOpenChange(true);
        // Use setTimeout to ensure the input is focused after the dropdown opens
        setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        }, 0);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const value = parseInt(inputValue);
            if (!isNaN(value) && value > 0) {
                handleFontSizeChange(value);
            } else {
                // Reset to current value if invalid
                setInputValue(textState.fontSize.toString());
            }
            onOpenChange(false);
            inputRef.current?.blur();
        } else if (e.key === 'Escape') {
            // Reset to current value and close
            setInputValue(textState.fontSize.toString());
            onOpenChange(false);
            inputRef.current?.blur();
        }
    };

    const handleInputBlur = () => {
        // When input loses focus, validate and apply the value or reset
        const value = parseInt(inputValue);
        if (!isNaN(value) && value > 0) {
            handleFontSizeChange(value);
        } else {
            // Reset to current value if invalid
            setInputValue(textState.fontSize.toString());
        }
    };

    const handleSizeSelect = (size: number) => {
        handleFontSizeChange(size);
        onOpenChange(false);
        inputRef.current?.blur();
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip
                content="Font Size"
                side="bottom"
                className="mt-1"
                hideArrow
                disabled={isOpen}
            >
                <div className="flex items-center gap-0.5">
                    <ToolbarButton
                        onClick={() => adjustFontSize(-1)}
                        className="px-2 min-w-9"
                    >
                        <Icons.Minus className="h-4 w-4" />
                    </ToolbarButton>
                    <DropdownMenuTrigger asChild>
                        <ToolbarButton
                            isOpen={isOpen}
                            className="min-w-[40px] px-1 w-11"
                            onClick={handleInputClick}
                        >
                            <input
                                ref={inputRef}
                                type="number"
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleInputKeyDown}
                                onBlur={handleInputBlur}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full bg-transparent text-center text-sm focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                        </ToolbarButton>
                    </DropdownMenuTrigger>
                    <ToolbarButton
                        onClick={() => adjustFontSize(1)}
                        className="px-2 min-w-9"
                    >
                        <Icons.Plus className="h-4 w-4" />
                    </ToolbarButton>
                </div>
            </HoverOnlyTooltip>
            <DropdownMenuContent
                align="center"
                className="mt-1 w-[48px] min-w-[48px] rounded-lg p-1"
            >
                <div className="grid grid-cols-1 gap-1">
                    {FONT_SIZES.map((size) => (
                        <button
                            key={size}
                            onClick={() => handleSizeSelect(size)}
                            className={`cursor-pointer text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border justify-center rounded-md border px-2 py-1 text-sm data-[highlighted]:text-white ${size === textState.fontSize
                                ? 'bg-background-tertiary/20 border-border border text-white'
                                : ''
                                }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
