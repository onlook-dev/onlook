import { useEditorEngine } from '@/components/Context';
import { Separator } from '@onlook/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { EditorMode } from '@/lib/models';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import ComponentsTab from './ComponentsTab';
import LayersTab from './LayersTab';
import { capitalizeFirstLetter } from '/common/helpers';
import { Icons } from '@onlook/ui/icons';

const COMPONENT_DISCOVERY_ENABLED = false;

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
                <TabsList className="bg-transparent w-full gap-2 select-none justify-start pr-1 pl-3 pt-2">
                    <TabsTrigger
                        className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover"
                        value={TabValue.LAYERS}
                    >
                        {capitalizeFirstLetter(TabValue.LAYERS)}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent py-2 px-1 text-xs hover:text-foreground-hover"
                        value={TabValue.COMPONENTS}
                    >
                        {capitalizeFirstLetter(TabValue.COMPONENTS)}
                    </TabsTrigger>
                    <div className="flex-grow"></div>
                    <button
                        className="text-default rounded-lg p-2 bg-transparent hover:text-foreground-hover"
                        onClick={() => setIsOpen(false)}
                    >
                        <Icons.PinLeft />
                    </button>
                </TabsList>
                <Separator className="mt-1" />
                <div className="h-[calc(100vh-7.75rem)] overflow-auto mx-2">
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
            className={cn(
                'left-0 top-20 transition-width duration-300 opacity-100 bg-background/80 rounded-tr-xl overflow-hidden',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                isOpen ? 'w-full h-[calc(100vh-5rem)]' : 'w-12 h-12 rounded-r-xl cursor-pointer',
            )}
        >
            {!isOpen && (
                <div
                    className="w-full h-full flex justify-center items-center text-foreground hover:text-foreground-onlook"
                    onClick={() => setIsOpen(true)}
                >
                    <Icons.PinRight className="z-51" />
                </div>
            )}
            <div
                className={cn(
                    'border backdrop-blur shadow h-full relative transition-opacity duration-300 rounded-tr-xl',
                    isOpen ? 'opacity-100 visible' : 'opacity-0 hidden',
                )}
            >
                {renderTabs()}
            </div>
        </div>
    );
});

export default LayersPanel;
