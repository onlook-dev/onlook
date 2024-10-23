import { useEditorEngine } from '@/components/Context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import { CodeBlock } from './CodeBlock';
import { CodeDiff } from './CodeDiff';

enum TabValue {
    BLOCK = 'diff',
    DIFF = 'block',
}

export default function CodeModal({
    fileName,
    value,
    original,
    children,
}: {
    fileName: string;
    value: string;
    original: string;
    children?: React.ReactNode;
}) {
    const editorEngine = useEditorEngine();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTab, setSelectedTab] = useState(TabValue.BLOCK);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="min-w-[90vw] h-[80vh]">
                <Tabs value={selectedTab} onValueChange={(val) => setSelectedTab(val as TabValue)}>
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
                            {'View source'} <ExternalLinkIcon />
                        </Button>
                    </TabsList>
                    <TabsContent value={TabValue.BLOCK}>
                        <div className="flex flex-col space-y-6 h-[70vh] overflow-auto border rounded">
                            <CodeBlock code={value} />
                        </div>
                    </TabsContent>
                    <TabsContent value={TabValue.DIFF}>
                        <div className="flex flex-col space-y-6 h-[70vh] overflow-auto border rounded">
                            <CodeDiff originalCode={original} modifiedCode={value} />
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
