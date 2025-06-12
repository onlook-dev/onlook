'use client';

import React from 'react';
import { useEditorEngine } from '@/components/store/editor';
import { Icons } from '@onlook/ui/icons';
import { Button } from '@onlook/ui/button';
import { observer } from 'mobx-react-lite';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { InputSeparator } from './separator';
import { motion } from 'motion/react';
import { LeftPanelTabValue } from '@onlook/models';

export const WindowToolbar = observer(() => {
    const editorEngine = useEditorEngine();
    const frameData = editorEngine.frames.selected[0];
    const isWindowSelected = editorEngine.frames.selected.length > 0;
    const isPanelOpen = editorEngine.state.leftPanelTab === LeftPanelTabValue.WINDOWS && editorEngine.state.leftPanelLocked;

    // Only show toolbar when a window is selected
    if (!isWindowSelected || !frameData) return null;

    const toggleWindowPanel = () => {
        if (isPanelOpen) {
            editorEngine.state.leftPanelLocked = false;
            editorEngine.state.leftPanelTab = null;
        } else {
            editorEngine.state.leftPanelTab = LeftPanelTabValue.WINDOWS;
            editorEngine.state.leftPanelLocked = true;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-1 p-1 px-1.5 bg-background-secondary/85 dark:bg-background/85 backdrop-blur rounded-lg drop-shadow-xl"
        >
            <div className="flex items-center gap-0.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                                editorEngine.frames.duplicate(frameData.frame.id);
                            }}
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
                            className="h-8 w-8"
                            disabled={!editorEngine.frames.canDelete()}
                            onClick={() => {
                                editorEngine.frames.delete(frameData.frame.id);
                            }}
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

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={toggleWindowPanel}
                        >
                            <Icons.PinLeft className={`h-4 w-4 ${isPanelOpen ? 'text-primary' : ''}`} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{isPanelOpen ? 'Close' : 'Open'} Window Panel</TooltipContent>
                </Tooltip>
            </div>
        </motion.div>
    );
}); 