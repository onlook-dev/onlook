import { useEditorEngine } from '@/components/Context';
import { getTruncatedFileName } from '@/lib/utils';
import type { CodeChangeBlock } from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/use-toast';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import CodeModal from './CodeModal';

export const CodeChangeDisplay = observer(({ content }: { content: CodeChangeBlock }) => {
    const editorEngine = useEditorEngine();
    const [copied, setCopied] = useState(false);
    const [change, setChange] = useState(content);

    useEffect(() => {
        if (copied) {
            setTimeout(() => setCopied(false), 2000);
        }
    }, [copied]);

    async function applyChange() {
        const codeDiff: CodeDiff[] = [
            {
                path: change.fileName,
                original: change.original,
                generated: change.value,
            },
        ];
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiff);
        if (!res) {
            toast({ title: 'Failed to apply code change' });
            return;
        }

        // TODO: Write state back to object
        setChange({ ...change, applied: true });
    }

    async function rejectChange() {
        const codeDiff: CodeDiff[] = [
            {
                path: change.fileName,
                original: change.value,
                generated: change.original,
            },
        ];
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiff);
        if (!res) {
            toast({ title: 'Failed to revert code change' });
            return;
        }

        // TODO: Write state back to object
        setChange({ ...change, applied: false });
    }

    function copyToClipboard(value: string) {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast({ title: 'Copied to clipboard' });
    }

    return (
        <div className="flex flex-col gap-3 items-center">
            <div className="w-full flex flex-col" key={change.fileName}>
                <div className="rounded border bg-background">
                    <p className="flex px-2 h-8 items-center rounded-t">
                        {getTruncatedFileName(change.fileName)}
                    </p>
                    <div className="flex flex-col h-80 w-full">
                        {editorEngine.chat.isWaiting ? (
                            <pre className="p-4 text-xs text-foreground rounded-lg w-full overflow-x-auto whitespace-pre">
                                <code>{change.value}</code>
                            </pre>
                        ) : (
                            <CodeBlock code={change.value} variant="minimal" />
                        )}
                    </div>
                    <div
                        className={cn(
                            'flex h-8 items-center justify-end',
                            editorEngine.chat.isWaiting && 'invisible',
                        )}
                    >
                        <CodeModal
                            fileName={change.fileName}
                            value={change.value}
                            original={change.original}
                        >
                            <Button
                                size={'sm'}
                                className="w-24 rounded-none gap-2 px-1"
                                variant={'ghost'}
                            >
                                <Icons.Size />
                                Expand
                            </Button>
                        </CodeModal>
                        <Button
                            size={'sm'}
                            className="w-24 rounded-none gap-2 px-1"
                            variant={'ghost'}
                            onClick={() => copyToClipboard(change.value)}
                        >
                            {copied ? (
                                <>
                                    <Icons.Check />
                                    {'Copied'}
                                </>
                            ) : (
                                <>
                                    <Icons.Copy />
                                    {'Copy'}
                                </>
                            )}
                        </Button>
                        {change.applied ? (
                            <Button
                                size={'sm'}
                                className="w-24 rounded-none gap-2 px-1"
                                variant={'ghost'}
                                onClick={rejectChange}
                            >
                                <Icons.CrossL className="text-red" />
                                Revert
                            </Button>
                        ) : (
                            <Button
                                size={'sm'}
                                className="w-24 rounded-none gap-2 px-1"
                                variant={'ghost'}
                                onClick={applyChange}
                            >
                                <Icons.Play className="text-green-400" />
                                Apply
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default CodeChangeDisplay;
