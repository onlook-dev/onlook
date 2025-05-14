import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@onlook/ui/dialog';
import { Icons } from '@onlook/ui/icons';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@onlook/ui/tabs';
import { useState } from 'react';
import { CodeBlock } from './code-block';
import { CodeDiff } from './code-diff';

enum TabValue {
    BLOCK = 'diff',
    DIFF = 'block',
}

export const CodeModal = ({
    fileName,
    value,
    original,
    children,
}: {
    fileName: string;
    value: string;
    original: string;
    children?: React.ReactNode;
}) => {
    const editorEngine = useEditorEngine();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTab, setSelectedTab] = useState(TabValue.DIFF);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="h-[80vh] min-w-[90vw]">
                <DialogTitle className="sr-only">{fileName}</DialogTitle>
                <Tabs value={selectedTab} onValueChange={(val) => setSelectedTab(val as TabValue)}>
                    <TabsList className="w-full justify-start gap-2 bg-transparent">
                        <TabsTrigger
                            value={TabValue.DIFF}
                            className="hover:text-foreground-hover bg-transparent px-1 py-2"
                        >
                            Diffs
                        </TabsTrigger>
                        <TabsTrigger
                            value={TabValue.BLOCK}
                            className="hover:text-foreground-hover bg-transparent px-1 py-2"
                        >
                            Full Code
                        </TabsTrigger>
                        <Button
                            className="ml-auto gap-2"
                            variant={'ghost'}
                            onClick={() => editorEngine.code.viewSourceFile(fileName)}
                        >
                            {'View source'} <Icons.ExternalLink />
                        </Button>
                    </TabsList>
                    <TabsContent value={TabValue.DIFF}>
                        <div className="flex h-[70vh] flex-col space-y-6 overflow-auto rounded border">
                            <CodeDiff originalCode={original} modifiedCode={value} />
                        </div>
                    </TabsContent>
                    <TabsContent value={TabValue.BLOCK}>
                        <div className="flex h-[70vh] flex-col space-y-6 overflow-auto rounded border">
                            <CodeBlock className="h-full" code={value} />
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
};
