'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from "@onlook/ui/tooltip";
import { useEffect, useState } from 'react';
import { HorizontalAlignInput, VerticalAlignInput } from './align';
import { DirectionInput } from './direction';
import { GapInput } from './gap';
import { TypeInput } from './type';

export interface CssValue {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

export const layoutTypeOptions: Record<string, CssValue> = {
    block: { value: "block", label: "Block", icon: <Icons.CrossL className="h-3.5 w-3.5" /> },
    flex: { value: "flex", label: "Flex" },
    grid: { value: "grid", label: "Grid" },
};

export const Display = () => {
    const editorEngine = useEditorEngine();
    const [layoutType, setLayoutType] = useState(
        editorEngine.style.selectedStyle?.styles.computed.display ?? 'block',
    );

    useEffect(() => {
        setLayoutType(editorEngine.style.selectedStyle?.styles.computed.display ?? 'block');
    }, [editorEngine.style.selectedStyle]);

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center gap-2 text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border data-[state=open]:bg-background-tertiary/20 data-[state=open]:text-white data-[state=open]:border data-[state=open]:border-border px-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                        >
                            <Icons.Layout className="h-4 w-4 min-h-4 min-w-4" />
                            <span className="text-sm">{layoutTypeOptions[layoutType]?.label ?? layoutType}</span>
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                    Display
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="min-w-[200px] mt-2 p-1.5 rounded-lg">
                <div className="p-2 space-y-2.5">
                    <TypeInput />
                    <DirectionInput />
                    <VerticalAlignInput />
                    <HorizontalAlignInput />
                    <GapInput />
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
