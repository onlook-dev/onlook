'use client';

import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { useEffect, useState } from 'react';
import { useDropdownControl } from '../../hooks/use-dropdown-manager';
import { HoverOnlyTooltip } from '../../hover-tooltip';
import { ToolbarButton } from '../../toolbar-button';
import { HorizontalAlignInput, VerticalAlignInput } from './align';
import { DirectionInput } from './direction';
import { GapInput } from './gap';
import { TypeInput } from './type';
import { observer } from 'mobx-react-lite';

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

export const Display = observer(() => {
    const editorEngine = useEditorEngine();
    const [layoutType, setLayoutType] = useState(
        editorEngine.style.selectedStyle?.styles.computed.display ?? 'block',
    );

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'display-dropdown'
    });

    useEffect(() => {
        setLayoutType(editorEngine.style.selectedStyle?.styles.computed.display ?? 'block');
    }, [editorEngine.style.selectedStyle?.styles.computed.display]);

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip content="Display" side="bottom" className="mt-1" hideArrow disabled={isOpen}>
                <DropdownMenuTrigger asChild>
                    <ToolbarButton
                        isOpen={isOpen}
                        className="flex items-center gap-1 min-w-9"
                    >
                        <Icons.Layout className="h-4 w-4 min-h-4 min-w-4" />
                        {(layoutType === 'flex' || layoutType === 'grid') && (
                            <span className="text-small">{layoutTypeOptions[layoutType]?.label ?? layoutType}</span>
                        )}
                    </ToolbarButton>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent align="start" className="min-w-[250px] mt-2 p-1.5 rounded-lg">
                <div className="p-1 space-y-2">
                    <TypeInput />
                    <DirectionInput />
                    <VerticalAlignInput />
                    <HorizontalAlignInput />
                    <GapInput />
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
});
