import { useState } from 'react';

import { Icons } from '@onlook/ui/icons';

import type { FrameData } from '@/components/store/editor/frames';
import { useEditorEngine } from '@/components/store/editor';
import { HoverOnlyTooltip } from '../hover-tooltip';
import { ToolbarButton } from '../toolbar-button';

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
            <HoverOnlyTooltip content="Duplicate Frame" side="bottom" sideOffset={10}>
                <ToolbarButton
                    className="flex w-9 items-center"
                    onClick={duplicateWindow}
                    disabled={isDuplicating}
                >
                    {isDuplicating ? (
                        <Icons.LoadingSpinner className="min-size-4 size-4 animate-spin" />
                    ) : (
                        <Icons.Copy className="min-size-4 size-4" />
                    )}
                </ToolbarButton>
            </HoverOnlyTooltip>
            {editorEngine.frames.canDelete() && (
                <HoverOnlyTooltip content="Delete Frame" side="bottom" sideOffset={10}>
                    <ToolbarButton
                        className="flex w-9 items-center"
                        disabled={!editorEngine.frames.canDelete() || isDeleting}
                        onClick={deleteWindow}
                    >
                        {isDeleting ? (
                            <Icons.LoadingSpinner className="min-size-4 size-4 animate-spin" />
                        ) : (
                            <Icons.Trash className="min-size-4 size-4" />
                        )}
                    </ToolbarButton>
                </HoverOnlyTooltip>
            )}
        </>
    );
}
