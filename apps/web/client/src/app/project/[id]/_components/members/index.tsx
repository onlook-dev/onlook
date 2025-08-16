'use client';

import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@onlook/ui/popover';
import { useState } from 'react';
import { MembersContent } from './members-content';

export const Members = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full size-8 border-active">
                    <Icons.Plus className="size-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-96" >
                <MembersContent />
            </PopoverContent>
        </Popover>
    );
};
