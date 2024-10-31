import { Button } from '@onlook/ui/button';
import { Separator } from '@onlook/ui/separator';
import { Skeleton } from '@onlook/ui/skeleton';
import { toast } from '@onlook/ui/use-toast';
import { getTruncatedFileName } from '@/lib/utils';
import { Icons } from '@onlook/ui/icons';
import { useEffect, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import CodeModal from './CodeModal';
import { MainChannels } from '@onlook/models/constants';
import type { CodeChangeContentBlock, ToolCodeChangeContent } from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';

export default function CodeChangeBlock({ content }: { content: CodeChangeContentBlock }) {
    const [copied, setCopied] = useState(false);
    const [changes, setChanges] = useState(content.changes);

    useEffect(() => {
        if (copied) {
            setTimeout(() => setCopied(false), 2000);
        }
    }, [copied]);

    async function applyChange(change: ToolCodeChangeContent) {
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
        setChanges((prev) =>
            prev.map((c) => {
                if (c.fileName === change.fileName) {
                    return { ...c, applied: true };
                }
                return c;
            }),
        );
    }

    async function rejectChange(change: ToolCodeChangeContent) {
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
        setChanges((prev) =>
            prev.map((c) => {
                if (c.fileName === change.fileName) {
                    return { ...c, applied: false };
                }
                return c;
            }),
        );
    }

    function copyToClipboard(value: string) {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast({ title: 'Copied to clipboard' });
    }

    function renderCodeChangeBlock(change: ToolCodeChangeContent) {
        return (
            <div className="w-full flex flex-col" key={change.fileName}>
                <div className="rounded border bg-background">
                    <p className="flex px-2 h-8 items-center rounded-t">
                        {getTruncatedFileName(change.fileName)}
                    </p>
                    <div className="h-80 w-full">
                        <CodeBlock code={change.value} variant="minimal" />
                    </div>
                    <div className="flex h-8 items-center justify-end">
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
                                onClick={() => rejectChange(change)}
                            >
                                <Icons.CrossL className="text-red" />
                                Revert
                            </Button>
                        ) : (
                            <Button
                                size={'sm'}
                                className="w-24 rounded-none gap-2 px-1"
                                variant={'ghost'}
                                onClick={() => applyChange(change)}
                            >
                                <Icons.Play className="text-green-400" />
                                Apply
                            </Button>
                        )}
                    </div>
                </div>
                <p className="mt-2">{change.description}</p>
            </div>
        );
    }

    function renderLoadingChange(change: ToolCodeChangeContent) {
        return (
            <div className="w-full flex flex-col" key={change.fileName}>
                <div className="rounded border bg-background">
                    <p className="flex px-2 h-8 items-center rounded-t">
                        <Icons.Shadow className="animate-spin mr-2" /> {'Generating code...'}
                    </p>
                    <Separator />
                    <div className="flex flex-col h-fit w-full p-4 gap-2.5">
                        <Skeleton className="w-5/6 h-2 rounded-full" />
                        <Skeleton className="w-full h-2 rounded-full" />
                        <Skeleton className="w-4/5 h-2 rounded-full" />
                    </div>
                </div>
                <p className="mt-2">{change.description}</p>
            </div>
        );
    }

    return (
        <div key={content.id} className="flex flex-col gap-3 items-center">
            {changes.map((change) =>
                change.loading ? renderLoadingChange(change) : renderCodeChangeBlock(change),
            )}
        </div>
    );
}
