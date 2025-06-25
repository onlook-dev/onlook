'use client';

import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { useState } from "react";
import { useBoxControl } from "../hooks/use-box-control";
import { useDropdownControl } from "../hooks/use-dropdown-manager";
import { HoverOnlyTooltip } from "../hover-tooltip";
import { InputRange } from "../inputs/input-range";
import { SpacingInputs } from "../inputs/spacing-inputs";
import { observer } from "mobx-react-lite";

export const Padding = observer(() => {
    const [activeTab, setActiveTab] = useState('all');
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange } = useBoxControl('padding');
    
    const { isOpen, onOpenChange } = useDropdownControl({ 
        id: 'padding-dropdown' 
    });
    const getPaddingIcon = () => {
        const top = boxState.paddingTop.num ?? 0;
        const right = boxState.paddingRight.num ?? 0;
        const bottom = boxState.paddingBottom.num ?? 0;
        const left = boxState.paddingLeft.num ?? 0;

        if (top === 0 && right === 0 && bottom === 0 && left === 0) {
            return Icons.PaddingEmpty;
        }
        
        const allSame = top === right && right === bottom && bottom === left && top !== 0;
        if (allSame) {
            return Icons.PaddingFull;
        }

        if (top && right && bottom && left) return Icons.PaddingFull;
        if (top && right && bottom) return Icons.PaddingTRB;
        if (top && right && left) return Icons.PaddingTRL;
        if (top && bottom && left) return Icons.PaddingTBL;
        if (right && bottom && left) return Icons.PaddingRBL;
        if (top && right) return Icons.PaddingTR;
        if (top && bottom) return Icons.PaddingTB;
        if (top && left) return Icons.PaddingTL;
        if (right && bottom) return Icons.PaddingRB;
        if (right && left) return Icons.PaddingRL;
        if (bottom && left) return Icons.PaddingBL;
        if (top) return Icons.PaddingTop;
        if (right) return Icons.PaddingRight;
        if (bottom) return Icons.PaddingBottom;
        if (left) return Icons.PaddingLeft;

        return Icons.PaddingEmpty;
    };

    const getPaddingDisplay = () => {
        const top = boxState.paddingTop.num ?? 0;
        const right = boxState.paddingRight.num ?? 0;
        const bottom = boxState.paddingBottom.num ?? 0;
        const left = boxState.paddingLeft.num ?? 0;

        // If all are zero, return null
        if (top === 0 && right === 0 && bottom === 0 && left === 0) {
            return null;
        }

        // Get all non-zero values
        const nonZeroValues = [top, right, bottom, left].filter(val => val !== 0);
        
        // If all non-zero values are the same
        if (nonZeroValues.length > 0 && nonZeroValues.every(val => val === nonZeroValues[0])) {
            return boxState.padding.unit === 'px' ? `${nonZeroValues[0]}` : `${boxState.padding.value}`;
        }

        // If values are different
        return 'Mixed';
    };

    const PaddingIcon = getPaddingIcon();
    const paddingValue = getPaddingDisplay();
    const hasPadding = paddingValue !== null;


    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
            <HoverOnlyTooltip content="Padding" side="bottom" className="mt-1" hideArrow disabled={isOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="toolbar"
                        className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border gap-1 flex cursor-pointer items-center border hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                    >
                        <PaddingIcon className="h-4 min-h-4 w-4 min-w-4" />
                        {paddingValue && (
                            <span className="text-small text-white">{paddingValue}</span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent align="start" className="w-[280px] mt-1 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'all'
                            ? 'text-foreground-primary bg-background-active/50'
                            : 'text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover'
                            }`}
                    >
                        All sides
                    </button>
                    <button
                        onClick={() => setActiveTab('individual')}
                        className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'individual'
                            ? 'text-foreground-primary bg-background-active/50'
                            : 'text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover'
                            }`}
                    >
                        Individual
                    </button>
                </div>
                {activeTab === 'all' ? (
                    <InputRange
                        value={boxState.padding.num ?? 0}
                        onChange={(value) => handleBoxChange('padding', value.toString())}
                        unit={boxState.padding.unit}
                        onUnitChange={(unit) => handleUnitChange('padding', unit)}
                    />
                ) : (
                    <SpacingInputs
                        type="padding"
                        values={{
                            top: boxState.paddingTop.num ?? 0,
                            right: boxState.paddingRight.num ?? 0,
                            bottom: boxState.paddingBottom.num ?? 0,
                            left: boxState.paddingLeft.num ?? 0,
                        }}
                        onChange={handleIndividualChange}
                    />
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
