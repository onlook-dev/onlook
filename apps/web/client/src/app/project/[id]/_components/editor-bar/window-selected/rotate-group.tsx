import React from 'react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { type FrameData } from '@/components/store/editor/frames';
import { HoverOnlyTooltip } from '../hover-tooltip';

export function RotateGroup({ frameData }: { frameData: FrameData }) {
    return (
        <HoverOnlyTooltip content="Rotate Device" side="bottom" sideOffset={10}>
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
        </HoverOnlyTooltip>
    );
} 