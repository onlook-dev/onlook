'use client';

import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@onlook/ui/tooltip";
import { useState } from "react";
import { useBoxControl } from "../hooks/use-box-control";
import { InputRange } from "../inputs/input-range";
import { SpacingInputs } from "../inputs/spacing-inputs";

export const Margin = () => {
    const [activeTab, setActiveTab] = useState("individual");
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange } = useBoxControl('margin');

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex cursor-pointer items-center gap-2 rounded-lg border px-1.5 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                        >
                            <Icons.Margin className="h-4 min-h-4 w-4 min-w-4" />
                            <span className="text-sm">
                                {boxState.margin.unit === 'px'
                                    ? boxState.margin.num ?? '--'
                                    : boxState.margin.value}
                            </span>
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    Margin
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent
                align="start"
                className="mt-1 w-[280px] rounded-lg p-3"
            >
                <div className="mb-3 flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab("all")}
                        className={`flex-1 cursor-pointer rounded-md px-4 py-1.5 text-sm transition-colors ${activeTab === "all"
                                ? "bg-background-tertiary/20 text-white"
                                : "text-muted-foreground hover:bg-background-tertiary/10"
                            }`}
                    >
                        All sides
                    </button>
                    <button
                        onClick={() => setActiveTab("individual")}
                        className={`flex-1 cursor-pointer rounded-md px-4 py-1.5 text-sm transition-colors ${activeTab === "individual"
                                ? "bg-background-tertiary/20 text-white"
                                : "text-muted-foreground hover:bg-background-tertiary/10"
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
};
