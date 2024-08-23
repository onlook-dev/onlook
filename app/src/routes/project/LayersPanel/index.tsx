import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorMode } from '@/lib/models';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import { useEditorEngine } from '..';
import LayersTab from './LayersTab';
import { capitalizeFirstLetter } from '/common/helpers';
import { PinLeftIcon, PinRightIcon } from '@radix-ui/react-icons';

const LayersPanel = observer(() => {
    const editorEngine = useEditorEngine();
    const panelRef = useRef<HTMLDivElement>(null);
    const [panelWidth, setPanelWidth] = useState(240);
    const [isOpen, setIsOpen] = useState(true);

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
                    <div className="flex-grow"></div>
                    <PinLeftIcon className="text-white cursor-pointer" onClick={() => setIsOpen(false)} />
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
                'fixed left-0 z-50 top-20 transition-width duration-300 opacity-100 bg-black/80',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
                isOpen ? 'w-60 h-full rounded-tr-xl' : 'w-12 h-[5%] rounded-r-xl cursor-pointer'
            )}
            ref={panelRef}
            style={{ width: isOpen?`${panelWidth}px`:'' }}
        >
            {!isOpen&&<div className='w-full h-full flex justify-center items-center cursor-pointer' onClick={()=>setIsOpen(true)}><PinRightIcon className="text-white z-51" /></div>}    
            <div
                className={clsx(
                    'border backdrop-blur shadow h-full relative transition-opacity duration-300 rounded-tr-xl',
                    isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
                )}
            >
                {renderTabs()}
                <div
                    className="absolute -right-1 top-0 h-full w-2 cursor-ew-resize"
                    onMouseDown={startResize}
                />
            </div>
        </div>
    );
});

export default LayersPanel;
