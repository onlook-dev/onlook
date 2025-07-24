import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { useState } from 'react';
import { ToolbarButton } from '../toolbar-button';
import type { FrameData } from '@/components/store/editor/frames';

export function WindowActionsGroup({ frameData }: { frameData: FrameData }) {
    const editorEngine = useEditorEngine();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDuplicating, setIsDuplicating] = useState(false);

    const duplicateWindow = async () => {
        setIsDuplicating(true);
        try {
            if (frameData?.frame.id) {
                await editorEngine.frames.duplicate(frameData.frame.id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsDuplicating(false);
        }
    };

    const deleteWindow = async () => {
        setIsDeleting(true);
        try {
            if (frameData?.frame.id) {
                await editorEngine.frames.delete(frameData.frame.id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <Tooltip key="duplicate">
                <TooltipTrigger asChild>
                    <ToolbarButton
                        className="flex items-center w-10"
                        onClick={duplicateWindow}
                        disabled={isDuplicating}
                    >
                        {isDuplicating ? (
                            <Icons.LoadingSpinner className="size-4 min-size-4 animate-spin" />
                        ) : (
                            <Icons.Copy className="size-4 min-size-4" />
                        )}
                    </ToolbarButton>
                </TooltipTrigger>
                <TooltipContent side="bottom">Duplicate Window</TooltipContent>
            </Tooltip>
            {editorEngine.frames.canDelete() && (
                <Tooltip key="delete">
                    <TooltipTrigger asChild>
                        <ToolbarButton
                            className="flex items-center w-10"
                            disabled={!editorEngine.frames.canDelete() || isDeleting}
                            onClick={deleteWindow}
                        >
                            {isDeleting ? (
                                <Icons.LoadingSpinner className="size-4 min-size-4 animate-spin" />
                            ) : (
                                <Icons.Trash className="size-4 min-size-4" />
                            )}
                        </ToolbarButton>

                    </TooltipTrigger>
                    <TooltipContent side="bottom">Delete Window</TooltipContent>
                </Tooltip>
            )}
        </>
    );
} 