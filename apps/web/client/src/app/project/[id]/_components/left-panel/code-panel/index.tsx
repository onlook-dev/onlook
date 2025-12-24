'use client';

import { useEditorEngine } from '@/components/store/editor';
import { EditorMode } from '@onlook/models';
import { ResizablePanel } from '@onlook/ui/resizable';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { CodeTab } from './code-tab';

export const CodePanel = observer(() => {
    const editorEngine = useEditorEngine();
    const editPanelWidth = 500

    return (
        <div
            className={cn('flex size-full transition-width duration-300 bg-background/95 group/panel border-[0.5px] backdrop-blur-xl shadow rounded-tr-xl overflow-hidden',
                editorEngine.state.editorMode !== EditorMode.CODE && 'hidden'
            )}
        >
            <ResizablePanel
                side="left"
                defaultWidth={editPanelWidth}
                minWidth={240}
                maxWidth={1440}
            >
                <CodeTab
                    projectId={editorEngine.projectId}
                    branchId={editorEngine.branches.activeBranch.id}
                />
            </ResizablePanel>
        </div>
    );
});  