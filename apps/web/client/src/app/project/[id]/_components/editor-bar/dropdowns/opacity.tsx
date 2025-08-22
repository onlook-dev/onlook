'use client';

import { useEditorEngine } from "@/components/store/editor";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@onlook/ui/dropdown-menu";
import { Input } from "@onlook/ui/input";
import { observer } from "mobx-react-lite";
import { useEffect, useRef, useState } from "react";
import { useDropdownControl } from "../hooks/use-dropdown-manager";
import { HoverOnlyTooltip } from "../hover-tooltip";
import { ToolbarButton } from "../toolbar-button";

const OPACITY_PRESETS = [100, 80, 75, 50, 25, 10, 0];

const useOpacityControl = () => {
    const editorEngine = useEditorEngine();
    const [opacity, setOpacity] = useState(100);

    // Update local state when selected element changes
    useEffect(() => {
        const selectedElements = editorEngine.elements.selected;
        if (selectedElements.length > 0 && selectedElements[0]) {
            const element = selectedElements[0];
            const currentOpacity = element.styles?.defined?.opacity;
            // Convert opacity from decimal to percentage (e.g., 0.5 -> 50)
            const opacityPercentage = (currentOpacity !== undefined && currentOpacity !== null) ? Math.round(parseFloat(currentOpacity) * 100) : 100;
            setOpacity(opacityPercentage);
        } else {
            setOpacity(100);
        }
    }, [editorEngine.elements.selected]);

    const handleOpacityChange = (value: number) => {
        setOpacity(value);
        // Convert percentage to decimal (e.g., 50 -> 0.5)
        const opacityDecimal = value / 100;
        const action = editorEngine.style.getUpdateStyleAction({ opacity: opacityDecimal.toString() });
        void editorEngine.action.updateStyle(action);
    };

    return { opacity, handleOpacityChange };
};

export const Opacity = observer(() => {
    const { opacity, handleOpacityChange } = useOpacityControl();
    const inputRef = useRef<HTMLInputElement>(null);

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'opacity-dropdown'
    });

    const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = parseInt(e.target.value, 10);
        if (isNaN(value)) value = 0;
        if (value > 100) value = 100;
        if (value < 0) value = 0;
        handleOpacityChange(value);
    };

    const handleInputAreaClick = () => {
        onOpenChange(true);
        inputRef.current?.focus();
    };

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip content="Layer Opacity" side="bottom" className="mt-1" hideArrow disabled={isOpen}>
                <DropdownMenuTrigger asChild>
                    <ToolbarButton
                        isOpen={isOpen}
                        className="group flex items-center gap-1"
                        onClick={handleInputAreaClick}
                    >
                        <Input
                            ref={inputRef}
                            type="number"
                            min={0}
                            max={100}
                            data-state={isOpen ? 'open' : 'closed'}
                            value={opacity}
                            onChange={onInputChange}
                            onClick={(e) => e.stopPropagation()}
                            className="px-1 w-8 text-left data-[state=open]:text-white text-small focus:text-foreground-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none !bg-transparent border-none group-hover:text-foreground-primary focus:ring-0 focus:outline-none text-muted-foreground !hide-spin-buttons no-focus-ring [appearance:textfield] group-hover:text-foreground-primary transition-colors duration-150 hover"
                            aria-label="Opacity percentage"
                        />
                        <span
                            onClick={(e) => e.stopPropagation()}
                            className="pr-2 text-muted-foreground text-xs bg-transparent">
                            %
                        </span>
                    </ToolbarButton>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent align="center" className="mt-1 w-[70px] min-w-[40px] rounded-lg p-1 text-foreground-tertiary">
                {OPACITY_PRESETS.map((preset) => (
                    <DropdownMenuItem
                        key={preset}
                        onClick={() => handleOpacityChange(preset)}
                        className={`cursor-pointer text-left text-foreground-tertiary data-[highlighted]:bg-background-tertiary/10 border-border/0 data-[highlighted]:border-border justify-center rounded-md border px-2 py-1 text-small data-[highlighted]:text-foreground-primary ${preset === opacity
                            ? 'bg-transparent border-border border text-foreground-primary hover:bg-background-primary'
                            : ''
                            }`}
                    >
                        {preset}%
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
