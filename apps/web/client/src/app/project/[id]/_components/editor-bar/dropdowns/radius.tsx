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

export const Radius = () => {
    const [activeTab, setActiveTab] = useState('individual');
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange } = useBoxControl('radius');

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex cursor-pointer items-center gap-2 rounded-lg border px-3 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                        >
                            <Icons.CornerRadius className="h-4 min-h-4 w-4 min-w-4" />
                            <span className="text-sm">{boxState.borderRadius.value}</span>
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    Border Radius
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-[280px] mt-1 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'all'
                            ? 'text-white bg-background-tertiary/20'
                            : 'text-muted-foreground hover:bg-background-tertiary/10'
                            }`}
                    >
                        All sides
                    </button>
                    <button
                        onClick={() => setActiveTab('individual')}
                        className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'individual'
                            ? 'text-white bg-background-tertiary/20'
                            : 'text-muted-foreground hover:bg-background-tertiary/10'
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
};
