'use client';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { observer } from "mobx-react-lite";
import { useMemo, useState } from "react";
import { useBoxControl } from "../hooks/use-box-control";
import { useDropdownControl } from "../hooks/use-dropdown-manager";
import { HoverOnlyTooltip } from "../hover-tooltip";
import { InputRange } from "../inputs/input-range";
import { SpacingInputs } from "../inputs/spacing-inputs";
import { ToolbarButton } from "../toolbar-button";

export enum PaddingTab {
    ALL = "all",
    INDIVIDUAL = "individual"
}

export const SIDE_ORDER = ['top', 'right', 'bottom', 'left'] as const; // !!!! DO NOT CHANGE THE ORDER !!!!

const PADDING_ICON_MAP: Record<string, typeof Icons.PaddingEmpty> = {
    'TRBL': Icons.PaddingFull,
    'TRB': Icons.PaddingTRB,
    'TRL': Icons.PaddingTRL,
    'TBL': Icons.PaddingTBL,
    'RBL': Icons.PaddingRBL,
    'TR': Icons.PaddingTR,
    'TB': Icons.PaddingTB,
    'TL': Icons.PaddingTL,
    'RB': Icons.PaddingRB,
    'RL': Icons.PaddingRL,
    'BL': Icons.PaddingBL,
    'T': Icons.PaddingTop,
    'R': Icons.PaddingRight,
    'B': Icons.PaddingBottom,
    'L': Icons.PaddingLeft,
};

export const Padding = observer(() => {
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange } = useBoxControl('padding');

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'padding-dropdown'
    });

    const areAllPaddingsEqual = useMemo((): boolean => {
        const paddings = {
            top: boxState.paddingTop.num ?? 0,
            right: boxState.paddingRight.num ?? 0,
            bottom: boxState.paddingBottom.num ?? 0,
            left: boxState.paddingLeft.num ?? 0,
        };

        const values = Object.values(paddings);

        return values.every(val => val === values[0]);
    }, [boxState.paddingTop.num, boxState.paddingRight.num, boxState.paddingBottom.num, boxState.paddingLeft.num]);

    const [activeTab, setActiveTab] = useState<PaddingTab>(areAllPaddingsEqual ? PaddingTab.ALL : PaddingTab.INDIVIDUAL);

    const getPaddingIcon = () => {
        const paddings = {
            top: boxState.paddingTop.num ?? 0,
            right: boxState.paddingRight.num ?? 0,
            bottom: boxState.paddingBottom.num ?? 0,
            left: boxState.paddingLeft.num ?? 0,
        };

        const values = Object.values(paddings);
        const nonZeroValues = values.filter(val => val > 0);

        // All zero
        if (nonZeroValues.length === 0) {
            return Icons.PaddingEmpty;
        }

        // All same non-zero values
        const allSame = nonZeroValues.length === 4 &&
            nonZeroValues.every(val => val === nonZeroValues[0]) &&
            nonZeroValues[0] !== 0;
        if (allSame) {
            return Icons.PaddingFull;
        }

        // Create a pattern string for active sides in consistent order (T-R-B-L)
        const activeSides = SIDE_ORDER
            .filter(side => paddings[side] > 0)
            .map(side => side.charAt(0).toUpperCase())
            .join('');


        return PADDING_ICON_MAP[activeSides] ?? Icons.PaddingEmpty;
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

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip content="Padding" side="bottom">
                <DropdownMenuTrigger asChild>
                    <ToolbarButton
                        isOpen={isOpen}
                        className="gap-1 flex items-center min-w-9"
                    >
                        <PaddingIcon className="h-4 min-h-4 w-4 min-w-4" />
                        {paddingValue && (
                            <span className="text-small data-[state=open]:text-white">{paddingValue}</span>
                        )}
                    </ToolbarButton>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent align="start" className="w-[280px] mt-1 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                    <button
                        onClick={() => setActiveTab(PaddingTab.ALL)}
                        className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === PaddingTab.ALL
                            ? 'text-foreground-primary bg-background-active/50'
                            : 'text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover'
                            }`}
                    >
                        {areAllPaddingsEqual ? "All sides" : "Mixed"}
                    </button>
                    <button
                        onClick={() => setActiveTab(PaddingTab.INDIVIDUAL)}
                        className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === PaddingTab.INDIVIDUAL
                            ? 'text-foreground-primary bg-background-active/50'
                            : 'text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover'
                            }`}
                    >
                        Individual
                    </button>
                </div>
                {activeTab === PaddingTab.ALL ? (
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
