'use client';

import { useEditorEngine } from '@/components/store/editor';
import { transKeys } from '@/i18n/keys';
import { EditorMode, EditorTabValue } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import { ResizablePanel } from '@onlook/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChatTab } from './chat-tab';
import { ChatControls } from './chat-tab/controls';
import { ChatHistory } from './chat-tab/history';
import { ChatPanelDropdown } from './chat-tab/panel-dropdown';
import { DevTab } from './dev-tab';
import { CodeControls } from './dev-tab/code-controls';

const EDIT_PANEL_WIDTHS = {
    [EditorTabValue.CHAT]: 352,
    [EditorTabValue.DEV]: 700,
};

export const RightPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const selectedTab = editorEngine.state.rightPanelTab;
    const editPanelWidth = EDIT_PANEL_WIDTHS[selectedTab];

    return (
        <div
            id="style-panel"
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
                <Tabs className='h-full gap-0' onValueChange={(value) => editorEngine.state.rightPanelTab = value as EditorTabValue} value={selectedTab} >
                    <TabsList className='flex flex-row h-10 w-full border-b-1 border-border items-center bg-transparent select-none pr-1 pl-1.5 justify-between'>
                        <div className="flex flex-row items-center gap-2 ">
                            <ChatPanelDropdown
                                isChatHistoryOpen={isChatHistoryOpen}
                                setIsChatHistoryOpen={setIsChatHistoryOpen}
                            >
                                <TabsTrigger
                                    className="bg-transparent py-2 px-1 text-small hover:text-foreground-hover cursor-pointer"
                                    value={EditorTabValue.CHAT}
                                >
                                    <Icons.Sparkles className="mr-0.5 mb-0.5 h-4 w-4" />
                                    {t(transKeys.editor.panels.edit.tabs.chat.name)}
                                    <Icons.ChevronDown className="ml-0.5 h-3 w-3 text-muted-foreground" />
                                </TabsTrigger>
                            </ChatPanelDropdown>
                            <TabsTrigger
                                className="bg-transparent py-2 px-1 text-small hover:text-foreground-hover cursor-pointer"
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
                    <TabsContent className="h-full overflow-y-auto" value={EditorTabValue.CHAT}>
                        <ChatTab inputValue={inputValue} setInputValue={setInputValue} />
                    </TabsContent>
                    <TabsContent forceMount className={cn('h-full overflow-y-auto', editorEngine.state.rightPanelTab !== EditorTabValue.DEV && 'hidden')} value={EditorTabValue.DEV}>
                        <DevTab />
                    </TabsContent>
                </Tabs>
            </ResizablePanel>
        </div>
    );
});
