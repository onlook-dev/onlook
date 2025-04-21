"use client";

import { Button } from "@onlook/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@onlook/ui/dropdown-menu";
import { Icons } from "@onlook/ui/icons";
import { useEffect, useState } from "react";
import { InputColor } from "../inputs/input-color";
import { InputRange } from "../inputs/input-range";
import { SpacingInputs } from "../inputs/spacing-inputs";
import { useBoxControl } from "../hooks/use-box-control";
import { useEditorEngine } from "@/components/store";
import { Color } from "@onlook/utility";

export const Border = () => {
    const [activeTab, setActiveTab] = useState('individual');
    const { boxState, handleBoxChange, handleUnitChange, handleIndividualChange } = useBoxControl('border');
    const editorEngine = useEditorEngine();

    const [borderColor, setBorderColor] = useState(Color.from(editorEngine.style.getValue('borderColor') ?? '#080808').toHex());
    const [borderOpacity, setBorderOpacity] = useState(parseInt(editorEngine.style.getValue('borderOpacity') ?? '100'));

    useEffect(() => {
        setBorderColor(Color.from(editorEngine.style.getValue('borderColor') ?? '#080808').toHex());
        setBorderOpacity(parseInt(editorEngine.style.getValue('borderOpacity') ?? '100'));
    }, [editorEngine.style]);

    const handleColorChange = (color: string) => {
        setBorderColor(color);
        editorEngine.style.update('borderColor', color);
    };

    const handleOpacityChange = (opacity: number) => {
        setBorderOpacity(opacity);
        editorEngine.style.update('borderOpacity', `${opacity}%`);
    };    

    const borderStyle = {
        borderWidth: boxState.border.num ? `1px`: '0px',
        borderStyle: 'solid',
        borderColor: borderColor,
        opacity: borderOpacity / 100
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                >
                    <Icons.BorderEdit className="h-4 w-4 min-h-4 min-w-4" />
                    <span className="text-sm">{boxState.border.value}</span>

                    <div 
                            className="w-5 h-5 rounded-md"
                            style={borderStyle}
                        />
                </Button>
            </DropdownMenuTrigger>
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
                        value={boxState.border.num ?? 0}
                        onChange={(value) => handleBoxChange('border', value.toString())}
                        unit={boxState.border.unit}
                        onUnitChange={(unit) => handleUnitChange('border', unit)}
                    />
                ) : (
                    <SpacingInputs
                        type="border"
                        values={{
                            top: boxState.borderTop.num ?? 0,
                            right: boxState.borderRight.num ?? 0,
                            bottom: boxState.borderBottom.num ?? 0,
                            left: boxState.borderLeft.num ?? 0
                        }}
                        onChange={handleIndividualChange}
                    />
                )}
                <div className="mt-3">
                    <InputColor
                        color={borderColor}
                        opacity={borderOpacity}
                        onColorChange={handleColorChange}
                        onOpacityChange={handleOpacityChange}
                    />
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
