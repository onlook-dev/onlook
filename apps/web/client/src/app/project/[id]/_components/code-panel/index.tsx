'use client';

import { useEditorEngine } from '@/components/store/editor';
import { ResizablePanel } from '@onlook/ui/resizable';
import { useTranslations } from 'next-intl';
import { CodeTab } from './code-tab';

export const CodePanel = () => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const editPanelWidth = 700

    return (
        <div
            className='flex h-full w-full transition-width duration-300 bg-background/95 group/panel border-[0.5px] backdrop-blur-xl shadow rounded-tr-xl'
        >
            <ResizablePanel
                side="left"
                defaultWidth={editPanelWidth}
                forceWidth={editPanelWidth}
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
};  