import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { useState } from 'react';

export function WindowActionsGroup({ frameData }: { frameData: any }) {
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
                    <Button
                        variant="ghost"
                        className="flex items-center text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                        onClick={duplicateWindow}
                        disabled={isDuplicating}
                    >
                        {isDuplicating ? (
                            <Icons.LoadingSpinner className="size-4 min-size-4 animate-spin" />
                        ) : (
                            <Icons.Copy className="size-4 min-size-4" />
                        )}
                    </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Duplicate Window</TooltipContent>
            </Tooltip>
            {editorEngine.frames.canDelete() && (
                <Tooltip key="delete">
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            className="flex items-center text-muted-foreground border border-border/0 cursor-pointer rounded-lg hover:bg-background-tertiary/20 hover:text-white hover:border hover:border-border focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none focus-visible:outline-none active:border-0"
                            disabled={!editorEngine.frames.canDelete() || isDeleting}
                            onClick={deleteWindow}
                        >
                            {isDeleting ? (
                                <Icons.LoadingSpinner className="size-4 min-size-4 animate-spin" />
                            ) : (
                                <Icons.Trash className="size-4 min-size-4" />
                            )}
                        </Button>

                    </TooltipTrigger>
                    <TooltipContent side="bottom">Delete Window</TooltipContent>
                </Tooltip>
            )}
        </>
    );
} 