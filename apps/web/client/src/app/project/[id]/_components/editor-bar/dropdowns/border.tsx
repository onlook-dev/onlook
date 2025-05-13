'use client';

import { useEditorEngine } from "@/components/store/editor";
import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { Tooltip, TooltipContent, TooltipTrigger } from "@onlook/ui/tooltip";
import { Color } from "@onlook/utility";
import { useEffect, useState } from "react";
import { useBoxControl } from "../hooks/use-box-control";
import { InputColor } from "../inputs/input-color";
import { InputRange } from "../inputs/input-range";
import { SpacingInputs } from "../inputs/spacing-inputs";

export const Border = () => {
    const editorEngine = useEditorEngine();
    const [activeTab, setActiveTab] = useState('individual');
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange } =
        useBoxControl('border');
    const [borderColor, setBorderColor] = useState(
        Color.from(
            editorEngine.style.selectedStyle?.styles.computed.borderColor ?? '#080808',
        ).toHex(),
    );

    useEffect(() => {
        setBorderColor(
            Color.from(
                editorEngine.style.selectedStyle?.styles.computed.borderColor ?? '#080808',
            ).toHex(),
        );
    }, [editorEngine.style.selectedStyle?.styles.computed.borderColor]);

    const handleColorChange = (color: string) => {
        setBorderColor(color);
        editorEngine.style.update('borderColor', color);
    };

    const borderStyle = {
        borderWidth: boxState.borderWidth.num ? `1px` : '0px',
        borderStyle: 'solid',
    };

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                        >
                            <Icons.BorderEdit className="h-4 w-4 min-h-4 min-w-4" />
                            <span className="text-sm">{boxState.borderWidth.value}</span>
                            <div
                                className="w-5 h-5 rounded-md"
                                style={borderStyle}
                            />
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    Border
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-[280px] mt-1 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'all'
                            ? 'text-white bg-background-tertiary/20'
                            : 'text-muted-foreground hover:bg-background-tertiary/10'
                            }`}
                    >
                        All sides
                    </button>
                    <button
                        onClick={() => setActiveTab('individual')}
                        className={`flex-1 text-sm px-4 py-1.5 rounded-md transition-colors cursor-pointer ${activeTab === 'individual'
                            ? 'text-white bg-background-tertiary/20'
                            : 'text-muted-foreground hover:bg-background-tertiary/10'
                            }`}
                    >
                        Individual
                    </button>
                </div>
                {activeTab === 'all' ? (
                    <InputRange
                        value={boxState.borderWidth.num ?? 0}
                        onChange={(value) => handleBoxChange('borderWidth', value.toString())}
                        unit={boxState.borderWidth.unit}
                        onUnitChange={(unit) => handleUnitChange('borderWidth', unit)}
                    />
                ) : (
                    <SpacingInputs
                        type="border"
                        values={{
                            top: boxState.borderTopWidth.num ?? 0,
                            right: boxState.borderRightWidth.num ?? 0,
                            bottom: boxState.borderBottomWidth.num ?? 0,
                            left: boxState.borderLeftWidth.num ?? 0,
                        }}
                        onChange={handleIndividualChange}
                    />
                )}
                <div className="mt-3">
                    <InputColor color={borderColor} onColorChange={handleColorChange} />
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
