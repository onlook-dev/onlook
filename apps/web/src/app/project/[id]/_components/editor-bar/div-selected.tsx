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

            <div className="h-6 w-[1px] bg-border" />

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border min-w-[90px] max-w-[90px] px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
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
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border min-w-[90px] max-w-[90px] px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                    >
                        <span className="text-sm">280</span>
                        <Icons.ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px] mt-2 p-3 rounded-lg space-y-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[15px] text-white">Width</span>
                            <div className="flex items-center">
                                <div className="flex items-center bg-background-tertiary/50 justify-between rounded-l-md px-3 py-1.5 w-[80px]">
                                    <input 
                                        type="text" 
                                        value="250" 
                                        className="w-[40px] bg-transparent text-[15px] text-white focus:outline-none text-left"
                                    />
                                    <span className="text-[12px] text-muted-foreground">PX</span>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="h-[34px] bg-background-tertiary/50 hover:bg-background-tertiary/80 rounded-l-none rounded-r-md ml-[1px] px-3 flex items-center justify-between w-[80px] cursor-pointer"
                                        >
                                            <span className="text-[15px] text-muted-foreground">Hug</span>
                                            <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="min-w-[100px] -mt-[1px] p-1 rounded-lg">
                                        <DropdownMenuItem 
                                            className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                                        >
                                            Hug
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[15px] text-white">Min</span>
                            <div className="flex items-center">
                                <div className="flex items-center justify-between bg-background-tertiary/50 rounded-l-md px-3 py-1.5 w-[80px]">
                                    <span className="text-[15px] text-muted-foreground text-left">--</span>
                                    <span className="text-[15px] text-muted-foreground">-</span>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="h-[34px] bg-background-tertiary/50 hover:bg-background-tertiary/80 rounded-l-none rounded-r-md ml-[1px] px-3 flex items-center justify-between w-[80px] cursor-pointer"
                                        >
                                            <span className="text-[15px] text-muted-foreground">Fixed</span>
                                            <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="min-w-[100px] -mt-[1px] p-1 rounded-lg">
                                        <DropdownMenuItem 
                                            className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                                        >
                                            Fixed
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[15px] text-white">Max</span>
                            <div className="flex items-center">
                                <div className="flex items-center justify-between bg-background-tertiary/50 rounded-l-md px-3 py-1.5 w-[80px]">
                                    <span className="text-[15px] text-muted-foreground text-left">--</span>
                                    <span className="text-[15px] text-muted-foreground">-</span>
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="h-[34px] bg-background-tertiary/50 hover:bg-background-tertiary/80 rounded-l-none rounded-r-md ml-[1px] px-3 flex items-center justify-between w-[80px] cursor-pointer"
                                        >
                                            <span className="text-[15px] text-muted-foreground">Fixed</span>
                                            <Icons.ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="min-w-[100px] -mt-[1px] p-1 rounded-lg">
                                        <DropdownMenuItem 
                                            className="flex items-center px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white"
                                        >
                                            Fixed
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
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
                        className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border min-w-[90px] max-w-[90px] px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
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
                className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border min-w-[90px] max-w-[90px] px-3"
            >
                <span className="text-sm">Mixed</span>
            </Button>

            <div className="h-6 w-[1px] bg-border" />

            <Button
                variant="ghost"
                className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border min-w-[90px] max-w-[90px] px-3"
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
