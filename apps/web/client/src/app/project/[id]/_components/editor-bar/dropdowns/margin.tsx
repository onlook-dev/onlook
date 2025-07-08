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
import { useState } from "react";
import { useBoxControl } from "../hooks/use-box-control";
import { useDropdownControl } from "../hooks/use-dropdown-manager";
import { HoverOnlyTooltip } from "../hover-tooltip";
import { InputRange } from "../inputs/input-range";
import { SpacingInputs } from "../inputs/spacing-inputs";

export const Margin = observer(() => {
    const [activeTab, setActiveTab] = useState("all");
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange } = useBoxControl('margin');
    const editorEngine = useEditorEngine();

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'margin-dropdown'
    });
    const getMarginIcon = () => {
        const top = boxState.marginTop.num ?? 0;
        const right = boxState.marginRight.num ?? 0;
        const bottom = boxState.marginBottom.num ?? 0;
        const left = boxState.marginLeft.num ?? 0;

        if (top === 0 && right === 0 && bottom === 0 && left === 0) {
            return Icons.MarginEmpty;
        }

        const allSame = top === right && right === bottom && bottom === left && top !== 0;
        if (allSame) {
            return Icons.MarginFull;
        }

        if (top && right && bottom && left) return Icons.MarginFull;
        if (top && right && bottom) return Icons.MarginTRB;
        if (top && right && left) return Icons.MarginTRL;
        if (top && bottom && left) return Icons.MarginBLT;
        if (right && bottom && left) return Icons.MarginRBL;
        if (top && right) return Icons.MarginTR;
        if (top && bottom) return Icons.MarginTB;
        if (top && left) return Icons.MarginTL;
        if (right && bottom) return Icons.MarginRB;
        if (right && left) return Icons.MarginRL;
        if (bottom && left) return Icons.MarginBL;
        if (top) return Icons.MarginT;
        if (right) return Icons.MarginR;
        if (bottom) return Icons.MarginB;
        if (left) return Icons.MarginL;

        return Icons.MarginEmpty;
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
    const hasMargin = marginValue !== null;

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip content="Margin" side="bottom" className="mt-1" hideArrow disabled={isOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="toolbar"
                        className={cn(
                            "gap-1 flex cursor-pointer items-center border hover:border focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0",
                            hasMargin
                                ? "bg-background-tertiary/20 text-white border-border"
                                : "text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border hover:text-white",
                            "data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border data-[state=open]:text-white"
                        )}
                    >
                        <MarginIcon className="h-4 min-h-4 w-4 min-w-4" />
                        {marginValue && (
                            <span className="text-small text-white">{marginValue}</span>
                        )}



                    </Button>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent
                align="start"
                className="mt-1 w-[280px] rounded-lg p-3"
            >
                <div className="mb-3 flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab("all")}
                        className={`flex-1 cursor-pointer rounded-md px-4 py-1.5 text-sm transition-colors ${activeTab === "all"
                            ? "bg-background-active/50 text-foreground-primary"
                            : "text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover"
                            }`}
                    >
                        All sides
                    </button>
                    <button
                        onClick={() => setActiveTab("individual")}
                        className={`flex-1 cursor-pointer rounded-md px-4 py-1.5 text-sm transition-colors ${activeTab === "individual"
                            ? "bg-background-active/50 text-foreground-primary"
                            : "text-muted-foreground hover:bg-background-tertiary/20 hover:text-foreground-hover"
                            }`}
                    >
                        Individual
                    </button>
                </div>
                {activeTab === "all" ? (
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
