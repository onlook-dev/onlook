import { useEditorEngine } from '@/components/Context';
import { EditorMode, EditorTabValue } from '@/lib/models';
import type { FrameSettings } from '@onlook/models/projects';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import ChatTab from './ChatTab';
import ChatControls from './ChatTab/ChatControls';
import StylesTab from './StylesTab';
import WindowSettings from './WindowSettings';

const EditPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const [isOpen, setIsOpen] = useState(true);
    const [selectedTab, setSelectedTab] = useState<EditorTabValue>(editorEngine.editPanelTab);
    const [windowSettingsOpen, setWindowSettingsOpen] = useState(false);
    const [settings, setSettings] = useState<FrameSettings>();

    useEffect(() => {
        if (
            editorEngine.webviews.selected.length > 0 &&
            editorEngine.elements.selected.length === 0
        ) {
            setSettings(editorEngine.canvas.getFrame(editorEngine.webviews.selected[0].id));
            setWindowSettingsOpen(true);
        } else {
            setWindowSettingsOpen(false);
        }
    }, [editorEngine.webviews.selected, editorEngine.elements.selected]);

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
                            className="text-default rounded-lg p-2 bg-transparent hover:text-foreground-hover"
                            onClick={() => setIsOpen(false)}
                        >
                            <Icons.PinRight />
                        </button>
                        <TabsTrigger
                            className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover"
                            value={EditorTabValue.CHAT}
                        >
                            <Icons.Sparkles className="mr-1.5 mb-0.5" />
                            {'Chat'}
                        </TabsTrigger>
                        <TabsTrigger
                            className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover"
                            value={EditorTabValue.STYLES}
                        >
                            <Icons.Styles className="mr-1.5" />
                            Styles
                        </TabsTrigger>
                    </div>
                    {selectedTab === EditorTabValue.CHAT && <ChatControls />}
                </TabsList>
                <Separator className="mt-0" />
                <div className="h-[calc(100vh-7.75rem)] overflow-auto">
                    <TabsContent value={EditorTabValue.CHAT}>
                        <ChatTab />
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
        <div
            id="style-panel"
            className={cn(
                'fixed right-0 transition-width duration-300 opacity-100 bg-background/80 rounded-tl-xl overflow-hidden',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                isOpen ? 'h-[calc(100vh-5rem)]' : 'w-10 h-10 rounded-l-xl cursor-pointer',
                isOpen && selectedTab == EditorTabValue.STYLES && 'w-60',
                isOpen && selectedTab == EditorTabValue.CHAT && 'w-[22rem]',
            )}
        >
            {!isOpen && (
                <button
                    className="border border-foreground/10 rounded-l-xl w-full h-full flex justify-center items-center text-foreground hover:text-foreground-onlook"
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
                {windowSettingsOpen && settings ? (
                    <WindowSettings setIsOpen={setIsOpen} settings={settings} />
                ) : (
                    renderTabs()
                )}
            </div>
        </div>
    );
});

export default EditPanel;
