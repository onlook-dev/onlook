"use client";

import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";

export const DivSelected = () => {
    return (
        <div className="flex items-center gap-1">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border min-w-[80px] px-3"
                    >
                        <span className="text-sm">State</span>
                        <Icons.ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[120px] mt-2 p-1 rounded-lg">
                    <DropdownMenuItem 
                        className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                    >
                        Default
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-[1px] bg-border" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border min-w-[80px] px-3"
                    >
                        <span className="text-sm">Flex</span>
                        <Icons.ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[120px] mt-2 p-1 rounded-lg">
                    <DropdownMenuItem 
                        className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                    >
                        Flex
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-[1px] bg-border" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border min-w-[80px] px-3"
                    >
                        <span className="text-sm">280</span>
                        <Icons.ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[120px] mt-2 p-1 rounded-lg">
                    <DropdownMenuItem 
                        className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                    >
                        280
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-[1px] bg-border" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border min-w-[80px] px-3"
                    >
                        <span className="text-sm">Hug</span>
                        <Icons.ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[120px] mt-2 p-1 rounded-lg">
                    <DropdownMenuItem 
                        className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                    >
                        Hug
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-6 w-[1px] bg-border" />

            <Button
                variant="ghost"
                className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border px-3"
            >
                <span className="text-sm">Mixed</span>
            </Button>

            <div className="h-6 w-[1px] bg-border" />

            <Button
                variant="ghost"
                className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border px-3"
            >
                <span className="text-sm">24px</span>
            </Button>

            <div className="h-6 w-[1px] bg-border" />

            <Button
                variant="ghost"
                className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border px-3"
            >
                <span className="text-sm">8px</span>
            </Button>

            <div className="h-6 w-[1px] bg-border" />

            <Button
                variant="ghost"
                className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border px-3"
            >
                <span className="text-sm">1px</span>
            </Button>
        </div>
    );
};
