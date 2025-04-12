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
import { StateDropdown } from "./state-dropdown";

type EditorMode = "STATE" | "MEDIUM" | "TYPOGRAPHY" | "POSITION" | "TRANSFORMS";

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72, 96];

export const TextSelected = () => {
    const [selectedFont, setSelectedFont] = useState("Creato Display");
    const [fontSize, setFontSize] = useState(18);
    const [fontWeight, setFontWeight] = useState<"Light" | "Normal" | "Medium" | "Bold" | "Extra Bold">("Medium");
    const [textAlign, setTextAlign] = useState<"left" | "center" | "right" | "justify">("left");

    const adjustFontSize = (amount: number) => {
        setFontSize(prev => Math.max(1, prev + amount));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col bg-background backdrop-blur drop-shadow-xl"
            transition={{
                type: "spring",
                bounce: 0.1,
                duration: 0.4,
                stiffness: 200,
                damping: 25,
            }}
        >
            <div className="flex items-center gap-1">
                <StateDropdown />
                <div className="h-6 w-[1px] bg-border" />
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                >
                    <span className="text-sm truncate">{selectedFont}</span>
                </Button>
                <div className="h-6 w-[1px] bg-border" />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                        >
                            <span className="text-sm">{fontWeight}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="min-w-[120px] mt-1 p-1 rounded-lg">
                        <DropdownMenuItem 
                            onClick={() => setFontWeight("Light")}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white ${
                                fontWeight === "Light" ? "bg-background-tertiary/20 border border-border text-white" : ""
                            }`}
                        >
                            Light
                            {fontWeight === "Light" && <Icons.Check className="h-4 w-4 ml-2" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => setFontWeight("Normal")}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white ${
                                fontWeight === "Normal" ? "bg-background-tertiary/20 border border-border text-white" : ""
                            }`}
                        >
                            Normal
                            {fontWeight === "Normal" && <Icons.Check className="h-4 w-4 ml-2" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => setFontWeight("Medium")}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white ${
                                fontWeight === "Medium" ? "bg-background-tertiary/20 border border-border text-white" : ""
                            }`}
                        >
                            Medium
                            {fontWeight === "Medium" && <Icons.Check className="h-4 w-4 ml-2" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => setFontWeight("Bold")}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white ${
                                fontWeight === "Bold" ? "bg-background-tertiary/20 border border-border text-white" : ""
                            }`}
                        >
                            Bold
                            {fontWeight === "Bold" && <Icons.Check className="h-4 w-4 ml-2" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => setFontWeight("Extra Bold")}
                            className={`flex items-center justify-between px-2 py-1.5 rounded-md text-muted-foreground text-sm data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white ${
                                fontWeight === "Extra Bold" ? "bg-background-tertiary/20 border border-border text-white" : ""
                            }`}
                        >
                            Extra Bold
                            {fontWeight === "Extra Bold" && <Icons.Check className="h-4 w-4 ml-2" />}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="h-6 w-[1px] bg-border" />
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => adjustFontSize(-1)}
                        className="border border-border/0 rounded-lg cursor-pointer hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border text-muted-foreground h-8 w-8 px-2 data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border"
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
                            className="w-[48px] min-w-[48px] mt-1 p-1 rounded-lg"
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
                        className="border border-border/0 rounded-lg cursor-pointer hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border text-muted-foreground h-8 w-8 px-2 data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border"
                    >
                        <Icons.Plus className="h-4 w-4" />
                    </Button>
                </div>
                <div className="h-6 w-[1px] bg-border" />
                <Button
                    variant="ghost"
                    size="icon"
                    className="flex items-center justify-center flex-col gap-0.5 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border min-w-9 max-w-9 px-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                >
                    <Icons.TextColorSymbol className="h-3.5 w-3.5" />
                    <div className="h-[2.5px] w-5.5 bg-current rounded-full" />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="flex items-center justify-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border min-w-9 max-w-9 px-2 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                        >
                            {textAlign === "left" && <Icons.TextAlignLeft className="h-4 w-4" />}
                            {textAlign === "center" && <Icons.TextAlignCenter className="h-4 w-4" />}
                            {textAlign === "right" && <Icons.TextAlignRight className="h-4 w-4" />}
                            {textAlign === "justify" && <Icons.TextAlignJustified className="h-4 w-4" />}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="flex min-w-fit mt-1 p-1 rounded-lg gap-1">
                        <DropdownMenuItem 
                            onClick={() => setTextAlign("left")}
                            className={`px-2 py-1.5 rounded-md text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white ${
                                textAlign === "left" ? "bg-background-tertiary/20 border border-border text-white" : ""
                            }`}
                        >
                            <Icons.TextAlignLeft className="h-4 w-4" />
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => setTextAlign("center")}
                            className={`px-2 py-1.5 rounded-md text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white ${
                                textAlign === "center" ? "bg-background-tertiary/20 border border-border text-white" : ""
                            }`}
                        >
                            <Icons.TextAlignCenter className="h-4 w-4" />
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => setTextAlign("right")}
                            className={`px-2 py-1.5 rounded-md text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white ${
                                textAlign === "right" ? "bg-background-tertiary/20 border border-border text-white" : ""
                            }`}
                        >
                            <Icons.TextAlignRight className="h-4 w-4" />
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => setTextAlign("justify")}
                            className={`px-2 py-1.5 rounded-md text-muted-foreground data-[highlighted]:bg-background-tertiary/10 border border-border/0 data-[highlighted]:border-border data-[highlighted]:text-white ${
                                textAlign === "justify" ? "bg-background-tertiary/20 border border-border text-white" : ""
                            }`}
                        >
                            <Icons.TextAlignJustified className="h-4 w-4" />
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </motion.div>
    );
};
