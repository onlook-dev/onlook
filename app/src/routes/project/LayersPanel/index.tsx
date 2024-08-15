import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorMode } from '@/lib/models';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import { useEditorEngine } from '..';
import LayersTab from './LayersTab';
import { capitalizeFirstLetter } from '/common/helpers';

const LayersPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelWidth, setPanelWidth] = useState(240);

    const startResize = (e: any) => {
        e.preventDefault();
        e.stopPropagation();

        const panel = panelRef.current;
        if (!panel) {
            return;
        }
        const startX = e.clientX;
        const boundingRect = panel.getBoundingClientRect();
        const startWidth = boundingRect.width;

        const resize: any = (e: MouseEvent) => {
            const currentWidth = startWidth + e.clientX - startX;
            setPanelWidth(currentWidth);
        };

        const stopResize = (e: any) => {
            e.preventDefault();
            e.stopPropagation();

            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResize);
        };

        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
    };

    enum TabValue {
        LAYERS = 'layers',
        COMPONENTS = 'components',
    }
    const selectedTab: string = TabValue.LAYERS;

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
                'border min-w-60 max-w-96 bg-black/80 backdrop-blur rounded-tr-xl shadow',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
            )}
            ref={panelRef}
            style={{ width: `${panelWidth}px` }}
        >
            {renderTabs()}
            <div
                className="absolute -right-1 top-0 h-full w-2 cursor-ew-resize"
                onMouseDown={startResize}
            />
        </div>
    );
});

export default LayersPanel;
