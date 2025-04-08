"use client";

import { useEditorEngine } from '@/components/store';
import { EditorMode, EditorTabValue } from "@onlook/models/editor";
import { Icons } from '@onlook/ui-v4/icons';
import { ResizablePanel } from '@onlook/ui-v4/resizable';
import { Separator } from '@onlook/ui-v4/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui-v4/tabs';
import { cn } from '@onlook/ui-v4/utils';
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
    [EditorTabValue.PROPS]: 295,
    [EditorTabValue.STYLES]: 240,
};

// const DEV_PANEL_WIDTH = 500;
// const DEV_PANEL_MIN_WIDTH = 300;
// const DEV_PANEL_MAX_WIDTH = 1000;

export const RightPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const t = useTranslations();

    const [isOpen, setIsOpen] = useState(true);
    const selectedTab = editorEngine.state.rightPanelTab;
    const editPanelWidth = EDIT_PANEL_WIDTHS[selectedTab];

    function renderEmptyState() {
        return (
            <div className="text-sm pt-96 flex items-center justify-center text-center opacity-70 px-4" >
                {t('editor.panels.edit.tabs.styles.emptyState')}
            </div>
        );
    }

    return (
        <div
            className={
                cn(
                    'flex flex-row h-full',
                    editorEngine.state.editorMode === EditorMode.PREVIEW ? 'hidden' : 'visible',
                )
            }
        >
            {/* {isDevPanelOpen && (
                <ResizablePanel
                    side="right"
                    defaultWidth={DEV_PANEL_WIDTH}
                    forceWidth={DEV_PANEL_WIDTH}
                    minWidth={DEV_PANEL_MIN_WIDTH}
                    maxWidth={DEV_PANEL_MAX_WIDTH}
                >
                    <div
                        id="dev-panel"
                        className="rounded-tl-xl transition-width duration-300 opacity-100 bg-background/95 overflow-hidden h-full"
                    >
                        <div
                            className={
                                cn(
                                    'backdrop-blur-xl shadow h-full relative transition-opacity duration-300',
                                    isOpen ? '' : 'rounded-tr-xl',
                                )
                            }
                        >
                            <DevTab />
                        </div>
                    </div>
                </ResizablePanel>
            )} */}
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
                                < TabsTrigger
                                    className="bg-transparent py-2 px-1 text-small hover:text-foreground-hover"
                                    value={EditorTabValue.STYLES}
                                >
                                    <Icons.Styles className="mr-1.5 h-4 w-4" />
                                    {t('editor.panels.edit.tabs.styles.name')}
                                </TabsTrigger>
                                < TabsTrigger
                                    className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover hidden"
                                    value={EditorTabValue.PROPS}
                                >
                                    <Icons.MixerHorizontal className="mr-1.5 mb-0.5" />
                                    Props
                                </TabsTrigger>
                            </div>
                            {selectedTab === EditorTabValue.CHAT && <ChatControls />}
                        </TabsList>
                        < Separator className="mt-0" />
                        {/* <ChatHistory isOpen={isChatHistoryOpen} onOpenChange={setIsChatHistoryOpen} /> */}
                        <div className="overflow-auto" >
                            <TabsContent value={EditorTabValue.CHAT}>
                                {/* <ChatTab /> */}
                            </TabsContent>
                            < TabsContent value={EditorTabValue.PROPS} >
                                {/* <PropsTab /> */}
                            </TabsContent>
                            < TabsContent value={EditorTabValue.STYLES} >
                                {
                                    editorEngine.elements.selected.length > 0 ? (
                                        // <StylesTab />
                                        <></>
                                    ) : (
                                        renderEmptyState()
                                    )
                                }
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </ResizablePanel>
        </div>
    );
});
