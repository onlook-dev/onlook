'use client';

import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { EditorMode, EditorTabValue } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { ResizablePanel } from '@onlook/ui/resizable';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChatTab } from './chat-tab';
import { ChatHistory } from './chat-tab/history';
import { ChatPanelDropdown } from './chat-tab/panel-dropdown';

const EDIT_PANEL_WIDTHS = {
    [EditorTabValue.CHAT]: 352,
    [EditorTabValue.CODE]: 700,
};

export const RightPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
    const selectedTab = editorEngine.state.rightPanelTab;
    const currentConversation = editorEngine.chat.conversation.current;
    const editPanelWidth = EDIT_PANEL_WIDTHS[selectedTab];

    return (
        <div
            className={cn(
                'flex h-full w-full transition-width duration-300 bg-background/95 group/panel border-[0.5px] backdrop-blur-xl shadow rounded-tl-xl',
                editorEngine.state.editorMode === EditorMode.PREVIEW && 'hidden',
            )}
        >
            <ResizablePanel
                side="right"
                defaultWidth={editPanelWidth}
                forceWidth={editPanelWidth}
                minWidth={240}
                maxWidth={1440}
            >
                <ChatPanelDropdown
                    isChatHistoryOpen={isChatHistoryOpen}
                    setIsChatHistoryOpen={setIsChatHistoryOpen}
                >
                    <div
                        className="flex flex-row w-full items-center gap-2 bg-transparent p-1 px-2 border-b border-border text-small hover:text-foreground-hover cursor-pointer h-10"
                    >
                        <Icons.Sparkles className="mr-0.5 mb-0.5 h-4 w-4" />
                        {t(transKeys.editor.panels.edit.tabs.chat.name)}
                        <Icons.ChevronDown className="ml-0.5 h-3 w-3 text-muted-foreground" />
                    </div>
                </ChatPanelDropdown>
                <ChatHistory isOpen={isChatHistoryOpen} onOpenChange={setIsChatHistoryOpen} />
                <div
                    className="h-full overflow-y-auto" >
                    {currentConversation && (
                        <ChatTab
                            conversationId={currentConversation.id}
                            projectId={editorEngine.projectId}
                        />
                    )}
                </div>
            </ResizablePanel >
        </div >
    );
});
