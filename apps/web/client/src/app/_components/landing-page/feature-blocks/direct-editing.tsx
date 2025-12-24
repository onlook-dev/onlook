import React from 'react';
import { Icons } from '@onlook/ui/icons';
import { DirectEditingInteractive } from '../../shared/mockups/direct-editing-interactive';


export function DirectEditingBlock() {
    return (
        <div className="flex flex-col gap-4">
            <DirectEditingInteractive />
            <div className="flex flex-row items-start gap-8 w-full">
                <div className="flex flex-col items-start w-1/2">
                    <div className="mb-2"><Icons.DirectManipulation className="w-6 h-6 text-foreground-primary" /></div>
                    <span className="text-foreground-primary text-largePlus font-light">Direct editing</span>
                </div>
                <p className="text-foreground-secondary text-regular text-balance w-1/2">Drag-and-drop, rearrange, scale, and more with elements directly in the editor.</p>
            </div>
        </div>
    );
}     