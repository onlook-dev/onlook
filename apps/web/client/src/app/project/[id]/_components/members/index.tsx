'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';

import { MembersContent } from './members-content';

interface MembersProps {
    onPopoverOpenChange?: (isOpen: boolean) => void;
}

export const Members = ({ onPopoverOpenChange }: MembersProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        onPopoverOpenChange?.(open);
    };

    return (
        <Popover open={isOpen} onOpenChange={handleOpenChange}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="hover:border-border bg-background-secondary hover:bg-background-secondary/80 text-foreground-secondary hover:text-foreground-primary size-8 rounded-full"
                        >
                            <Icons.Plus className="size-4" />
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-50 mt-1" hideArrow>
                    <p>Invite team members</p>
                </TooltipContent>
            </Tooltip>
            <PopoverContent className="w-96 p-0" side="bottom" align="center" sideOffset={4}>
                <MembersContent />
            </PopoverContent>
        </Popover>
    );
};
