import { useEditorEngine } from '@/components/Context';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EditorMode } from '@/lib/models';
import {
    Cross2Icon,
    MagicWandIcon,
    PinLeftIcon,
    PinRightIcon,
    PlusIcon,
} from '@radix-ui/react-icons';
import { TooltipArrow } from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import ChatTab from './ChatTab';
import ChatHistory from './ChatTab/ChatHistory';
import ManualTab from './StylesTab';

const EditPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const [isOpen, setIsOpen] = useState(true);
    enum TabValue {
        STYLES = 'styles',
        CHAT = 'chat',
    }

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
                            <PinRightIcon />
                        </button>
                        <TabsTrigger
                            className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover"
                            value={TabValue.STYLES}
                        >
                            Styles
                        </TabsTrigger>
                        <TabsTrigger
                            className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover hidden"
                            value={TabValue.CHAT}
                        >
                            <MagicWandIcon className="mr-2" />
                            Chat
                        </TabsTrigger>
                    </div>
                    {selectedTab === TabValue.CHAT && (
                        <div className="flex flex-row gap">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant={'ghost'}
                                            size={'icon'}
                                            className="p-2 w-fit h-fit hover:bg-transparent"
                                        >
                                            <PlusIcon />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        <p>New Chat</p>
                                        <TooltipArrow className="fill-foreground" />
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <ChatHistory />
                            <Button
                                variant={'ghost'}
                                size={'icon'}
                                className="p-2 w-fit h-fit hover:bg-transparent"
                            >
                                <Cross2Icon />
                            </Button>
                        </div>
                    )}
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
            className={clsx(
                'fixed right-0 transition-width duration-300 opacity-100 bg-background/80 rounded-tl-xl ',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                !isOpen && 'w-12 h-12 rounded-l-xl cursor-pointer',
                isOpen && 'w-60 h-[calc(100vh-5rem)]',
                selectedTab == TabValue.CHAT && 'w-[22rem]',
            )}
        >
            {!isOpen && (
                <button
                    className="w-full h-full flex justify-center items-center text-foreground hover:text-foreground-onlook"
                    onClick={() => setIsOpen(true)}
                >
                    <PinLeftIcon className="z-51" />
                </button>
            )}
            <div
                className={clsx(
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
