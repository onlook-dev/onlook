import React from 'react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { type FrameData } from '@/components/store/editor/frames';

export function RotateGroup({ frameData }: { frameData: FrameData }) {
    return (
        <Tooltip key="rotate">
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
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
    );
} 