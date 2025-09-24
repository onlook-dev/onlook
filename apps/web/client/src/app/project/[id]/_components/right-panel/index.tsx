'use client';

import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';

import { EditorMode, EditorTabValue } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { ResizablePanel } from '@onlook/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { cn } from '@onlook/ui/utils';

import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { ChatTab } from './chat-tab';
import { ChatControls } from './chat-tab/controls';
import { ChatHistory } from './chat-tab/history';
import { ChatPanelDropdown } from './chat-tab/panel-dropdown';
import { CodeTab } from './code-tab';
import { CodeControls } from './code-tab/code-controls';

const EDIT_PANEL_WIDTHS = {
    [EditorTabValue.CHAT]: 352,
    [EditorTabValue.DEV]: 700,
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
                'transition-width bg-background/95 group/panel flex h-full w-full rounded-tl-xl border-[0.5px] shadow backdrop-blur-xl duration-300',
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
                <Tabs
                    className="h-full gap-0"
                    onValueChange={(value) =>
                        (editorEngine.state.rightPanelTab = value as EditorTabValue)
                    }
                    value={selectedTab}
                >
                    <TabsList className="border-border flex h-10 w-full flex-row items-center justify-between border-b-1 bg-transparent pr-1 pl-1.5 select-none">
                        <div className="flex flex-row items-center gap-2">
                            <ChatPanelDropdown
                                isChatHistoryOpen={isChatHistoryOpen}
                                setIsChatHistoryOpen={setIsChatHistoryOpen}
                            >
                                <TabsTrigger
                                    className="text-small hover:text-foreground-hover cursor-pointer bg-transparent px-1 py-2"
                                    value={EditorTabValue.CHAT}
                                >
                                    <Icons.Sparkles className="mr-0.5 mb-0.5 h-4 w-4" />
                                    {t(transKeys.editor.panels.edit.tabs.chat.name)}
                                    <Icons.ChevronDown className="text-muted-foreground ml-0.5 h-3 w-3" />
                                </TabsTrigger>
                            </ChatPanelDropdown>
                            <TabsTrigger
                                className="text-small hover:text-foreground-hover cursor-pointer bg-transparent px-1 py-2"
                                value={EditorTabValue.DEV}
                            >
                                <Icons.Code className="mr-1 h-4 w-4" />
                                Code
                            </TabsTrigger>
                        </div>
                        {selectedTab === EditorTabValue.CHAT && <ChatControls />}
                        {selectedTab === EditorTabValue.DEV && <CodeControls />}
                    </TabsList>
                    <ChatHistory isOpen={isChatHistoryOpen} onOpenChange={setIsChatHistoryOpen} />
                    <TabsContent
                        forceMount
                        className={cn(
                            'h-full overflow-y-auto',
                            editorEngine.state.rightPanelTab !== EditorTabValue.CHAT && 'hidden',
                        )}
                        value={EditorTabValue.CHAT}
                    >
                        {currentConversation && (
                            <ChatTab
                                conversationId={currentConversation.id}
                                projectId={editorEngine.projectId}
                            />
                        )}
                    </TabsContent>
                    <TabsContent
                        forceMount
                        className={cn(
                            'h-full overflow-y-auto',
                            editorEngine.state.rightPanelTab !== EditorTabValue.DEV && 'hidden',
                        )}
                        value={EditorTabValue.DEV}
                    >
                        <CodeTab />
                    </TabsContent>
                </Tabs>
            </ResizablePanel>
        </div>
    );
});
