'use client';

import { useOnboarding } from '@/components/onboarding/onboarding-context';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { useState, useRef, useEffect } from 'react';
import { MembersContent } from './members-content';

interface MembersProps {
    onPopoverOpenChange?: (isOpen: boolean) => void;
}

export const Members = ({ onPopoverOpenChange }: MembersProps) => {
    const { isActive, currentStep } = useOnboarding();
    const [isOpen, setIsOpen] = useState(false);
    const isOnboardingStep5 = isActive && currentStep === 4;

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
                            className={cn(
                                "rounded-full size-8 hover:border-border bg-background-secondary hover:bg-background-secondary/80 text-foreground-secondary hover:text-foreground-primary transition-all duration-300",
                                isOnboardingStep5 && "ring-1 ring-red-500 ring-offset-2 ring-offset-background shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                            )}
                        >
                            <Icons.Plus className="size-4" />
                        </Button>
                    </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="z-50 mt-1" hideArrow>
                    <p>Invite team members</p>
                </TooltipContent>
            </Tooltip>
            <PopoverContent className="p-0 w-96" side="bottom" align="center" sideOffset={4}>
                <MembersContent />
            </PopoverContent>
        </Popover>
    );
};
