'use client';

import React from 'react';
import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { InputSeparator } from './separator';

export const WindowToolbar = observer(() => {
    const editorEngine = useEditorEngine();
    const frameData = editorEngine.frames.selected[0];

    if (!frameData) return null;

    return (
        <div className="flex items-center gap-1 p-1 px-1.5 bg-background-secondary/85 dark:bg-background/85 backdrop-blur rounded-lg drop-shadow-xl">
            <div className="flex items-center gap-0.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-transparent hover:bg-background-tertiary/20"
                            onClick={() => editorEngine.frames.duplicate(frameData.frame.id)}
                        >
                            <Icons.Copy className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Duplicate Window</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 bg-transparent hover:bg-background-tertiary/20"
                            onClick={() => editorEngine.frames.delete(frameData.frame.id)}
                            disabled={!editorEngine.frames.canDelete()}
                        >
                            <Icons.Trash className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Delete Window</TooltipContent>
                </Tooltip>
            </div>
            <InputSeparator />
            <div className="flex items-center gap-0.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 bg-transparent hover:bg-background-tertiary/20"
                            onClick={() => {
                                const { width, height } = frameData.frame.dimension;
                                frameData.frame.dimension.width = height;
                                frameData.frame.dimension.height = width;
                            }}
                        >
                            <Icons.CounterClockwiseClock className="h-4 w-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Rotate Device</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}); 