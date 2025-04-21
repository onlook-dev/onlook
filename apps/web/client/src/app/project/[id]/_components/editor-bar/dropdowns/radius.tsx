"use client";

import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { useState } from "react";
import { InputRange } from "../inputs/input-range";
import { SpacingInputs } from "../inputs/spacing-inputs";
import { useBoxControl } from "../hooks/use-box-control";

export const Radius = () => {
    const [activeTab, setActiveTab] = useState('individual');
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange } = useBoxControl('radius');

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="text-muted-foreground border-border/0 hover:bg-background-tertiary/20 hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:border-border flex cursor-pointer items-center gap-2 rounded-lg border px-3 hover:border hover:text-white focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none active:border-0 data-[state=open]:border data-[state=open]:text-white"
                >
                    <Icons.CornerRadius className="h-4 min-h-4 w-4 min-w-4" />
                    <span className="text-sm">{boxState.radius.value}</span>
                </Button>
            </DropdownMenuTrigger>
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
                        value={boxState.radius.num ?? 0}
                        onChange={(value) => handleBoxChange('radius', value.toString())}
                        unit={boxState.radius.unit}
                        onUnitChange={(unit) => handleUnitChange('radius', unit)}
                    />
                ) : (
                    <SpacingInputs
                        type="radius"
                        values={{
                            topLeft: boxState.borderTopLeftRadius.num ?? 0,
                            topRight: boxState.borderTopRightRadius.num ?? 0,
                            bottomRight: boxState.borderBottomRightRadius.num ?? 0,
                            bottomLeft: boxState.borderBottomLeftRadius.num ?? 0
                        }}
                        onChange={handleIndividualChange}
                    />
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
