"use client";

import { Button } from "@onlook/ui-v4/button";
import { Icons } from "@onlook/ui-v4/icons";
import { ToggleGroup, ToggleGroupItem } from "@onlook/ui-v4/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@onlook/ui-v4/tooltip";
import { useState } from "react";
import { motion } from "motion/react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@onlook/ui-v4/dropdown-menu";

type EditorMode = "STATE" | "MEDIUM" | "TYPOGRAPHY" | "POSITION" | "TRANSFORMS";

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96];

export const EditorBar = () => {
    const [selectedFont, setSelectedFont] = useState("Creato Display");
    const [fontSize, setFontSize] = useState(18);

    const adjustFontSize = (amount: number) => {
        setFontSize(prev => Math.max(1, prev + amount));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col border-b-[0.5px] border-border p-1 px-1.5 bg-background backdrop-blur drop-shadow-xl"
            transition={{
                type: "spring",
                bounce: 0.1,
                duration: 0.4,
                stiffness: 200,
                damping: 25,
            }}
        >
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    className="flex items-center justify-between text-muted-foreground border border-border/0 hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border min-w-[120px] max-w-[120px] px-2"
                >
                    <span className="text-sm truncate">{selectedFont}</span>
                </Button>
                <div className="h-6 w-[1px] bg-border" />
                <Button
                    variant="ghost"
                    className="flex items-center justify-between gap-2 text-muted-foreground border border-border/0 hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border min-w-[120px] max-w-[120px] px-2"
                >
                    <span className="text-sm">Medium</span>
                    <Icons.ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
                <div className="h-6 w-[1px] bg-border" />
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => adjustFontSize(-1)}
                        className="border border-border/0 hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border text-muted-foreground h-8 w-9"
                    >
                        <Icons.Minus className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
           
                                <input
                                    type="number"
                                    value={fontSize}
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (!isNaN(value) && value > 0) {
                                            setFontSize(value);
                                        }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 min-w-[40px] max-w-[40px] text-center text-sm border border-border/0 text-muted-foreground rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border px-1 data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:bg-background-tertiary/20 focus:ring-1 focus:ring-border"
                                    />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="center"
                            className="w-[48px] min-w-[48px] mt-2 p-1 rounded-lg"
                        >
                            {FONT_SIZES.map((size) => (
                                <DropdownMenuItem
                                    key={size}
                                    onClick={() => setFontSize(size)}
                                    className={`text-sm justify-center px-2 py-1 rounded-md text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white ${
                                        size === fontSize ? "bg-background-tertiary/20 border border-border text-white" : ""
                                    }`}
                                >
                                    {size}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => adjustFontSize(1)}
                        className="border border-border/0 hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border text-muted-foreground h-8 w-9"
                    >
                        <Icons.Plus className="h-4 w-4" />
                    </Button>
                </div>
                <div className="h-6 w-[1px] bg-border" />
                <Button
                    variant="ghost"
                    size="icon"
                    className="border border-border/0 hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border text-muted-foreground h-8 w-9"
                >
                    <Icons.Text className="h-4 w-4" />
                </Button>
                <div className="h-6 w-[1px] bg-border" />
            </div>
        </motion.div>
    );
};
