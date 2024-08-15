import React, { useState, useEffect } from 'react';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorMode } from '@/lib/models';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useEditorEngine } from '..';
import LayersTab from './LayersTab';
import { capitalizeFirstLetter } from '/common/helpers';

const LayersPanel = observer(() => {
    const editorEngine = useEditorEngine();
    
    const [panelWidth, setPanelWidth] = useState(300);
    const handleMouseMove = (e: MouseEvent) => {
        const maxWidth = window.innerWidth / 3; // 1/3 of the window width
        let newWidth = e.clientX;

        if (newWidth > maxWidth) {
            newWidth = maxWidth;
        }

        setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    const handleMouseDown = () => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
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
                'border max-w-60 min-w-60 bg-black/80 backdrop-blur rounded-tr-xl shadow',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                'layers-panel'
            )}
            style={{ width: `${panelWidth}px` }}
        >
            {renderTabs()}
            <div
                className="absolute right-0 top-0 h-full w-2 cursor-ew-resize bg-gray-500"
                onMouseDown={handleMouseDown}
            />
        </div>
    );
});

export default LayersPanel;
