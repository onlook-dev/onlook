import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { useState } from 'react';
import { HoverOnlyTooltip } from '../hover-tooltip';
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
            <HoverOnlyTooltip content="Duplicate Window" side="bottom" sideOffset={10}>
                <ToolbarButton
                    className="flex items-center w-9"
                    onClick={duplicateWindow}
                    disabled={isDuplicating}
                >
                    {isDuplicating ? (
                        <Icons.LoadingSpinner className="size-4 min-size-4 animate-spin" />
                    ) : (
                        <Icons.Copy className="size-4 min-size-4" />
                    )}
                </ToolbarButton>
            </HoverOnlyTooltip>
            {editorEngine.frames.canDelete() && (
                <HoverOnlyTooltip content="Delete Window" side="bottom" sideOffset={10}>
                    <ToolbarButton
                        className="flex items-center w-9"
                        disabled={!editorEngine.frames.canDelete() || isDeleting}
                        onClick={deleteWindow}
                    >
                        {isDeleting ? (
                            <Icons.LoadingSpinner className="size-4 min-size-4 animate-spin" />
                        ) : (
                            <Icons.Trash className="size-4 min-size-4" />
                        )}
                    </ToolbarButton>
                </HoverOnlyTooltip>
            )}
        </>
    );
} 