import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LayersTab from './LayersTab';
import { capitalizeFirstLetter } from '/common/helpers';

function LayersPanel() {
    enum TabValue {
        LAYERS = 'layers',
        COMPONENTS = 'components',
    }
    const selectedTab: string = TabValue.LAYERS;

    function renderTabs() {
        return (
            <Tabs defaultValue={selectedTab}>
                <TabsList className="bg-transparent w-full p-0 gap-4 select-none">
                    <TabsTrigger className="bg-transparent p-0 text-xs" value={TabValue.LAYERS}>
                        {capitalizeFirstLetter(TabValue.LAYERS)}
                    </TabsTrigger>
                    <TabsTrigger className="bg-transparent p-0 text-xs" value={TabValue.COMPONENTS}>
                        {capitalizeFirstLetter(TabValue.COMPONENTS)}
                    </TabsTrigger>
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
        <div className="border max-w-60 min-w-60 bg-black/80 backdrop-blur rounded-tr-lg shadow">
            {renderTabs()}
        </div>
    );
}

export default LayersPanel;
