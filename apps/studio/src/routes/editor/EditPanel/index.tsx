import { useEditorEngine } from '@/components/Context';
import { EditorMode } from '@/lib/models';
import { Icons } from '@onlook/ui/icons';
import { Separator } from '@onlook/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import ChatTab from './ChatTab';
import ChatControls from './ChatTab/ChatControls';
import ManualTab from './StylesTab';

enum TabValue {
    STYLES = 'styles',
    CHAT = 'chat',
}

const EditPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const [isOpen, setIsOpen] = useState(true);
    const [selectedTab, setSelectedTab] = useState(TabValue.STYLES);

    function renderEmptyState() {
        return (
            <div className="text-sm pt-96 flex items-center justify-center text-center opacity-70">
                Select an element <br></br>to edit its style properties
            </div>
        );
    }

    function renderTabs() {
        return (
            <Tabs
                defaultValue={selectedTab}
                onValueChange={(value: string) => setSelectedTab(value as TabValue)}
            >
                <TabsList className="bg-transparent w-full gap-2 select-none justify-between items-center h-full px-2">
                    <div className="flex flex-row items-center gap-2">
                        <button
                            className="text-default rounded-lg p-2 bg-transparent hover:text-foreground-hover"
                            onClick={() => setIsOpen(false)}
                        >
                            <Icons.PinRight />
                        </button>
                        <TabsTrigger
                            className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover"
                            value={TabValue.STYLES}
                        >
                            Styles
                        </TabsTrigger>
                        <TabsTrigger
                            className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover"
                            value={TabValue.CHAT}
                        >
                            <Icons.MagicWand className="mr-2" />
                            {'Chat (beta)'}
                        </TabsTrigger>
                    </div>
                    {selectedTab === TabValue.CHAT && <ChatControls />}
                </TabsList>
                <Separator />
                <div className="h-[calc(100vh-7.75rem)] overflow-auto">
                    <TabsContent value={TabValue.STYLES}>
                        {editorEngine.elements.selected.length > 0 ? (
                            <ManualTab />
                        ) : (
                            renderEmptyState()
                        )}
                    </TabsContent>
                    <TabsContent value={TabValue.CHAT}>
                        <ChatTab />
                    </TabsContent>
                </div>
            </Tabs>
        );
    }

    return (
        <div
            className={cn(
                'fixed right-0 transition-width duration-300 opacity-100 bg-background/80 rounded-tl-xl overflow-hidden',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                !isOpen && 'w-12 h-12 rounded-l-xl cursor-pointer',
                isOpen && 'h-[calc(100vh-5rem)]',
                isOpen && selectedTab == TabValue.STYLES && 'w-60',
                isOpen && selectedTab == TabValue.CHAT && 'w-[22rem]',
            )}
        >
            {!isOpen && (
                <button
                    className="w-full h-full flex justify-center items-center text-foreground hover:text-foreground-onlook"
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
                {renderTabs()}
            </div>
        </div>
    );
});

export default EditPanel;
