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
import { ImageBackground } from "./dropdowns/img-background";
import { ColorBackground } from "./dropdowns/color-background";
import { Border } from "./dropdowns/border";

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

            <Border />

            <div className="h-6 w-[1px] bg-border" />

            <ColorBackground />

            <div className="h-6 w-[1px] bg-border" />

            <ImageBackground />

        </div>
    );
};
