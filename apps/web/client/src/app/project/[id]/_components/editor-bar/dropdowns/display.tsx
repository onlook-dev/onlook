"use client";

import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";
import { useState } from "react";

export const Display = () => {
    const [layoutType, setLayoutType] = useState<"--" | "Flex" | "Grid">("Flex");
    const [direction, setDirection] = useState<"vertical" | "horizontal">("horizontal");
    const [verticalAlign, setVerticalAlign] = useState<"top" | "center" | "bottom" | "space-between">("center");
    const [horizontalAlign, setHorizontalAlign] = useState<"left" | "center" | "right" | "space-between">("center");
    const [gap, setGap] = useState("12");

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                >
                    <Icons.Layout className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="text-sm">{layoutType}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[200px] mt-2 p-1 rounded-lg">
                <div className="p-2 space-y-2">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-20">Type</span>
                        <div className="flex gap-1 flex-1">
                            <button 
                                className={`flex-1 text-sm px-1 py-1 rounded-md ${layoutType === "--" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setLayoutType("--")}
                            >
                                --
                            </button>
                            <button 
                                className={`flex-1 text-sm px-1 py-1 rounded-md ${layoutType === "Flex" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setLayoutType("Flex")}
                            >
                                Flex
                            </button>
                            <button 
                                className={`flex-1 text-sm px-1 py-1 rounded-md ${layoutType === "Grid" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setLayoutType("Grid")}
                            >
                                Grid
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-20">Direction</span>
                        <div className="flex gap-1 flex-1">
                            <button 
                                className={`flex-1 flex items-center justify-center text-sm p-1.5 rounded-md ${direction === "vertical" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setDirection("vertical")}
                            >
                                <Icons.ArrowDown className="h-4 w-4" />
                            </button>
                            <button 
                                className={`flex-1 flex items-center justify-center text-sm p-1.5 rounded-md ${direction === "horizontal" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setDirection("horizontal")}
                            >
                                <Icons.ArrowRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-20">Vertical</span>
                        <div className="flex gap-1 flex-1">
                            <button 
                                className={`flex-1 flex items-center justify-center text-sm p-1 py-2 rounded-md ${verticalAlign === "top" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setVerticalAlign("top")}
                            >
                                <Icons.AlignTop className="h-4 w-4" />
                            </button>
                            <button 
                                className={`flex-1 flex items-center justify-center text-sm p-1 py-2 rounded-md ${verticalAlign === "center" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setVerticalAlign("center")}
                            >
                                <Icons.AlignCenterVertically className="h-4 w-4" />
                            </button>
                            <button 
                                className={`flex-1 flex items-center justify-center text-sm p-1 py-2 rounded-md ${verticalAlign === "bottom" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setVerticalAlign("bottom")}
                            >
                                <Icons.AlignBottom className="h-4 w-4" />
                            </button>
                            <button 
                                className={`flex-1 flex items-center justify-center text-sm p-1 py-2 rounded-md ${verticalAlign === "space-between" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setVerticalAlign("space-between")}
                            >
                                <Icons.SpaceBetweenVertically className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-20">Horizontal</span>
                        <div className="flex gap-1 flex-1">
                            <button 
                                className={`flex-1 flex items-center justify-center text-sm p-1 py-2 rounded-md ${horizontalAlign === "left" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setHorizontalAlign("left")}
                            >
                                <Icons.AlignLeft className="h-4 w-4" />
                            </button>
                            <button 
                                className={`flex-1 flex items-center justify-center text-sm p-1 py-2 rounded-md ${horizontalAlign === "center" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setHorizontalAlign("center")}
                            >
                                <Icons.AlignCenterHorizontally className="h-4 w-4" />
                            </button>
                            <button 
                                className={`flex-1 flex items-center justify-center text-sm p-1 py-2 rounded-md ${horizontalAlign === "right" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setHorizontalAlign("right")}
                            >
                                <Icons.AlignRight className="h-4 w-4" />
                            </button>
                            <button 
                                className={`flex-1 flex items-center justify-center text-sm p-1 py-2 rounded-md ${horizontalAlign === "space-between" ? "bg-background-tertiary/20 text-white" : "text-muted-foreground hover:bg-background-tertiary/10"}`}
                                onClick={() => setHorizontalAlign("space-between")}
                            >
                                <Icons.SpaceBetweenHorizontally className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-20">Gap</span>
                        <div className="flex items-center bg-background-tertiary/50 rounded-md px-3 py-1.5 flex-1">
                            <input 
                                type="text" 
                                value={gap}
                                onChange={(e) => setGap(e.target.value)}
                                className="w-full bg-transparent text-sm text-white focus:outline-none"
                            />
                            <span className="text-sm text-muted-foreground">PX</span>
                        </div>
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
