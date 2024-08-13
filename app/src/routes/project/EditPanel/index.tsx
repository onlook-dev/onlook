import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditorMode } from '@/lib/models';
import { MagicWandIcon } from '@radix-ui/react-icons';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { useEditorEngine } from '..';
import ManualTab from './ManualTab';

const EditPanel = observer(() => {
    const editorEngine = useEditorEngine();
    enum TabValue {
        MANUAL = 'manual',
        ASSISTED = 'assisted',
    }
    const selectedTab: string = TabValue.MANUAL;

    function renderEmptyState() {
        return (
            <div className="text-sm pt-96 flex items-center justify-center text-center opacity-70">
                Select an element to edit
            </div>
        );
    }

    function renderTabs() {
        return (
            <Tabs defaultValue={selectedTab}>
                <TabsList className="bg-transparent w-full p-0 gap-4 select-none justify-start px-4">
                    <TabsTrigger className="bg-transparent p-0 text-xs" value={TabValue.MANUAL}>
                        Set Styles
                    </TabsTrigger>
                    <TabsTrigger className="bg-transparent p-0 text-xs" value={TabValue.ASSISTED}>
                        <MagicWandIcon className="mr-2" />
                        AI Styles
                    </TabsTrigger>
                </TabsList>
                <Separator className="mt-1" />
                <div className="h-[calc(100vh-7.75rem)] overflow-auto">
                    <TabsContent value={TabValue.MANUAL}>
                        {editorEngine.elements.selected.length > 0 ? (
                            <ManualTab />
                        ) : (
                            renderEmptyState()
                        )}
                    </TabsContent>
                    <TabsContent value={TabValue.ASSISTED}>
                        <div className="w-full pt-96 text-sm text-center opacity-70">
                            Coming soon
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        );
    }
    return (
        <div
            className={clsx(
                'border max-w-60 min-w-60 bg-black/80 backdrop-blur rounded-tl-xl shadow',
                editorEngine.mode === EditorMode.INTERACT ? 'hidden' : 'visible',
            )}
        >
            {renderTabs()}
        </div>
    );
});

export default EditPanel;
