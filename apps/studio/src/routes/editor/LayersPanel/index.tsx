import { useEditorEngine } from '@/components/Context';
import { EditorMode } from '@/lib/models';
import { Icons } from '@onlook/ui/icons';
import ResizablePanel from '@onlook/ui/resizable';
import { Separator } from '@onlook/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import ComponentsTab from './ComponentsTab';
import ImagesTab from './ImageTab.tsx';
import LayersTab from './LayersTab';
import PagesTab from './PageTab';
import { capitalizeFirstLetter } from '/common/helpers';

const COMPONENT_DISCOVERY_ENABLED = false;

const LayersPanel = observer(() => {
    const editorEngine = useEditorEngine();
    enum TabValue {
        PAGES = 'pages',
        LAYERS = 'layers',
        COMPONENTS = 'components',
        IMAGES = 'images',
    }
    const [selectedTab, setSelectedTab] = useState<TabValue>(TabValue.LAYERS);
    const [isOpen, setIsOpen] = useState(true);

    // Add hover handling functions
    const handleMouseEnter = (tab: TabValue) => {
        setSelectedTab(tab);
        setIsOpen(true);
    };

    function renderTabs() {
        return (
            <Tabs defaultValue={selectedTab} orientation="vertical" className="flex">
                <TabsList className="bg-transparent h-full flex-col items-start gap-1 py-2 border-r">
                    <TabsTrigger
                        className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 data-[state=active]:bg-accent rounded-none justify-start',
                            selectedTab === TabValue.LAYERS && isOpen
                                ? 'bg-accent text-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                        )}
                        value={TabValue.LAYERS}
                    >
                        <Icons.Layers className="w-5 h-5" />
                        <span className="text-sm">{capitalizeFirstLetter(TabValue.LAYERS)}</span>
                    </TabsTrigger>
                    <TabsTrigger
                        className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 data-[state=active]:bg-accent rounded-none justify-start',
                            selectedTab === TabValue.COMPONENTS
                                ? 'bg-accent text-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                        )}
                        value={TabValue.COMPONENTS}
                    >
                        <Icons.Component className="w-5 h-5" />
                        <span className="text-sm">
                            {capitalizeFirstLetter(TabValue.COMPONENTS)}
                        </span>
                    </TabsTrigger>
                    <TabsTrigger
                        className="w-full flex items-center gap-2 px-3 py-2 data-[state=active]:bg-accent rounded-none justify-start hidden"
                        value={TabValue.PAGES}
                    >
                        <Icons.File className="w-5 h-5" />
                        <span className="text-sm">{capitalizeFirstLetter(TabValue.PAGES)}</span>
                    </TabsTrigger>
                    <TabsTrigger
                        className="w-full flex items-center gap-2 px-3 py-2 data-[state=active]:bg-accent rounded-none justify-start hidden"
                        value={TabValue.IMAGES}
                    >
                        <Icons.Image className="w-5 h-5" />
                        <span className="text-sm">{capitalizeFirstLetter(TabValue.IMAGES)}</span>
                    </TabsTrigger>
                </TabsList>

                <div className="flex-1 h-[calc(100vh-7.75rem)] overflow-auto p-4">
                    <TabsContent value={TabValue.PAGES}>
                        <PagesTab />
                    </TabsContent>
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
                    <TabsContent value={TabValue.IMAGES}>
                        <ImagesTab />
                    </TabsContent>
                </div>
            </Tabs>
        );
    }
    return (
        <div
            className={cn(
                'flex gap-0',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
            )}
        >
            {/* Left sidebar with tabs */}
            <div className="w-20 bg-background-onlook/80 backdrop-blur-xl flex flex-col items-center py-0.5 gap-2">
                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === TabValue.LAYERS && isOpen
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    )}
                    onClick={() => setIsOpen(!isOpen)}
                    onMouseEnter={() => handleMouseEnter(TabValue.LAYERS)}
                >
                    <Icons.Layers className="w-6 h-6" />
                    <span className="text-xs leading-tight">Layers</span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === TabValue.COMPONENTS
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    )}
                    onClick={() => setIsOpen(!isOpen)}
                    onMouseEnter={() => handleMouseEnter(TabValue.COMPONENTS)}
                >
                    <Icons.Component className="w-6 h-6" />
                    <span className="text-xs leading-tight">Elements</span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === TabValue.IMAGES
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    )}
                    onClick={() => setIsOpen(!isOpen)}
                    onMouseEnter={() => handleMouseEnter(TabValue.IMAGES)}
                >
                    <Icons.Image className="w-6 h-6" />
                    <span className="text-xs leading-tight">Images</span>
                </button>

                <button
                    className={cn(
                        'w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 p-2',
                        selectedTab === TabValue.PAGES
                            ? 'bg-accent text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
                    )}
                    onClick={() => setIsOpen(!isOpen)}
                    onMouseEnter={() => handleMouseEnter(TabValue.PAGES)}
                >
                    <Icons.File className="w-6 h-6" />
                    <span className="text-xs leading-tight">Pages</span>
                </button>
            </div>

            {/* Content panel - only show if isOpen is true */}
            {isOpen && (
                <div className="flex-1 max-w-[280px] bg-background/80 rounded-xl">
                    <div className="border backdrop-blur shadow h-[calc(100vh-5.75rem)] overflow-auto p-2 rounded-xl">
                        {selectedTab === TabValue.LAYERS && <LayersTab />}
                        {selectedTab === TabValue.COMPONENTS &&
                            (COMPONENT_DISCOVERY_ENABLED ? (
                                <ComponentsTab components={editorEngine.projectInfo.components} />
                            ) : (
                                <div className="w-full pt-96 text-center opacity-70">
                                    Coming soon
                                </div>
                            ))}
                        {selectedTab === TabValue.PAGES && <PagesTab />}
                        {selectedTab === TabValue.IMAGES && <ImagesTab />}
                    </div>
                </div>
            )}
        </div>
    );
});

export default LayersPanel;
