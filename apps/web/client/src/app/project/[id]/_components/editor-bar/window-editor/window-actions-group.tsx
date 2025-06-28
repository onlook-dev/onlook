import React from 'react';
import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';

export function WindowActionsGroup({ frameData }: { frameData: any }) {
    const editorEngine = useEditorEngine();
    return (
        <>
            <Tooltip key="duplicate">
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
            <Tooltip key="delete">
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
        </>
    );
} 