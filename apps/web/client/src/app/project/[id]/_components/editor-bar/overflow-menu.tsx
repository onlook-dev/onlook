import { Button } from '@onlook/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import React from 'react';
import { InputSeparator } from './separator';
import { ToolbarButton } from './toolbar-button';
import { HoverOnlyTooltip } from './hover-tooltip';

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

export const OverflowMenu = ({ isOpen, onOpenChange, overflowGroups, visibleCount }: OverflowMenuProps) => {
    if (overflowGroups.length === 0) return null;

    return (
        <>
            {visibleCount > 0 && <InputSeparator />}
            <DropdownMenu open={isOpen} onOpenChange={onOpenChange} modal={false}>
                <HoverOnlyTooltip content="More options" side="bottom" className="mt-1" hideArrow disabled={isOpen}>
                    <DropdownMenuTrigger asChild>
                        <ToolbarButton
                            isOpen={isOpen}
                            className="w-9 flex items-center justify-center"
                            aria-label="Show more toolbar controls"
                        >
                            <Icons.DotsHorizontal className="w-5 h-5" />
                        </ToolbarButton>
                    </DropdownMenuTrigger>
                </HoverOnlyTooltip>
                <DropdownMenuContent
                    align="end"
                    className="flex flex-row gap-1 p-1 px-1 bg-background rounded-lg shadow-xl shadow-black/20 min-w-[fit-content] items-center w-[fit-content]"
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