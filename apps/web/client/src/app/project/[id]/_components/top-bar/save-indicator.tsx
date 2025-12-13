'use client';

import { useEditorEngine } from '@/components/store/editor';
import type { SaveState } from '@/components/store/editor/save-state';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { observer } from 'mobx-react-lite';

export const SaveIndicator = observer(() => {
    const editorEngine = useEditorEngine();
    const saveState: SaveState = editorEngine.saveState.saveState;

    const getIndicatorContent = () => {
        switch (saveState) {
            case 'saving':
                return (
                    <div className="flex items-center gap-1.5 text-xs text-foreground-secondary">
                        <Icons.Reload className="h-3 w-3 animate-spin" />
                        <span>Saving...</span>
                    </div>
                );
            case 'saved':
                return (
                    <div className="flex items-center gap-1.5 text-xs text-foreground-tertiary">
                        <Icons.Check className="h-3 w-3" />
                        <span>Saved</span>
                    </div>
                );
            case 'unsaved':
                return (
                    <div className="flex items-center gap-1.5 text-xs text-orange-500">
                        <Icons.Circle className="h-3 w-3 fill-current" />
                        <span>Unsaved changes</span>
                    </div>
                );
        }
    };

    const getTooltipContent = () => {
        switch (saveState) {
            case 'saving':
                return 'Saving your changes...';
            case 'saved':
                return `Last saved ${editorEngine.saveState.formattedTimeSinceLastSave}`;
            case 'unsaved':
                return 'You have unsaved changes';
        }
    };

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-center px-2 py-1 rounded-md hover:bg-background-secondary/50 transition-colors cursor-default">
                    {getIndicatorContent()}
                </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="mt-1" hideArrow>
                <p>{getTooltipContent()}</p>
            </TooltipContent>
        </Tooltip>
    );
});
