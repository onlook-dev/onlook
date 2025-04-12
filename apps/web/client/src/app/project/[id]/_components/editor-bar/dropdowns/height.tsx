"use client";

import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";
import { InputDropdown } from "../inputs/input-dropdown";

export const Height = () => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                >
                    <Icons.Height className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="text-sm">Hug</span>
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
    );
};
