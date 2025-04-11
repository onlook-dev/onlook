"use client";

import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";
import { useState } from "react";
import { InputRadio } from "../inputs/input-radio";
import { InputIcon } from "../inputs/input-icon";

export const Display = () => {
    const [layoutType, setLayoutType] = useState<"--" | "Flex" | "Grid">("Flex");
    const [direction, setDirection] = useState<"vertical" | "horizontal">("horizontal");
    const [verticalAlign, setVerticalAlign] = useState<"top" | "center" | "bottom" | "space-between">("center");
    const [horizontalAlign, setHorizontalAlign] = useState<"left" | "center" | "right" | "space-between">("center");
    const [gap, setGap] = useState("12");

    const typeOptions = [
        { value: "--", label: "--" },
        { value: "Flex", label: "Flex" },
        { value: "Grid", label: "Grid" },
    ];

    const directionOptions = [
        { value: "vertical", icon: <Icons.ArrowDown className="h-4 w-4" /> },
        { value: "horizontal", icon: <Icons.ArrowRight className="h-4 w-4" /> },
    ];

    const verticalOptions = [
        { value: "top", icon: <Icons.AlignTop className="h-4 w-4" /> },
        { value: "center", icon: <Icons.AlignCenterVertically className="h-4 w-4" /> },
        { value: "bottom", icon: <Icons.AlignBottom className="h-4 w-4" /> },
        { value: "space-between", icon: <Icons.SpaceBetweenVertically className="h-4 w-4" /> },
    ];

    const horizontalOptions = [
        { value: "left", icon: <Icons.AlignLeft className="h-4 w-4" /> },
        { value: "center", icon: <Icons.AlignCenterHorizontally className="h-4 w-4" /> },
        { value: "right", icon: <Icons.AlignRight className="h-4 w-4" /> },
        { value: "space-between", icon: <Icons.SpaceBetweenHorizontally className="h-4 w-4" /> },
    ];

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
            <DropdownMenuContent align="start" className="min-w-[200px] mt-2 p-1.5 rounded-lg">
                <div className="p-2 space-y-2.5">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24">Type</span>
                        <InputRadio 
                            options={typeOptions} 
                            value={layoutType} 
                            onChange={(value) => setLayoutType(value as "--" | "Flex" | "Grid")}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24">Direction</span>
                        <InputRadio 
                            options={directionOptions} 
                            value={direction} 
                            onChange={(value) => setDirection(value as "vertical" | "horizontal")}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24">Vertical</span>
                        <InputRadio 
                            options={verticalOptions} 
                            value={verticalAlign} 
                            onChange={(value) => setVerticalAlign(value as "top" | "center" | "bottom" | "space-between")}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24">Horizontal</span>
                        <InputRadio 
                            options={horizontalOptions} 
                            value={horizontalAlign} 
                            onChange={(value) => setHorizontalAlign(value as "left" | "center" | "right" | "space-between")}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24">Gap</span>
                        <InputIcon value={18} />
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
