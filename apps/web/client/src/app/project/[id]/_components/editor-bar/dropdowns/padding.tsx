"use client";

import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";
import { InputRange } from "../inputs/input-range";
import { InputIcon } from "../inputs/input-icon";
import { useState } from "react";

export const Padding = () => {
    const [activeTab, setActiveTab] = useState('individual');

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                >
                    <Icons.Padding className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="text-sm">Mixed</span>
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
