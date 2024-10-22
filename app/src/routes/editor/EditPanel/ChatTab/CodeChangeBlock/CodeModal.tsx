import { useEditorEngine } from '@/components/Context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import { CodeDiff } from './CodeDiff';

enum TabValue {
    BLOCK = 'diff',
    DIFF = 'block',
}

export default function CodeModal({
    fileName,
    newValue,
    children,
}: {
    fileName: string;
    newValue: string;
    children?: React.ReactNode;
}) {
    const editorEngine = useEditorEngine();
    const [oldValue, setOldValue] = useState(newValue);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTab, setSelectedTab] = useState(TabValue.BLOCK);

    useEffect(() => {
        if (!fileName) {
            return;
        }
        console.log(fileName);
        editorEngine.code.getFileContent(fileName).then((content) => {
            if (content) {
                console.log(content);
                setOldValue(content);
            }
        });
    }, [fileName]);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="min-w-[90vw] h-[80vh]">
                <Tabs
                    value={selectedTab}
                    onValueChange={(value) => setSelectedTab(value as TabValue)}
                >
                    <TabsList className="bg-transparent w-full gap-2 justify-start">
                        <TabsTrigger
                            value={TabValue.BLOCK}
                            className="bg-transparent py-2 px-1 hover:text-foreground-hover"
                        >
                            Block
                        </TabsTrigger>
                        <TabsTrigger
                            value={TabValue.DIFF}
                            className="bg-transparent py-2 px-1 hover:text-foreground-hover"
                        >
                            Diff
                        </TabsTrigger>
                        <Button
                            className="ml-auto gap-2"
                            variant={'ghost'}
                            onClick={() => editorEngine.code.viewSourceFile(fileName)}
                        >
                            {' '}
                            View source <ExternalLinkIcon />
                        </Button>
                    </TabsList>
                    <TabsContent value={TabValue.BLOCK}>
                        <div className="flex flex-col space-y-6 h-[70vh] overflow-auto border rounded">
                            <CodeBlock code={newValue} />
                        </div>
                    </TabsContent>
                    <TabsContent value={TabValue.DIFF}>
                        <div className="flex flex-col space-y-6 h-[70vh] overflow-auto border rounded">
                            <CodeDiff originalCode={oldValue} modifiedCode={newValue} />
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
