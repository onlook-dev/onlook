import React from 'react';

import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';

import { HoverOnlyTooltip } from './hover-tooltip';
import { InputSeparator } from './separator';
import { ToolbarButton } from './toolbar-button';

interface OverflowMenuProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    overflowGroups: Array<{
        key: string;
        label: string;
        components: React.ReactNode[];
    }>;
    visibleCount: number;
}

export const OverflowMenu = ({
    isOpen,
    onOpenChange,
    overflowGroups,
    visibleCount,
}: OverflowMenuProps) => {
    if (overflowGroups.length === 0) return null;

    return (
        <>
            {visibleCount > 0 && <InputSeparator />}
            <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
                <HoverOnlyTooltip
                    content="More options"
                    side="bottom"
                    className="mt-1"
                    hideArrow
                    disabled={isOpen}
                >
                    <DropdownMenuTrigger asChild>
                        <ToolbarButton
                            isOpen={isOpen}
                            className="flex w-9 items-center justify-center"
                            aria-label="Show more toolbar controls"
                        >
                            <Icons.DotsHorizontal className="h-5 w-5" />
                        </ToolbarButton>
                    </DropdownMenuTrigger>
                </HoverOnlyTooltip>
                <DropdownMenuContent
                    align="end"
                    className="bg-background flex w-[fit-content] min-w-[fit-content] flex-row items-center gap-1 rounded-lg p-1 px-1 shadow-xl shadow-black/20"
                >
                    {overflowGroups.map((group, groupIdx) => (
                        <React.Fragment key={group.key}>
                            {groupIdx > 0 && <InputSeparator />}
                            <div className="flex items-center gap-0.5">
                                {group.components.map((comp, idx) => (
                                    <React.Fragment key={idx}>{comp}</React.Fragment>
                                ))}
                            </div>
                        </React.Fragment>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
};
