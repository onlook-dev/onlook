"use client";

import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";
import { StateDropdown } from "./state-dropdown";
import { InputDropdown } from "./inputs/input-dropdown";
import { InputIcon } from "./inputs/input-icon";
import { InputRange } from "./inputs/input-range";
import { Width } from "./dropdowns/width";
import { Height } from "./dropdowns/height";
import { Padding } from "./dropdowns/padding";
import { Margin } from "./dropdowns/margin";
import { Radius } from "./dropdowns/radius";
import { useState } from "react";

export const DivSelected = () => {
    const [activeTab, setActiveTab] = useState('individual');

    return (
        <div className="flex items-center gap-1">
            <StateDropdown />

            <div className="h-6 w-[1px] bg-border" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                    >
                        <Icons.Layout className="h-4 w-4 min-h-4 min-w-4" />
                        <span className="text-sm">Flex</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[120px] mt-2 p-1 rounded-lg">
                    <div className="p-2 space-y-2">
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Type</span>
                            <div className="flex gap-1">
                                <button className="flex-1 text-sm px-3 py-1 rounded-md text-muted-foreground hover:bg-background-tertiary/10">--</button>
                                <button className="flex-1 text-sm px-3 py-1 rounded-md bg-background-tertiary/20 text-white">Flex</button>
                                <button className="flex-1 text-sm px-3 py-1 rounded-md text-muted-foreground hover:bg-background-tertiary/10">Grid</button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Direction</span>
                            <div className="flex gap-1">
                                <button className="flex-1 flex items-center justify-center text-sm p-1.5 rounded-md text-muted-foreground hover:bg-background-tertiary/10">
                                    <Icons.ArrowDown className="h-4 w-4" />
                                </button>
                                <button className="flex-1 flex items-center justify-center text-sm p-1.5 rounded-md bg-background-tertiary/20 text-white">
                                    <Icons.ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Vertical</span>
                            <div className="flex gap-1">
                                <button className="flex-1 flex items-center justify-center text-sm p-1.5 rounded-md text-muted-foreground hover:bg-background-tertiary/10">
                                    <Icons.AlignTop className="h-4 w-4" />
                                </button>
                                <button className="flex-1 flex items-center justify-center text-sm p-1.5 rounded-md bg-background-tertiary/20 text-white">
                                    <Icons.AlignCenterVertically className="h-4 w-4" />
                                </button>
                                <button className="flex-1 flex items-center justify-center text-sm p-1.5 rounded-md text-muted-foreground hover:bg-background-tertiary/10">
                                    <Icons.AlignBottom className="h-4 w-4" />
                                </button>
                                <button className="flex-1 flex items-center justify-center text-sm p-1.5 rounded-md text-muted-foreground hover:bg-background-tertiary/10">
                                    <Icons.SpaceBetweenVertically className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Horizontal</span>
                            <div className="flex gap-1">
                                <button className="flex-1 flex items-center justify-center text-sm p-1.5 rounded-md text-muted-foreground hover:bg-background-tertiary/10">
                                    <Icons.AlignLeft className="h-4 w-4" />
                                </button>
                                <button className="flex-1 flex items-center justify-center text-sm p-1.5 rounded-md bg-background-tertiary/20 text-white">
                                    <Icons.AlignCenterHorizontally className="h-4 w-4" />
                                </button>
                                <button className="flex-1 flex items-center justify-center text-sm p-1.5 rounded-md text-muted-foreground hover:bg-background-tertiary/10">
                                    <Icons.AlignRight className="h-4 w-4" />
                                </button>
                                <button className="flex-1 flex items-center justify-center text-sm p-1.5 rounded-md text-muted-foreground hover:bg-background-tertiary/10">
                                    <Icons.SpaceBetweenHorizontally className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Gap</span>
                            <div className="flex items-center bg-background-tertiary/50 rounded-md px-3 py-1.5">
                                <input 
                                    type="text" 
                                    value="12"
                                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                                />
                                <span className="text-sm text-muted-foreground">PX</span>
                            </div>
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-[1px] bg-border" />

            <Width />

            <div className="h-6 w-[1px] bg-border" />

            <Height />
       
            <div className="h-6 w-[1px] bg-border" />

            <Padding />

            <div className="h-6 w-[1px] bg-border" />

            <Margin />

            <div className="h-6 w-[1px] bg-border" />
    
            <Radius />

            <div className="h-6 w-[1px] bg-border" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button
                variant="ghost"
                className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border px-3"
            >
                <Icons.BorderEdit className="h-4 w-4 min-h-4 min-w-4" />
                <span className="text-sm">1px</span>
            </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px] mt-1 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <button 
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${
                                activeTab === 'all' 
                                    ? 'text-white bg-background-tertiary/20' 
                                    : 'text-muted-foreground hover:bg-background-tertiary/10'
                            }`}
                        >
                            All sides
                        </button>
                        <button 
                            onClick={() => setActiveTab('individual')}
                            className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${
                                activeTab === 'individual' 
                                    ? 'text-white bg-background-tertiary/20' 
                                    : 'text-muted-foreground hover:bg-background-tertiary/10'
                            }`}
                        >
                            Individual
                        </button>
                    </div>
                    {activeTab === 'all' ? (
                        <InputRange value={12} onChange={(value) => console.log(value)} />
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <InputIcon icon="LeftSide" value={12} />
                            <InputIcon icon="TopSide" value={18} />
                            <InputIcon icon="RightSide" value={12} />
                            <InputIcon icon="BottomSide" value={18} />
                        </div>
                    )}
                    <div className="mt-3">
                        <div className="flex items-center w-full">
                            <div className="flex-1 flex mr-[1px] items-center bg-background-tertiary/50 rounded-md px-3 py-1.5">
                                <input 
                                    type="text" 
                                    value="#080808"
                                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                                />
                            </div>
                            <div className="min-w-[70px] max-w-[70px] flex items-center bg-background-tertiary/50 rounded-md px-3 py-1.5">
                                <input 
                                    type="text" 
                                    value="100"
                                    className="w-full bg-transparent text-sm text-white focus:outline-none text-right"
                                />
                                <span className="text-sm text-muted-foreground ml-1">%</span>
                            </div>
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

        </div>
    );
};
