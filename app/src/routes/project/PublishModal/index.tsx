import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { CodeIcon, ExternalLinkIcon, ShadowIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useEditorEngine } from '..';
import { MainChannels, WebviewChannels } from '/common/constants';
import { CodeResult, TemplateNode } from '/common/models';

const PublishModal = observer(() => {
    const editorEngine = useEditorEngine();
    const [codeResult, setCodeResult] = useState<CodeResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    async function onOpenChange(open: boolean) {
        setOpen(open);
        if (open) {
            const res = await editorEngine.code.generateCodeDiffs();
            setCodeResult(res);
        }
    }

    function openCodeBlock(templateNode: TemplateNode) {
        editorEngine.code.viewInEditor(templateNode);
    }

    function handleWriteSucceeded() {
        setLoading(false);
        setOpen(false);
        setCodeResult([]);
        editorEngine.webviews.getAll().forEach((webview) => {
            webview.send(WebviewChannels.CLEAR_STYLE_SHEET);
        });

        toast({
            title: 'Write successful!',
            description: `${codeResult.length} change(s) written to codebase`,
        });
    }

    async function writeCodeBlock() {
        setLoading(true);
        const res = await window.Main.invoke(MainChannels.WRITE_CODE_BLOCK, codeResult);
        handleWriteSucceeded();
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="">
                    <CodeIcon className="mr-2" /> Publish Code
                </Button>
            </DialogTrigger>
            <DialogContent className="min-w-[60vw] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Review code change</DialogTitle>
                    <DialogDescription>
                        Review and apply the changes to your codebase
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-6 max-h-96 overflow-auto">
                    {codeResult.map((item, index) => (
                        <div key={index} className="flex flex-col space-y-2">
                            <Button
                                variant="link"
                                className="truncate justify-start"
                                onClick={() => openCodeBlock(item.param.templateNode)}
                            >
                                {item.param.templateNode.path} <ExternalLinkIcon className="ml-2" />{' '}
                            </Button>
                            <div className="border">
                                <ReactDiffViewer
                                    styles={{
                                        variables: {
                                            dark: {
                                                diffViewerBackground: '#000',
                                                gutterBackground: '#000',
                                                addedBackground: '#003300',
                                                removedBackground: '#330000',
                                                wordAddedBackground: '#006b0c',
                                                wordRemovedBackground: '#6b0000',
                                            },
                                        },
                                        line: {
                                            fontSize: '14px',
                                        },
                                        gutter: {
                                            fontSize: '14px',
                                        },
                                    }}
                                    useDarkTheme
                                    oldValue={item.original}
                                    newValue={item.generated}
                                    splitView={true}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <Button disabled={loading} onClick={writeCodeBlock} type="submit">
                        {loading ? (
                            <>
                                "Writing..."
                                <ShadowIcon className="animate-spin" />
                            </>
                        ) : (
                            'Write to code'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});
export default PublishModal;
