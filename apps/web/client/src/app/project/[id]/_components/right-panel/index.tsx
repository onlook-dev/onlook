"use client";

import { useEditorEngine } from '@/components/store';
import { EditorMode, EditorTabValue } from "@onlook/models";
import { Icons } from '@onlook/ui/icons';
import { ResizablePanel } from '@onlook/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChatTab } from './chat/chat-tab';
import { ChatControls } from './chat/controls';
import { ChatHistory } from './chat/history';
import { ChatPanelDropdown } from './chat/panel-dropdown';

const EDIT_PANEL_WIDTHS = {
    [EditorTabValue.CHAT]: 352,
};

export const RightPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
    const selectedTab = editorEngine.state.rightPanelTab;
    const editPanelWidth = EDIT_PANEL_WIDTHS[selectedTab];

    return (
        <div
            id="style-panel"
            className={
                cn(
                    'flex h-full w-full transition-width duration-300 bg-background/95 group/panel border-[0.5px] backdrop-blur-xl shadow rounded-tl-xl',
                    editorEngine.state.editorMode === EditorMode.PREVIEW && 'hidden'
                )
            }
        >
            <ResizablePanel
                side="right"
                defaultWidth={editPanelWidth}
                forceWidth={editPanelWidth}
                minWidth={240}
                maxWidth={700}
            >
                <Tabs className='h-full' onValueChange={(value) => editorEngine.state.rightPanelTab = value as EditorTabValue} value={selectedTab} >
                    <TabsList
                        className='flex h-12 w-full border-b justify-between items-center bg-transparent select-none px-2'
                    >
                        <ChatPanelDropdown>
                            <TabsTrigger
                                className="bg-transparent py-2 px-1 text-small hover:text-foreground-hover"
                                value={EditorTabValue.CHAT}
                            >
                                <Icons.Sparkles className="mr-1.5 mb-0.5 h-4 w-4" />
                                {t('editor.panels.edit.tabs.chat.name')}
                                < Icons.ChevronDown className="ml-1 h-3 w-3 text-muted-foreground" />
                            </TabsTrigger>
                        </ChatPanelDropdown>
                        <ChatControls />
                    </TabsList>
                    <ChatHistory isOpen={isChatHistoryOpen} onOpenChange={setIsChatHistoryOpen} />
                    <TabsContent className='h-full overflow-y-auto' value={EditorTabValue.CHAT}>
                        <ChatTab />
                    </TabsContent>
                </Tabs>
            </ResizablePanel >
        </div >
    );
});
