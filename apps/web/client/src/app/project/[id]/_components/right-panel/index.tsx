"use client";

import { useEditorEngine } from '@/components/store';
import { EditorMode, EditorTabValue } from "@onlook/models";
import { Icons } from '@onlook/ui/icons';
import { ResizablePanel } from '@onlook/ui/resizable';
import { Separator } from '@onlook/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChatControls } from './chat/controls';
import { ChatPanelDropdown } from './chat/panel-dropdown';

// import { ChatTab } from './ChatTab';
// import { ChatControls } from './ChatTab/ChatControls';
// import { ChatHistory } from './ChatTab/ChatControls/ChatHistory';
// import { DevTab } from './DevTab';
// import { PropsTab } from './PropsTab';
// import { StylesTab } from './StylesTab';

const EDIT_PANEL_WIDTHS = {
    [EditorTabValue.CHAT]: 352,
};

export const RightPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();

    const [isOpen, setIsOpen] = useState(true);
    const selectedTab = editorEngine.state.rightPanelTab;
    const editPanelWidth = EDIT_PANEL_WIDTHS[selectedTab];

    return (
        <div
            className={
                cn(
                    'flex flex-row h-full',
                    editorEngine.state.editorMode === EditorMode.PREVIEW ? 'hidden' : 'visible',
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
                <div
                    id="style-panel"
                    className={
                        cn(
                            'w-full transition-width transition-opacity duration-300 bg-background/95 overflow-hidden group/panel border-[0.5px] backdrop-blur-xl shadow h-full rounded-tl-xl',
                            editorEngine.state.editorMode === EditorMode.PREVIEW ? 'hidden' : 'visible',
                            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible',
                            // isDevPanelOpen && 'rounded-none'
                        )}>
                    <Tabs onValueChange={(value) => editorEngine.state.rightPanelTab = value as EditorTabValue} value={selectedTab} >
                        <TabsList
                            className={
                                cn(
                                    'bg-transparent w-full select-none justify-between items-center px-2',
                                    isOpen ? 'h-11' : 'h-full',
                                )
                            }
                        >
                            <div className="flex flex-row items-center gap-2 " >
                                <button
                                    className="text-default rounded-lg p-2 bg-transparent hover:text-foreground-hover hidden"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <Icons.PinRight />
                                </button>
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
                            </div>
                            {selectedTab === EditorTabValue.CHAT && <ChatControls />}
                        </TabsList>
                        < Separator className="mt-0" />
                        {/* <ChatHistory isOpen={isChatHistoryOpen} onOpenChange={setIsChatHistoryOpen} /> */}
                        <div className="overflow-auto" >
                            <TabsContent value={EditorTabValue.CHAT}>
                                {/* <ChatTab /> */}
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </ResizablePanel>
        </div>
    );
});
