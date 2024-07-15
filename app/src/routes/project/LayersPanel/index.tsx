import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LayersTab from './LayersTab';

function LayersPanel() {
    enum TabValue {
        LAYERS = 'layers',
        ASSETS = 'assets',
    }
    const selectedTab: string = TabValue.LAYERS;

    function renderTabs() {
        return (
            <Tabs defaultValue={selectedTab}>
                <TabsList className="bg-transparent w-full p-0 gap-4 select-none">
                    <TabsTrigger className="bg-transparent p-0 text-xs" value={TabValue.LAYERS}>
                        Layers
                    </TabsTrigger>
                    <TabsTrigger className="bg-transparent p-0 text-xs" value={TabValue.ASSETS}>
                        Assets
                    </TabsTrigger>
                </TabsList>
                <Separator className="mt-1" />
                <div className="h-[calc(100vh-7.75rem)] overflow-auto">
                    <TabsContent value={TabValue.LAYERS}>
                        <LayersTab />
                    </TabsContent>
                    <TabsContent value={TabValue.ASSETS}>
                        <div className="w-full pt-96   text-center opacity-70">Coming soon</div>
                    </TabsContent>
                </div>
            </Tabs>
        );
    }
    return <div className="max-w-60 min-w-60">{renderTabs()}</div>;
}

export default LayersPanel;
