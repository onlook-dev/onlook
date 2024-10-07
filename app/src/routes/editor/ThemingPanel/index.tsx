import { useEditorEngine } from '@/components/Context';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorMode } from '@/lib/models';
import { BlendingModeIcon, PinLeftIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { capitalizeFirstLetter } from '/common/helpers';
import AssetsTab from './AssetsTab';
import VariablesTab from './VariablesTab';

interface ThemingPanelProps {
    openPanel: 'layers' | 'theming' | null;
    setOpenPanel: React.Dispatch<React.SetStateAction<'layers' | 'theming' | null>>;
}

const ThemingPanel = observer(({ openPanel, setOpenPanel }: ThemingPanelProps) => {
    const editorEngine = useEditorEngine();
    enum TabValue {
        ASSETS = 'assets',
        VARIABLES = 'variables',
    }
    const selectedTab: string = TabValue.ASSETS;
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (openPanel === 'theming') {
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    }, [openPanel]);

    function renderTabs() {
        return (
            <Tabs defaultValue={selectedTab}>
                <TabsList className="bg-transparent w-full gap-2 select-none justify-start pr-1 pl-3 pt-2">
                    <BlendingModeIcon />
                    <TabsTrigger
                        className="bg-transparent py-2 px-1 text-xs hover:text-text-hover"
                        value={TabValue.ASSETS}
                    >
                        {capitalizeFirstLetter(TabValue.ASSETS)}
                    </TabsTrigger>
                    <TabsTrigger
                        className="bg-transparent py-2 px-1 text-xs hover:text-text-hover"
                        value={TabValue.VARIABLES}
                    >
                        {capitalizeFirstLetter(TabValue.VARIABLES)}
                    </TabsTrigger>
                    <div className="flex-grow"></div>
                    <button
                        className="text-default rounded-lg p-2 bg-transparent hover:text-text-hover"
                        onClick={() => setOpenPanel(null)}
                    >
                        <PinLeftIcon />
                    </button>
                </TabsList>
                <Separator className="mt-1" />
                <div className="h-[calc(100vh-7.75rem)] overflow-auto mx-2">
                    <TabsContent value={TabValue.ASSETS}>
                        <AssetsTab />
                    </TabsContent>
                    <TabsContent value={TabValue.VARIABLES}>
                        <VariablesTab />
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
                isOpen ? 'w-full h-[calc(90vh-5rem)]' : 'w-12 h-12 rounded-r-xl cursor-pointer',
            )}
        >
            {!isOpen && (
                <div
                    className="w-full h-full flex justify-center items-center text-white hover:text-text"
                    onClick={() => setOpenPanel('theming')}
                >
                    <BlendingModeIcon className="z-51" />
                </div>
            )}
            <div
                className={clsx(
                    'border backdrop-blur shadow h-full relative transition-opacity duration-300 rounded-r-xl',
                    isOpen ? 'opacity-100 visible' : 'opacity-0 hidden',
                )}
            >
                {renderTabs()}
            </div>
        </div>
    );
});

export default ThemingPanel;
