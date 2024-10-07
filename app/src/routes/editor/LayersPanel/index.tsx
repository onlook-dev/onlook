import { useEditorEngine } from '@/components/Context';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorMode } from '@/lib/models';
import { LayersIcon, PinLeftIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import ComponentsTab from './ComponentsTab';
import LayersTab from './LayersTab';
import { capitalizeFirstLetter } from '/common/helpers';

const COMPONENT_DISCOVERY_ENABLED = false;

interface LayersPanelProps {
    openPanels: ('layers' | 'theming')[];
    setOpenPanels: React.Dispatch<React.SetStateAction<('layers' | 'theming')[]>>;
}

const LayersPanel = observer(({ openPanels, setOpenPanels }: LayersPanelProps) => {
    const editorEngine = useEditorEngine();
    enum TabValue {
        LAYERS = 'layers',
        COMPONENTS = 'components',
    }
    const selectedTab: string = TabValue.LAYERS;
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => setIsOpen(openPanels.includes('layers')), [openPanels]);

    const togglePanelOpen = () => {
        if (isOpen) {
            setOpenPanels(openPanels.filter((panel) => panel !== 'layers'));
        } else {
            setOpenPanels([...openPanels, 'layers']);
        }
    };

    function renderTabs() {
        return (
            <Tabs defaultValue={selectedTab}>
                <TabsList className="bg-transparent w-full gap-2 select-none justify-start pr-1 pl-3 pt-2">
                    <LayersIcon />
                    <TabsTrigger
                        className="bg-transparent py-2 px-1 text-xs hover:text-text-hover"
                        value={TabValue.LAYERS}
                    >
                        {capitalizeFirstLetter(TabValue.LAYERS)}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent py-2 px-1 text-xs hover:text-text-hover"
                        value={TabValue.COMPONENTS}
                    >
                        {capitalizeFirstLetter(TabValue.COMPONENTS)}
                    </TabsTrigger>
                    <div className="flex-grow"></div>
                    <button
                        className="text-default rounded-lg p-2 bg-transparent hover:text-text-hover"
                        onClick={togglePanelOpen}
                    >
                        <PinLeftIcon />
                    </button>
                </TabsList>
                <Separator className="mt-1" />
                <div
                    className={clsx(
                        'overflow-auto mx-2',
                        openPanels.length > 1 ? 'h-[calc(48vh-4.5rem)]' : 'h-[calc(93vh-7.5rem)]',
                    )}
                >
                    <TabsContent value={TabValue.LAYERS}>
                        <LayersTab />
                    </TabsContent>
                    <TabsContent value={TabValue.COMPONENTS}>
                        {COMPONENT_DISCOVERY_ENABLED ? (
                            <ComponentsTab components={editorEngine.projectInfo.components} />
                        ) : (
                            <div className="w-full pt-96 text-center opacity-70">Coming soon</div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        );
    }
    return (
        <div
            className={clsx(
                'left-0 top-20 transition-width duration-300 opacity-100 bg-black/80 rounded-r-xl',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                isOpen ? 'w-full' : 'w-12 h-12 rounded-r-xl cursor-pointer',
                isOpen
                    ? openPanels.length > 1
                        ? 'h-[calc(52.5vh-5rem)]'
                        : 'h-[calc(93vh-5rem)]'
                    : '',
            )}
        >
            {!isOpen && (
                <div
                    className="w-full h-full flex justify-center items-center text-white hover:text-text"
                    onClick={togglePanelOpen}
                >
                    <LayersIcon className="z-51" />
                </div>
            )}
            <div
                className={clsx(
                    'border backdrop-blur shadow relative transition-opacity duration-300 rounded-r-xl',
                    isOpen ? 'opacity-100 visible' : 'opacity-0 hidden',
                )}
            >
                {renderTabs()}
            </div>
        </div>
    );
});

export default LayersPanel;
