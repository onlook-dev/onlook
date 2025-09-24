'use client';

import { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

import { useEditorEngine } from '@/components/store/editor';
import { useDropdownControl } from '../../hooks/use-dropdown-manager';
import { HoverOnlyTooltip } from '../../hover-tooltip';
import { ToolbarButton } from '../../toolbar-button';
import { DirectionInput } from './direction';
import { GapInput } from './gap';
import { HorizontalAlignInput } from './horizontal-align';
import { TypeInput } from './type';
import { VerticalAlignInput } from './vertical-align';

export interface CssValue {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

export const layoutTypeOptions: Record<string, CssValue> = {
    block: { value: 'block', label: 'Block', icon: <Icons.CrossL className="h-3.5 w-3.5" /> },
    flex: { value: 'flex', label: 'Flex' },
    grid: { value: 'grid', label: 'Grid' },
};

export const Display = observer(() => {
    const editorEngine = useEditorEngine();
    const [layoutType, setLayoutType] = useState(
        editorEngine.style.selectedStyle?.styles.computed.display ?? 'block',
    );

    const { isOpen, onOpenChange } = useDropdownControl({
        id: 'display-dropdown',
    });

    useEffect(() => {
        setLayoutType(editorEngine.style.selectedStyle?.styles.computed.display ?? 'block');
    }, [editorEngine.style.selectedStyle?.styles.computed.display]);

    return (
        <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
            <HoverOnlyTooltip
                content="Display"
                side="bottom"
                className="mt-1"
                hideArrow
                disabled={isOpen}
            >
                <DropdownMenuTrigger asChild>
                    <ToolbarButton isOpen={isOpen} className="flex min-w-9 items-center gap-1">
                        <Icons.Layout className="h-4 min-h-4 w-4 min-w-4" />
                        {(layoutType === 'flex' || layoutType === 'grid') && (
                            <span className="text-small">
                                {layoutTypeOptions[layoutType]?.label ?? layoutType}
                            </span>
                        )}
                    </ToolbarButton>
                </DropdownMenuTrigger>
            </HoverOnlyTooltip>
            <DropdownMenuContent align="start" className="mt-2 min-w-[250px] rounded-lg p-1.5">
                <div className="space-y-2 p-1">
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
