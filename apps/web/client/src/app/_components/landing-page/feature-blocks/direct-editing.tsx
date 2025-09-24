import React from 'react';

import { Icons } from '@onlook/ui/icons';

import { DirectEditingInteractive } from '../../shared/mockups/direct-editing-interactive';

export function DirectEditingBlock() {
    return (
        <div className="flex flex-col gap-4">
            <DirectEditingInteractive />
            <div className="flex w-full flex-row items-start gap-8">
                <div className="flex w-1/2 flex-col items-start">
                    <div className="mb-2">
                        <Icons.DirectManipulation className="text-foreground-primary h-6 w-6" />
                    </div>
                    <span className="text-foreground-primary text-largePlus font-light">
                        Direct editing
                    </span>
                </div>
                <p className="text-foreground-secondary text-regular w-1/2 text-balance">
                    Drag-and-drop, rearrange, scale, and more with elements directly in the editor.
                </p>
            </div>
        </div>
    );
}
