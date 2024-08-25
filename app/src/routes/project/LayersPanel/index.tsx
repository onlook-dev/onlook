import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorMode } from '@/lib/models';
import { PinLeftIcon, PinRightIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useEditorEngine } from '..';
import LayersTab from './LayersTab';
import { capitalizeFirstLetter } from '/common/helpers';

const LayersPanel = observer(() => {
    const editorEngine = useEditorEngine();
    enum TabValue {
        LAYERS = 'layers',
        COMPONENTS = 'components',
    }
    const selectedTab: string = TabValue.LAYERS;
    const [isOpen, setIsOpen] = useState(true);

    function renderTabs() {
        return (
            <Tabs defaultValue={selectedTab}>
                <TabsList className="bg-transparent w-full p-0 gap-4 select-none justify-start px-4">
                    <TabsTrigger className="bg-transparent p-0 text-xs" value={TabValue.LAYERS}>
                        {capitalizeFirstLetter(TabValue.LAYERS)}
                    </TabsTrigger>
                    <TabsTrigger className="bg-transparent p-0 text-xs" value={TabValue.COMPONENTS}>
                        {capitalizeFirstLetter(TabValue.COMPONENTS)}
                    </TabsTrigger>
                    <div className="flex-grow"></div>
                    <button
                        className="text-white hover:text-text w-6 h-6"
                        onClick={() => setIsOpen(false)}
                    >
                        <PinLeftIcon />
                    </button>
                </TabsList>
                <Separator className="mt-1" />
                <div className="h-[calc(100vh-7.75rem)] overflow-auto mx-2">
                    <TabsContent value={TabValue.LAYERS}>
                        <LayersTab />
                    </TabsContent>
                    <TabsContent value={TabValue.COMPONENTS}>
                        <div className="w-full pt-96 text-center opacity-70">Coming soon</div>{' '}
                    </TabsContent>
                </div>
            </Tabs>
        );
    }
    return (
        <div
            className={clsx(
                'left-0 top-20 transition-width duration-300 opacity-100 bg-black/80 rounded-tr-xl',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                isOpen ? 'w-full h-[calc(100vh-5rem)]' : 'w-12 h-12 rounded-r-xl cursor-pointer',
            )}
        >
            {!isOpen && (
                <div
                    className="w-full h-full flex justify-center items-center text-white hover:text-text"
                    onClick={() => setIsOpen(true)}
                >
                    <PinRightIcon className="z-51" />
                </div>
            )}
            <div
                className={clsx(
                    'border backdrop-blur shadow h-full relative transition-opacity duration-300 rounded-tr-xl',
                    isOpen ? 'opacity-100 visible' : 'opacity-0 invisible',
                )}
            >
                {renderTabs()}
            </div>
        </div>
    );
});

export default LayersPanel;
