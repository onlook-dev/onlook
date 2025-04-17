"use client";

import { useEditorEngine } from "@/components/store";
import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { useState } from "react";
import { InputIcon } from "../inputs/input-icon";
import { InputRadio } from "../inputs/input-radio";

interface CssValue {
    value: string,
    label: string,
    icon?: React.ReactNode,
}

const layoutTypeOptions: Record<string, CssValue> = {
    block: { value: "block", label: "--" },
    flex: { value: "flex", label: "Flex" },
    grid: { value: "grid", label: "Grid" },
};

const directionOptions: Record<string, CssValue> = {
    column: { value: "column", label: "Vertical", icon: <Icons.ArrowDown className="h-4 w-4" /> },
    row: { value: "row", label: "Horizontal", icon: <Icons.ArrowRight className="h-4 w-4" /> },
};

const verticalAlignOptions: Record<string, CssValue> = {
    top: { value: "top", label: "Top", icon: <Icons.AlignTop className="h-4 w-4" /> },
    center: { value: "center", label: "Center", icon: <Icons.AlignCenterVertically className="h-4 w-4" /> },
    bottom: { value: "bottom", label: "Bottom", icon: <Icons.AlignBottom className="h-4 w-4" /> },
    "space-between": { value: "space-between", label: "Space Between", icon: <Icons.SpaceBetweenVertically className="h-4 w-4" /> },
};

const horizontalAlignOptions: Record<string, CssValue> = {
    left: { value: "left", label: "Left", icon: <Icons.AlignLeft className="h-4 w-4" /> },
    center: { value: "center", label: "Center", icon: <Icons.AlignCenterHorizontally className="h-4 w-4" /> },
    right: { value: "right", label: "Right", icon: <Icons.AlignRight className="h-4 w-4" /> },
    "space-between": { value: "space-between", label: "Space Between", icon: <Icons.SpaceBetweenHorizontally className="h-4 w-4" /> },
};

export const Display = () => {
    const editorEngine = useEditorEngine();

    const [layoutType, setLayoutType] = useState<CssValue>(layoutTypeOptions.block as CssValue);
    const [direction, setDirection] = useState<CssValue>(directionOptions.column as CssValue);
    const [verticalAlign, setVerticalAlign] = useState<CssValue>(verticalAlignOptions.top as CssValue);
    const [horizontalAlign, setHorizontalAlign] = useState<CssValue>(horizontalAlignOptions.left as CssValue);
    const [gap, setGap] = useState(12);
    const [gapUnit, setGapUnit] = useState("px");

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                >
                    <Icons.Layout className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="text-sm">{layoutType.label}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[200px] mt-2 p-1.5 rounded-lg">
                <div className="p-2 space-y-2.5">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24">Type</span>
                        <InputRadio
                            options={Object.values(layoutTypeOptions)}
                            value={layoutType.value}
                            onChange={(value) => {
                                setLayoutType(layoutTypeOptions[value] as CssValue)
                                editorEngine.style.update("display", value)
                            }}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24">Direction</span>
                        <InputRadio
                            options={Object.values(directionOptions)}
                            value={direction.value}
                            onChange={(value) => {
                                setDirection(directionOptions[value] as CssValue)
                                editorEngine.style.update("flex-direction", value)
                            }}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24">Vertical</span>
                        <InputRadio
                            options={Object.values(verticalAlignOptions)}
                            value={verticalAlign.value}
                            onChange={(value) => {
                                setVerticalAlign(verticalAlignOptions[value] as CssValue)
                                editorEngine.style.update("align-items", value)
                            }}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24">Horizontal</span>
                        <InputRadio
                            options={Object.values(horizontalAlignOptions)}
                            value={horizontalAlign.value}
                            onChange={(value) => {
                                setHorizontalAlign(horizontalAlignOptions[value] as CssValue)
                                editorEngine.style.update("justify-content", value)
                            }}
                            className="flex-1"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-24">Gap</span>
                        <InputIcon value={gap}
                            onChange={(value) => {
                                setGap(value)
                                editorEngine.style.update("gap", `${value}${gapUnit}`)
                            }}
                            onUnitChange={(value) => {
                                setGapUnit(value)
                                editorEngine.style.update("gap", `${gap}${value}`)
                            }}
                        />
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
