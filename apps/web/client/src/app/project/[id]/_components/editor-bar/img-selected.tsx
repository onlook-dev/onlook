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
import { useState } from "react";

export const ImgSelected = () => {
    const [activeTab, setActiveTab] = useState('individual');
    const [objectFit, setObjectFit] = useState('cover');

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
                        <Icons.Image className="h-4 w-4 min-h-4 min-w-4" />
                        <span className="text-sm">Object Fit</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[120px] mt-2 p-1 rounded-lg">
                    <div className="p-2 space-y-2">
                        <div className="space-y-1">
                            <span className="text-sm text-muted-foreground">Type</span>
                            <div className="flex gap-1">
                                <button 
                                    onClick={() => setObjectFit('cover')}
                                    className={`flex-1 text-sm px-3 py-1 rounded-md ${
                                        objectFit === 'cover' 
                                            ? 'bg-background-tertiary/20 text-white' 
                                            : 'text-muted-foreground hover:bg-background-tertiary/10'
                                    }`}
                                >
                                    Cover
                                </button>
                                <button 
                                    onClick={() => setObjectFit('contain')}
                                    className={`flex-1 text-sm px-3 py-1 rounded-md ${
                                        objectFit === 'contain' 
                                            ? 'bg-background-tertiary/20 text-white' 
                                            : 'text-muted-foreground hover:bg-background-tertiary/10'
                                    }`}
                                >
                                    Contain
                                </button>
                                <button 
                                    onClick={() => setObjectFit('fill')}
                                    className={`flex-1 text-sm px-3 py-1 rounded-md ${
                                        objectFit === 'fill' 
                                            ? 'bg-background-tertiary/20 text-white' 
                                            : 'text-muted-foreground hover:bg-background-tertiary/10'
                                    }`}
                                >
                                    Fill
                                </button>
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
                        className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                    >
                        <Icons.Width className="h-4 w-4 min-h-4 min-w-4" />
                        <span className="text-sm">280</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px] mt-1 p-3 rounded-lg space-y-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-white">Width</span>
                            <InputDropdown 
                                value="250"
                                dropdownValue="Fixed"
                                dropdownOptions={["Fixed", "Auto"]}
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
                        className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                    >
                        <Icons.Height className="h-4 w-4 min-h-4 min-w-4" />
                        <span className="text-sm">Auto</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px] mt-1 p-3 rounded-lg space-y-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-white">Height</span>
                            <InputDropdown 
                                value="250"
                                dropdownValue="Auto"
                                dropdownOptions={["Fixed", "Auto"]}
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

            <Button
                variant="ghost"
                className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border px-3"
                onClick={() => {
                    // Handle image upload
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.click();
                    input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                            // Handle file upload
                            console.log('File selected:', file);
                        }
                    };
                }}
            >
                <Icons.Upload className="h-4 w-4 min-h-4 min-w-4" />
                <span className="text-sm">Replace</span>
            </Button>
        </div>
    );
};
