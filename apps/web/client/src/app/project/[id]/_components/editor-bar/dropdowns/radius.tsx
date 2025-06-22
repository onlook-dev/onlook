'use client';

import * as React from "react";
import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import { useBoxControl } from "../hooks/use-box-control";
import { useDropdownControl } from "../hooks/use-dropdown-manager";
import { HoverOnlyTooltip } from "../hover-tooltip";
import { InputRange } from "../inputs/input-range";
import { SpacingInputs } from "../inputs/spacing-inputs";

export const Radius = observer(() => {
    const [activeTab, setActiveTab] = useState('all');
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange } = useBoxControl('radius');

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'radius-dropdown'
    });
    const getRadiusIcon = () => {
    const topLeft = boxState.borderTopLeftRadius.num ?? 0;
    const topRight = boxState.borderTopRightRadius.num ?? 0;
    const bottomRight = boxState.borderBottomRightRadius.num ?? 0;
    const bottomLeft = boxState.borderBottomLeftRadius.num ?? 0;

    // All corners zero
    if (topLeft === 0 && topRight === 0 && bottomRight === 0 && bottomLeft === 0) {
        return Icons.RadiusEmpty;
    }

    // All corners same non-zero
    const allSame = topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft && topLeft !== 0;
    if (allSame) {
        return Icons.RadiusFull;
    }

    // One corner only
    if (topLeft !== 0 && topRight === 0 && bottomRight === 0 && bottomLeft === 0) {
        return Icons.RadiusTL;
    }
    if (topRight !== 0 && topLeft === 0 && bottomRight === 0 && bottomLeft === 0) {
        return Icons.RadiusTR;
    }
    if (bottomRight !== 0 && topLeft === 0 && topRight === 0 && bottomLeft === 0) {
        return Icons.RadiusBR;
    }
    if (bottomLeft !== 0 && topLeft === 0 && topRight === 0 && bottomRight === 0) {
        return Icons.RadiusBL;
    }

    // Two corners

    if (topRight !== 0 && bottomRight !== 0 && topLeft === 0 && bottomLeft === 0) {
        return Icons.RadiusTRBR;
    }
     if (topRight !== 0 && topLeft !== 0 && bottomRight === 0 && bottomLeft === 0) {
        return Icons.RadiusTRTL;
    }
     if (topLeft !== 0 && bottomRight !== 0 && bottomLeft === 0 && topRight === 0) {
        return Icons.RadiusBRTL;
    }
    if (bottomRight !== 0 && bottomLeft !== 0 && topLeft === 0 && topRight === 0) {
        return Icons.RadiusBRBL;
    }
    if (bottomLeft !== 0 && topLeft !== 0 && topRight === 0 && bottomRight === 0) {
        return Icons.RadiusBLTL;
    }
    if (topRight !== 0 && bottomLeft !== 0 && topLeft === 0 && bottomRight === 0) {
        return Icons.RadiusTRBL;
    }

    // Three corners (infer which one is zero)
    if (topLeft === 0 && topRight !== 0 && bottomRight !== 0 && bottomLeft !== 0) {
        return Icons.RadiusTRBRBL;
    }
    if (topRight === 0 && topLeft !== 0 && bottomRight !== 0 && bottomLeft !== 0) {
        return Icons.RadiusBRBLTL;
    }
    if (bottomRight === 0 && topLeft !== 0 && topRight !== 0 && bottomLeft !== 0) {
        return Icons.RadiusTRBLTL;
    }
    if (bottomLeft === 0 && topLeft !== 0 && topRight !== 0 && bottomRight !== 0) {
        return Icons.RadiusTRBRTL;
    }
 

    return Icons.RadiusFull;
};


    const getRadiusDisplay = () => {
        const topLeft = boxState.borderTopLeftRadius.num ?? 0;
        const topRight = boxState.borderTopRightRadius.num ?? 0;
        const bottomRight = boxState.borderBottomRightRadius.num ?? 0;
        const bottomLeft = boxState.borderBottomLeftRadius.num ?? 0;

        // If all are zero, return null
        if (topLeft === 0 && topRight === 0 && bottomRight === 0 && bottomLeft === 0) {
            return null;
        }

        // Get all non-zero values
        const nonZeroValues = [topLeft, topRight, bottomRight, bottomLeft].filter(val => val !== 0);
        
        // If all non-zero values are the same
        if (nonZeroValues.length > 0 && nonZeroValues.every(val => val === nonZeroValues[0])) {
            return boxState.borderRadius.unit === 'px' ? `${nonZeroValues[0]}` : `${boxState.borderRadius.value}`;
        }

        // If values are different
        return 'Mixed';
    };

    const RadiusIcon = getRadiusIcon();
    const radiusValue = getRadiusDisplay();
    const hasRadius = radiusValue !== null;

    

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
            <HoverOnlyTooltip content="Radius" side="bottom" className="mt-1" hideArrow disabled={isOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="toolbar"
                        className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border gap-1 flex cursor-pointer items-center border hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                    >
                         <RadiusIcon className="h-4 min-h-4 w-4 min-w-4" />
                        {radiusValue && (
                            <span className="text-small text-white">{radiusValue}</span>
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
                        value={boxState.borderRadius.num ?? 0}
                        onChange={(value) => handleBoxChange('borderRadius', value.toString())}
                        unit={boxState.borderRadius.unit}
                        onUnitChange={(unit) => handleUnitChange('borderRadius', unit)}
                    />
                ) : (
                    <SpacingInputs
                        type="radius"
                        values={{
                            topLeft: boxState.borderTopLeftRadius.num ?? 0,
                            topRight: boxState.borderTopRightRadius.num ?? 0,
                            bottomRight: boxState.borderBottomRightRadius.num ?? 0,
                            bottomLeft: boxState.borderBottomLeftRadius.num ?? 0,
                        }}
                        onChange={handleIndividualChange}
                    />
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
