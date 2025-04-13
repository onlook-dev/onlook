import { useEditorEngine, useUserManager } from '@/components/Context';
import { EditorMode, EditorTabValue } from '@/lib/models';
import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import { IdeType } from '@onlook/models/ide';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import ResizablePanel from '@onlook/ui/resizable';
import { Separator } from '@onlook/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatTab } from './ChatTab';
import { ChatControls } from './ChatTab/ChatControls';
import { ChatHistory } from './ChatTab/ChatControls/ChatHistory';
import { DevTab } from './DevTab';
import { PropsTab } from './PropsTab';
import { StylesTab } from './StylesTab';

const EDIT_PANEL_WIDTHS = {
    [EditorTabValue.CHAT]: 352,
    [EditorTabValue.PROPS]: 295,
    [EditorTabValue.STYLES]: 240,
    [EditorTabValue.DEV]: 700,
};
const DEV_PANEL_MIN_WIDTH = 300;
const DEV_PANEL_MAX_WIDTH = 1000;
export const EditPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const userManager = useUserManager();
    const { t } = useTranslation();

    const currentIdeType = userManager.settings.settings?.editor?.ideType;
    const isOnlookIde = currentIdeType === IdeType.ONLOOK;

    const chatSettings = userManager.settings.settings?.chat || DefaultSettings.CHAT_SETTINGS;
    const [isOpen, setIsOpen] = useState(true);
    const [selectedTab, setSelectedTab] = useState<EditorTabValue>(editorEngine.editPanelTab);
    const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
    const editPanelWidth = EDIT_PANEL_WIDTHS[selectedTab];

    useEffect(() => {
        tabChange(editorEngine.editPanelTab);
    }, [editorEngine.editPanelTab]);

    // Listens for SHOW_EDITOR_TAB event to switch to DevTab when files are opened via Onlook IDE
    useEffect(() => {
        const handleShowEditorTab = (_event: any, tabValue: string) => {
            if (tabValue === EditorTabValue.DEV) {
                tabChange(EditorTabValue.DEV);
            }
        };

        window.api.on(MainChannels.SHOW_EDITOR_TAB, handleShowEditorTab);

        return () => {
            window.api.removeListener(MainChannels.SHOW_EDITOR_TAB, handleShowEditorTab);
        };
    }, []);

    function renderEmptyState() {
        return (
            <div className="text-sm pt-96 flex items-center justify-center text-center opacity-70 px-4">
                {t('editor.panels.edit.tabs.styles.emptyState')}
            </div>
        );
    }

    function tabChange(value: EditorTabValue) {
        editorEngine.editPanelTab = value;
        setSelectedTab(value);
        setIsOpen(true);
    }

    function renderTabs() {
        return (
            <Tabs onValueChange={(value) => tabChange(value as EditorTabValue)} value={selectedTab}>
                <TabsList
                    className={cn(
                        'bg-transparent w-full select-none justify-between items-center px-2',
                        isOpen ? 'h-11' : 'h-full',
                    )}
                >
                    <div className="flex flex-row items-center gap-2 ">
                        <button
                            className="text-default rounded-lg p-2 bg-transparent hover:text-foreground-hover hidden"
                            onClick={() => setIsOpen(false)}
                        >
                            <Icons.PinRight />
                        </button>
                        <DropdownMenu>
                            <DropdownMenuTrigger
                                asChild
                                disabled={selectedTab !== EditorTabValue.CHAT}
                            >
                                <div className="flex items-center">
                                    <TabsTrigger
                                        className="bg-transparent py-2 px-1 text-small hover:text-foreground-hover"
                                        value={EditorTabValue.CHAT}
                                    >
                                        <Icons.Sparkles className="mr-1.5 mb-0.5 h-4 w-4" />
                                        {t('editor.panels.edit.tabs.chat.name')}
                                        <Icons.ChevronDown className="ml-1 h-3 w-3 text-muted-foreground" />
                                    </TabsTrigger>
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="min-w-[220px]">
                                <DropdownMenuItem
                                    className="flex items-center py-1.5"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        userManager.settings.updateChat({
                                            showSuggestions: !chatSettings.showSuggestions,
                                        });
                                    }}
                                >
                                    <Icons.Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            chatSettings.showSuggestions
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    Show suggestions
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="flex items-center py-1.5"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        userManager.settings.updateChat({
                                            autoApplyCode: !chatSettings.autoApplyCode,
                                        });
                                    }}
                                >
                                    <Icons.Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            chatSettings.autoApplyCode
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    Auto-apply results
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="flex items-center py-1.5"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        userManager.settings.updateChat({
                                            expandCodeBlocks: !chatSettings.expandCodeBlocks,
                                        });
                                    }}
                                >
                                    <Icons.Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            chatSettings.expandCodeBlocks
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                    Show code while rendering
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="flex items-center py-1.5"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        userManager.settings.updateChat({
                                            showMiniChat: !chatSettings.showMiniChat,
                                        });
                                    }}
                                >
                                    <Icons.Check
                                        className={cn(
                                            'mr-2 h-4 w-4',
                                            chatSettings.showMiniChat ? 'opacity-100' : 'opacity-0',
                                        )}
                                    />
                                    Show mini chat
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => {
                                        setIsChatHistoryOpen(!isChatHistoryOpen);
                                    }}
                                >
                                    <Icons.CounterClockwiseClock className="mr-2 h-4 w-4" />
                                    Chat History
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <TabsTrigger
                            className="bg-transparent py-2 px-1 text-small hover:text-foreground-hover"
                            value={EditorTabValue.STYLES}
                        >
                            <Icons.Styles className="mr-1.5 h-4 w-4" />
                            {t('editor.panels.edit.tabs.styles.name')}
                        </TabsTrigger>
                        <TabsTrigger
                            className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover hidden"
                            value={EditorTabValue.PROPS}
                        >
                            <Icons.MixerHorizontal className="mr-1.5 mb-0.5" />
                            Props
                        </TabsTrigger>
                        {isOnlookIde && (
                            <TabsTrigger
                                className="bg-transparent py-2 px-1 text-small hover:text-foreground-hover"
                                value={EditorTabValue.DEV}
                            >
                                <Icons.Code className="mr-1.5 h-4 w-4" />
                                Code
                            </TabsTrigger>
                        )}
                    </div>
                    {selectedTab === EditorTabValue.CHAT && <ChatControls />}
                </TabsList>
                <Separator className="mt-0" />
                <ChatHistory isOpen={isChatHistoryOpen} onOpenChange={setIsChatHistoryOpen} />
                <div className="h-[calc(100vh-7.75rem)] overflow-auto">
                    <TabsContent value={EditorTabValue.CHAT}>
                        <ChatTab />
                    </TabsContent>
                    <TabsContent value={EditorTabValue.PROPS}>
                        <PropsTab />
                    </TabsContent>
                    <TabsContent value={EditorTabValue.STYLES}>
                        {editorEngine.elements.selected.length > 0 ? (
                            <StylesTab />
                        ) : (
                            renderEmptyState()
                        )}
                    </TabsContent>
                    {/* Empty TabsContent to make the tabs system work, but actual content is rendered separately */}
                    {isOnlookIde && <TabsContent value={EditorTabValue.DEV}></TabsContent>}

                    {/* Keep DevTab mounted but control visibility based on selected tab so we dont lose the state when switching tabs */}
                    {isOnlookIde && (
                        <div
                            className={
                                selectedTab === EditorTabValue.DEV ? 'block h-full' : 'hidden'
                            }
                        >
                            <DevTab />
                        </div>
                    )}
                </div>
            </Tabs>
        );
    }

    return (
        <div
            className={cn(
                'flex flex-row h-full',
                editorEngine.mode === EditorMode.PREVIEW ? 'hidden' : 'visible',
            )}
        >
            <ResizablePanel
                side="right"
                defaultWidth={editPanelWidth}
                forceWidth={editPanelWidth}
                minWidth={selectedTab === EditorTabValue.DEV ? DEV_PANEL_MIN_WIDTH : 240}
                maxWidth={selectedTab === EditorTabValue.DEV ? DEV_PANEL_MAX_WIDTH : 700}
            >
                <div
                    id="editor-panel"
                    className={cn(
                        'w-full transition-width duration-300 opacity-100 bg-background/95 overflow-hidden group/panel h-full',
                        editorEngine.mode === EditorMode.PREVIEW ? 'hidden' : 'visible',
                        'rounded-tl-xl',
                    )}
                >
                    <div
                        className={cn(
                            'border-[0.5px] backdrop-blur-xl shadow h-full relative transition-opacity duration-300',
                            isOpen ? 'opacity-100 visible' : 'opacity-0 invisible',
                        )}
                    >
                        {renderTabs()}
                    </div>
                </div>
            </ResizablePanel>
        </div>
    );
});
