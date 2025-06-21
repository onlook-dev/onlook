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

export const Margin = observer(() => {
    const [activeTab, setActiveTab] = useState("all");
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange } = useBoxControl('margin');
    
    const { isOpen, onOpenChange } = useDropdownControl({ 
        id: 'margin-dropdown' 
    });

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
            <HoverOnlyTooltip content="Margin" side="bottom" className="mt-1" hideArrow disabled={isOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="toolbar"
                        className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border gap-1 flex cursor-pointer items-center border hover:border hover:text-white focus-visible:ring-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                    >
                        <Icons.Margin className="h-4 min-h-4 w-4 min-w-4" />
                        {boxState.margin.unit === 'px' && typeof boxState.margin.num === 'number' && boxState.margin.num !== 0 ? (
                            <span className="text-small">{boxState.margin.num}</span>
                        ) : null}
                        {boxState.margin.unit !== 'px' && boxState.margin.value ? (
                            <span className="text-small">{boxState.margin.value}</span>
                        ) : null}
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
