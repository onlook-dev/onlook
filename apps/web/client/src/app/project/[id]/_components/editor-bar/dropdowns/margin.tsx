'use client';

import { useEditorEngine } from "@/components/store/editor";
import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { cn } from "@onlook/ui/utils";
import { observer } from "mobx-react-lite";
import { useCallback, useMemo, useState } from "react";
import { useBoxControl } from "../hooks/use-box-control";
import { useDropdownControl } from "../hooks/use-dropdown-manager";
import { HoverOnlyTooltip } from "../hover-tooltip";
import { InputRange } from "../inputs/input-range";
import { SpacingInputs } from "../inputs/spacing-inputs";
import { ToolbarButton } from "../toolbar-button";


export enum MarginTab {
    ALL = "all",
    INDIVIDUAL = "individual"
}

export enum MarginSide {
    TOP = 'top',
    RIGHT = 'right',
    BOTTOM = 'bottom',
    LEFT = 'left',
    AUTO = 'auto',
}

const SIDE_ORDER = ['top', 'right', 'bottom', 'left'] as const; // !!!! DO NOT CHANGE THE ORDER !!!!

const MARGIN_ICON_MAP: Record<string, typeof Icons.MarginEmpty> = {
    'TRBL': Icons.MarginFull,
    'TRB': Icons.MarginTRB,
    'TRL': Icons.MarginTRL,
    'TBL': Icons.MarginBLT,
    'RBL': Icons.MarginRBL,
    'TR': Icons.MarginTR,
    'TB': Icons.MarginTB,
    'TL': Icons.MarginTL,
    'RB': Icons.MarginRB,
    'RL': Icons.MarginRL,
    'BL': Icons.MarginBL,
    'T': Icons.MarginT,
    'R': Icons.MarginR,
    'B': Icons.MarginB,
    'L': Icons.MarginL,
};

export const Margin = observer(() => {
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange } = useBoxControl('margin');
    const editorEngine = useEditorEngine();
    
    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'margin-dropdown'
    });
    
    
    const areAllMarginsEqual = useMemo((): boolean => {
        const margins = {
            top: boxState.marginTop.num ?? 0,
            right: boxState.marginRight.num ?? 0,
            bottom: boxState.marginBottom.num ?? 0,
            left: boxState.marginLeft.num ?? 0,
        };
        
        const values = Object.values(margins);
        
        return values.every(val => val === values[0]);
    }, [boxState.marginTop.num, boxState.marginRight.num, boxState.marginBottom.num, boxState.marginLeft.num]);
    
    const [activeTab, setActiveTab] = useState<MarginTab>(areAllMarginsEqual ? MarginTab.ALL : MarginTab.INDIVIDUAL);

    const getMarginIcon = () => {
        const margins = {
            top: boxState.marginTop.num ?? 0,
            right: boxState.marginRight.num ?? 0,
            bottom: boxState.marginBottom.num ?? 0,
            left: boxState.marginLeft.num ?? 0,
        };

        const values = Object.values(margins);
        const nonZeroValues = values.filter(val => val > 0);
        
        if (nonZeroValues.length === 0) {
            return Icons.MarginEmpty;
        }

        const allSame = nonZeroValues.length === 4 && 
                        nonZeroValues.every(val => val === nonZeroValues[0]);
        if (allSame) {
            return Icons.MarginFull;
        }

        // Create a pattern string for active sides in consistent order (T-R-B-L)
        const activeSides = SIDE_ORDER
            .filter(side => margins[side] > 0)
            .map(side => side.charAt(0).toUpperCase())
            .join('');


        return MARGIN_ICON_MAP[activeSides] ?? Icons.MarginEmpty;
    };

    const getMarginDisplay = () => {
        const top = boxState.marginTop.num ?? 0;
        const right = boxState.marginRight.num ?? 0;
        const bottom = boxState.marginBottom.num ?? 0;
        const left = boxState.marginLeft.num ?? 0;

        // If all are zero, return null
        if (top === 0 && right === 0 && bottom === 0 && left === 0) {
            return null;
        }

        const definedStyles = editorEngine.style.selectedStyle?.styles.defined;

        // Get all non-zero values
        const nonZeroValues = [top, right, bottom, left].filter(val => val !== 0);

        const isAuto =
            ['margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin']
                .some(key => definedStyles?.[key] === 'auto');

        if (isAuto && top == bottom && left == right) {
            return 'auto';
        }

        // If all non-zero values are the same
        if (nonZeroValues.length > 0 && nonZeroValues.every(val => val === nonZeroValues[0])) {
            if (isAuto) {
                return 'auto';
            }

            return boxState.margin.unit === 'px' ? `${nonZeroValues[0]}` : `${boxState.margin.value}`;
        }

        // If values are different
        return 'Mixed';
    };

    const MarginIcon = getMarginIcon();
    const marginValue = getMarginDisplay();

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip content="Margin" side="bottom" className="mt-1" hideArrow disabled={isOpen}>
                <DropdownMenuTrigger asChild>
                    <ToolbarButton
                        isOpen={isOpen}
                        className="gap-1 flex items-center min-w-9"
                    >
                        <MarginIcon className="h-4 min-h-4 w-4 min-w-4" />
                        {marginValue && (
                            <span className="text-small data-[state=open]:text-white">{marginValue}</span>
                        )}
                    </ToolbarButton>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent
                align="start"
                className="mt-1 w-[280px] rounded-lg p-3"
            >
                <div className="mb-3 flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab(MarginTab.ALL)}
                        className={`flex-1 cursor-pointer rounded-md px-4 py-1.5 text-sm transition-colors ${activeTab === MarginTab.ALL
                            ? "bg-background-active/50 text-foreground-primary"
                            : "text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover"
                            }`}
                    >
                        {areAllMarginsEqual ? "All sides" : "Mixed"}
                    </button>
                    <button
                        onClick={() => setActiveTab(MarginTab.INDIVIDUAL)}
                        className={`flex-1 cursor-pointer rounded-md px-4 py-1.5 text-sm transition-colors ${activeTab === MarginTab.INDIVIDUAL
                            ? "bg-background-active/50 text-foreground-primary"
                            : "text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover"
                            }`}
                    >
                        Individual
                    </button>
                </div>
                {activeTab === MarginTab.ALL ? (
                    <InputRange
                        value={boxState.margin.num ?? 0}
                        onChange={(value) => handleBoxChange('margin', value.toString())}
                        unit={boxState.margin.unit}
                        onUnitChange={(unit) => handleUnitChange('margin', unit)}
                    />
                ) : (
                    <SpacingInputs
                        type="margin"
                        values={{
                            top: boxState.marginTop.num ?? 0,
                            right: boxState.marginRight.num ?? 0,
                            bottom: boxState.marginBottom.num ?? 0,
                            left: boxState.marginLeft.num ?? 0
                        }}
                        onChange={handleIndividualChange}
                    />
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
