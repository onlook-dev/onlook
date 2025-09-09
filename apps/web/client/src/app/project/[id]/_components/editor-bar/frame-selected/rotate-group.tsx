import React from 'react';
import { Icons } from '@onlook/ui/icons';
import { type FrameData } from '@/components/store/editor/frames';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { ToolbarButton } from '../toolbar-button';

export function RotateGroup({ frameData }: { frameData: FrameData }) {
    return (
        <HoverOnlyTooltip content="Rotate Device" side="bottom" sideOffset={10}>
            <ToolbarButton
                className="w-9"
                onClick={() => {
                    const { width, height } = frameData.frame.dimension;
                    frameData.frame.dimension.width = height;
                    frameData.frame.dimension.height = width;
                }}
            >
                <Icons.Rotate className="h-4 w-4" />
            </ToolbarButton>
        </HoverOnlyTooltip>
    );
} 