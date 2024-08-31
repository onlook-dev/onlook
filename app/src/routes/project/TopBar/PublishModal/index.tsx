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
import { sendAnalytics } from '@/lib/utils';
import { CodeIcon, ExternalLinkIcon, ShadowIcon } from '@radix-ui/react-icons';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { useEditorEngine } from '../..';
import { MainChannels, WebviewChannels } from '/common/constants';
import { CodeDiff } from '/common/models/code';
import { TemplateNode } from '/common/models/element/templateNode';

const PublishModal = observer(() => {
    const editorEngine = useEditorEngine();
    const { toast } = useToast();

    const [isOpen, setIsOpen] = useState(false);
    const [isLoadingCodeDiff, setIsLoadingCodeDiff] = useState(false);
    const [isWriting, setIsWriting] = useState(false);
    const [codeDiffs, setCodeDiffs] = useState<CodeDiff[]>([]);

    async function handleOpenChange(open: boolean) {
        setIsOpen(open);
        if (open) {
            setIsLoadingCodeDiff(true);
            const res = await editorEngine.code.generateCodeDiffs();
            setIsLoadingCodeDiff(false);
            setCodeDiffs(res);
        }
    }

    function viewSource(path: string) {
        const templateNode = createTemplateNodeFromPath(path);
        editorEngine.code.viewSource(templateNode);
    }

    function createTemplateNodeFromPath(path: string): TemplateNode {
        return {
            path,
            startTag: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
            },
        };
    }
    function handleWriteSucceeded() {
        setIsWriting(false);
        setIsOpen(false);
        setCodeDiffs([]);
        editorEngine.webviews.getAll().forEach((webview) => {
            webview.send(WebviewChannels.CLEAN_AFTER_WRITE_TO_CODE);
        });

        toast({
            title: 'Write successful!',
            description: `${codeDiffs.length} change(s) written to codebase`,
        });
    }

    function handleWriteFailed() {
        setIsWriting(false);
        toast({
            title: 'Write failed!',
            description: 'Failed to write changes to codebase',
        });
    }

    async function writeCodeBlock() {
        setIsWriting(true);
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);
        if (res) {
            handleWriteSucceeded();
        } else {
            handleWriteFailed();
        }
        setTimeout(refreshDom, 500);
        sendAnalytics('write code');
    }

    async function refreshDom() {
        const webviews = editorEngine.webviews.getAll();
        for (const webview of webviews) {
            const body = await editorEngine.dom.getBodyFromWebview(webview);
            editorEngine.dom.setDom(webview.id, body);
        }
    }

    function renderDescription() {
        return codeDiffs.length === 0 ? (
            <span>
                No code changes detected. Make some changes in the editor to see differences.
            </span>
        ) : (
            <span>Review and apply the changes to your codebase</span>
        );
    }
    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="">
                    <CodeIcon className="mr-2" /> Publish Code
                </Button>
            </DialogTrigger>
            <DialogContent className="min-w-[60vw] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>
                        {isLoadingCodeDiff ? 'Generating code...' : 'Review code change'}
                    </DialogTitle>
                    <DialogDescription>
                        {isLoadingCodeDiff && !codeDiffs.length ? (
                            <ShadowIcon className="animate-spin w-10 h-10 m-auto mt-12 mb-6" />
                        ) : (
                            renderDescription()
                        )}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col space-y-6 max-h-96 overflow-auto">
                    {codeDiffs.map((item, index) => (
                        <div key={index} className="flex flex-col space-y-2">
                            <Button
                                variant="link"
                                className="truncate justify-start"
                                onClick={() => viewSource(item.path)}
                            >
                                {item.path} <ExternalLinkIcon className="ml-2" />{' '}
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
                    <Button
                        disabled={isWriting || codeDiffs.length === 0}
                        onClick={writeCodeBlock}
                        type="submit"
                    >
                        {isWriting ? (
                            <>
                                Writing...
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
