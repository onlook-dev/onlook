import { useEditorEngine, useUserManager } from '@/components/Context';
import { EditorMode, EditorTabValue } from '@/lib/models';
import { DefaultSettings } from '@onlook/models/constants';
import type { FrameSettings } from '@onlook/models/projects';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import ResizablePanel from '@onlook/ui/resizable';
import { Separator } from '@onlook/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import ChatTab from './ChatTab';
import ChatControls from './ChatTab/ChatControls';
import PropsTab from './PropsTab';
import StylesTab from './StylesTab';
import WindowSettings from './WindowSettings';

const EDIT_PANEL_WIDTHS = {
    [EditorTabValue.CHAT]: 352,
    [EditorTabValue.PROPS]: 295,
    [EditorTabValue.STYLES]: 240,
};

const EditPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const userManager = useUserManager();

    const chatSettings = userManager.settings.settings?.chat || DefaultSettings.CHAT_SETTINGS;
    const [isOpen, setIsOpen] = useState(true);
    const [selectedTab, setSelectedTab] = useState<EditorTabValue>(editorEngine.editPanelTab);
    const [windowSettingsOpen, setWindowSettingsOpen] = useState(false);
    const [frameSettings, setFrameSettings] = useState<FrameSettings>();
    const defaultWidth = EDIT_PANEL_WIDTHS[selectedTab];

    useEffect(() => {
        if (editorEngine.isWindowSelected) {
            setFrameSettings(editorEngine.canvas.getFrame(editorEngine.webviews.selected[0].id));
            setWindowSettingsOpen(true);
        } else {
            setWindowSettingsOpen(false);
        }
    }, [editorEngine.isWindowSelected]);

    useEffect(() => {
        tabChange(editorEngine.editPanelTab);
    }, [editorEngine.editPanelTab]);

    function renderEmptyState() {
        return (
            <div className="text-sm pt-96 flex items-center justify-center text-center opacity-70">
                Select an element <br></br>to edit its style properties
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
                                        Chat
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
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <TabsTrigger
                            className="bg-transparent py-2 px-1 text-small hover:text-foreground-hover"
                            value={EditorTabValue.STYLES}
                        >
                            <Icons.Styles className="mr-1.5 h-4 w-4" />
                            Styles
                        </TabsTrigger>
                        <TabsTrigger
                            className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover hidden"
                            value={EditorTabValue.PROPS}
                        >
                            <Icons.MixerHorizontal className="mr-1.5 mb-0.5" />
                            Props
                        </TabsTrigger>
                    </div>
                    {selectedTab === EditorTabValue.CHAT && <ChatControls />}
                </TabsList>
                <Separator className="mt-0" />
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
                </div>
            </Tabs>
        );
    }

    return (
        <ResizablePanel
            side="right"
            defaultWidth={defaultWidth}
            forceWidth={defaultWidth}
            minWidth={240}
            maxWidth={500}
        >
            <div
                id="style-panel"
                className={cn(
                    'right-0 absolute transition-width duration-300 opacity-100 bg-background/80 rounded-tl-xl overflow-hidden',
                    editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                    isOpen
                        ? 'w-full h-[calc(100vh-5rem)]'
                        : 'w-10 h-10 rounded-l-xl cursor-pointer',
                )}
            >
                {!isOpen && (
                    <button
                        className="absolute right-0 border border-foreground/10 rounded-l-xl w-full h-full flex justify-center items-center text-foreground hover:text-foreground-onlook "
                        onClick={() => setIsOpen(true)}
                    >
                        <Icons.PinLeft className="z-51" />
                    </button>
                )}
                <div
                    className={cn(
                        'border backdrop-blur shadow h-full relative transition-opacity duration-300 rounded-tl-xl',
                        isOpen ? 'opacity-100 visible' : 'opacity-0 invisible',
                    )}
                >
                    {windowSettingsOpen && frameSettings ? (
                        <WindowSettings setIsOpen={setIsOpen} settings={frameSettings} />
                    ) : (
                        renderTabs()
                    )}
                </div>
            </div>
        </ResizablePanel>
    );
});

export default EditPanel;
