'use client';

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
import { ToolbarButton } from "../toolbar-button";

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

        // No radius on any corner
        if (!topLeft && !topRight && !bottomRight && !bottomLeft) {
            return Icons.RadiusEmpty;
        }

        // All corners have the same non-zero radius
        const allSame = topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft && topLeft;
        if (allSame) {
            return Icons.RadiusFull;
        }

        // All corners have some radius but values differ
        if (topLeft && topRight && bottomRight && bottomLeft) {
            return Icons.RadiusFull;
        }

        // Three corners
        if (!topLeft && topRight && bottomRight && bottomLeft) return Icons.RadiusTRBRBL;
        if (topLeft && !topRight && bottomRight && bottomLeft) return Icons.RadiusBRBLTL;
        if (topLeft && topRight && !bottomRight && bottomLeft) return Icons.RadiusTRBLTL;
        if (topLeft && topRight && bottomRight && !bottomLeft) return Icons.RadiusTRBRTL;

        // Two corners
        if (topRight && bottomRight && !topLeft && !bottomLeft) return Icons.RadiusTRBR;
        if (topRight && topLeft && !bottomRight && !bottomLeft) return Icons.RadiusTRTL;
        if (topLeft && bottomRight && !topRight && !bottomLeft) return Icons.RadiusBRTL;
        if (bottomRight && bottomLeft && !topLeft && !topRight) return Icons.RadiusBRBL;
        if (bottomLeft && topLeft && !topRight && !bottomRight) return Icons.RadiusBLTL;
        if (topRight && bottomLeft && !topLeft && !bottomRight) return Icons.RadiusTRBL;

        // Single corner
        if (topLeft) return Icons.RadiusTL;
        if (topRight) return Icons.RadiusTR;
        if (bottomRight) return Icons.RadiusBR;
        if (bottomLeft) return Icons.RadiusBL;

        return Icons.RadiusFull;
    };


    const getRadiusDisplay = () => {
        const topLeft = boxState.borderTopLeftRadius.num ?? 0;
        const topRight = boxState.borderTopRightRadius.num ?? 0;
        const bottomRight = boxState.borderBottomRightRadius.num ?? 0;
        const bottomLeft = boxState.borderBottomLeftRadius.num ?? 0;

        if (boxState.borderRadius.num === 9999) {
            return 'Full';
        }

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

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip content="Radius" side="bottom" className="mt-1" hideArrow disabled={isOpen}>
                <DropdownMenuTrigger asChild>
                    <ToolbarButton
                        isOpen={isOpen}
                        className="gap-1 flex items-center min-w-9"
                    >
                        <RadiusIcon className="h-4 min-h-4 w-4 min-w-4" />
                        {radiusValue && (
                            <span className="text-small data-[state=open]:text-white">{radiusValue}</span>
                        )}
                    </ToolbarButton>
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
