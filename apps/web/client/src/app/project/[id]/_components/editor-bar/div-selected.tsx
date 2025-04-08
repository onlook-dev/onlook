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
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border min-w-[105px] max-w-[105px] px-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                    >
                        <div className="flex items-center gap-2">
                            <Icons.Layout className="h-4 w-4 min-h-4 min-w-4" />
                            <span className="text-sm">Flex</span>
                        </div>
                        <Icons.ChevronDown className="h-4 w-4 min-h-4 min-w-4 opacity-50" />
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

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border min-w-[105px] max-w-[105px] px-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                    >
                        <div className="flex items-center gap-2">
                            <Icons.Width className="h-4 w-4 min-h-4 min-w-4" />
                            <span className="text-sm">280</span>
                        </div>
                        
                        <Icons.ChevronDown className="h-4 w-4 min-h-4 min-w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px] mt-1 p-3 rounded-lg space-y-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-white">Width</span>
                            <InputDropdown 
                                value="250"
                                dropdownValue="Hug"
                                dropdownOptions={["Hug", "Fixed"]}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Min</span>
                            <InputDropdown 
                                value="--"
                                dropdownValue="Fixed"
                                dropdownOptions={["Fixed"]}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Max</span>
                            <InputDropdown 
                                value="--"
                                dropdownValue="Fixed"
                                dropdownOptions={["Fixed"]}
                            />
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-[1px] bg-border" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border min-w-[105px] max-w-[105px] px-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                    >
                        <div className="flex items-center gap-2">
                            <Icons.Height className="h-4 w-4 min-h-4 min-w-4" />
                            <span className="text-sm">Hug</span>
                        </div>
                        <Icons.ChevronDown className="h-4 w-4 min-h-4 min-w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px] mt-1 p-3 rounded-lg space-y-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-white">Height</span>
                            <InputDropdown 
                                value="250"
                                dropdownValue="Hug"
                                dropdownOptions={["Hug", "Fixed"]}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Min</span>
                            <InputDropdown 
                                value="--"
                                dropdownValue="Fixed"
                                dropdownOptions={["Fixed"]}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Max</span>
                            <InputDropdown 
                                value="--"
                                dropdownValue="Fixed"
                                dropdownOptions={["Fixed"]}
                            />
                        </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-[1px] bg-border" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border min-w-[105px] max-w-[105px] px-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                    >
                        <div className="flex items-center gap-2">
                            <Icons.Padding className="h-4 w-4 min-h-4 min-w-4" />
                            <span className="text-sm">Mixed</span>
                        </div>
                        <Icons.ChevronDown className="h-4 w-4 min-h-4 min-w-4 opacity-50" />
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
                        <div className="flex items-center gap-2">
                            <Icons.Padding className="h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
                            <div className="flex items-center bg-background-tertiary/50 rounded-md px-3 py-1.5 flex-1">
                                <input 
                                    type="text" 
                                    value="12px"
                                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <InputIcon icon="LeftSide" value="12px" />
                            <InputIcon icon="TopSide" value="18px" />
                            <InputIcon icon="RightSide" value="12px" />
                            <InputIcon icon="BottomSide" value="18px" />
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-[1px] bg-border" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border min-w-[105px] max-w-[105px] px-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                    >
                        <div className="flex items-center gap-2">
                            <Icons.Margin className="h-4 w-4 min-h-4 min-w-4" />
                            <span className="text-sm">24px</span>
                        </div>
                        <Icons.ChevronDown className="h-4 w-4 min-h-4 min-w-4 opacity-50" />
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
                        <div className="flex items-center gap-2">
                            <Icons.Padding className="h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
                            <div className="flex items-center bg-background-tertiary/50 rounded-md px-3 py-1.5 flex-1">
                                <input 
                                    type="text" 
                                    value="12px"
                                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <InputIcon icon="LeftSide" value="12px" />
                            <InputIcon icon="TopSide" value="18px" />
                            <InputIcon icon="RightSide" value="12px" />
                            <InputIcon icon="BottomSide" value="18px" />
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-[1px] bg-border" />

    
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border min-w-[105px] max-w-[105px] px-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                    >
                        <div className="flex items-center gap-2">
                            <Icons.CornerRadius className="h-4 w-4 min-h-4 min-w-4" />
                            <span className="text-sm">8px</span>
                        </div>
                        <Icons.ChevronDown className="h-4 w-4 min-h-4 min-w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px] mt-1 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <button 
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors ${
                                activeTab === 'all' 
                                    ? 'text-white bg-background-tertiary/20' 
                                    : 'text-muted-foreground hover:bg-background-tertiary/10'
                            }`}
                        >
                            All sides
                        </button>
                        <button 
                            onClick={() => setActiveTab('individual')}
                            className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors ${
                                activeTab === 'individual' 
                                    ? 'text-white bg-background-tertiary/20' 
                                    : 'text-muted-foreground hover:bg-background-tertiary/10'
                            }`}
                        >
                            Individual
                        </button>
                    </div>
                    {activeTab === 'all' ? (
                        <div className="flex items-center gap-2">
                            <Icons.CornerRadius className="h-4 w-4 min-h-4 min-w-4 text-muted-foreground" />
                            <div className="flex items-center bg-background-tertiary/50 rounded-md px-3 py-1.5 flex-1">
                                <input 
                                    type="text" 
                                    value="12px"
                                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            <InputIcon icon="CornerRadius" value="12px" />
                            <InputIcon icon="CornerTopRight" value="18px" />
                            <InputIcon icon="CornerBottomLeft" value="12px" />
                            <InputIcon icon="CornerBottomRight" value="18px" />
                        </div>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-[1px] bg-border" />

            <Button
                variant="ghost"
                className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border px-3"
            >
                <div className="flex items-center gap-2">
                    <Icons.BorderEdit className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="text-sm">1px</span>
                </div>
            </Button>
        </div>
    );
};
