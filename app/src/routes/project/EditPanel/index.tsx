import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorMode } from '@/lib/models';
import { MagicWandIcon, PinLeftIcon, PinRightIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useEditorEngine } from '..';
import ManualTab from './ManualTab';

const EditPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const [isOpen, setIsOpen] = useState(true);
    enum TabValue {
        MANUAL = 'manual',
        ASSISTED = 'assisted',
    }
    const selectedTab: string = TabValue.MANUAL;

    function renderEmptyState() {
        return (
            <div className="text-sm pt-96 flex items-center justify-center text-center opacity-70">
                Select an element to edit
            </div>
        );
    }

    function renderTabs() {
        return (
            <Tabs defaultValue={selectedTab}>
                <TabsList className="bg-transparent w-full p-0 gap-4 select-none justify-start px-4">
                    <button
                        className="text-white hover:text-text w-6 h-6"
                        onClick={() => setIsOpen(false)}
                    >
                        <PinRightIcon />
                    </button>
                    <TabsTrigger className="bg-transparent p-0 text-xs" value={TabValue.MANUAL}>
                        Set Styles
                    </TabsTrigger>
                    <TabsTrigger className="bg-transparent p-0 text-xs" value={TabValue.ASSISTED}>
                        <MagicWandIcon className="mr-2" />
                        AI Styles
                    </TabsTrigger>
                </TabsList>
                <Separator className="mt-1" />
                <div className="h-[calc(100vh-7.75rem)] overflow-auto">
                    <TabsContent value={TabValue.MANUAL}>
                        {editorEngine.elements.selected.length > 0 ? (
                            <ManualTab />
                        ) : (
                            renderEmptyState()
                        )}
                    </TabsContent>
                    <TabsContent value={TabValue.ASSISTED}>
                        <div className="w-full pt-96 text-sm text-center opacity-70">
                            Coming soon
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        );
    }
    return (
        <div
            className={clsx(
                'fixed right-0 top-20 transition-width duration-300 opacity-100 bg-black/80 rounded-tl-xl ',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                isOpen ? 'w-60 h-[calc(100vh-5rem)]' : 'w-12 h-12 rounded-l-xl cursor-pointer',
            )}
        >
            {!isOpen && (
                <button
                    className="w-full h-full flex justify-center items-center text-white hover:text-text"
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
