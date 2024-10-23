import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { getTruncatedFileName } from '@/lib/utils';
import { CheckIcon, CopyIcon, Cross1Icon, PlayIcon, SizeIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import CodeModal from './CodeModal';
import { MainChannels } from '/common/constants';
import { CodeChangeContentBlock, ToolCodeChangeContent } from '/common/models/chat/message/content';
import { CodeDiff } from '/common/models/code';

export default function CodeChangeBlock({ content }: { content: CodeChangeContentBlock }) {
    const [copied, setCopied] = useState(false);
    const [applied, setApplied] = useState(false);

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

        setApplied(true);
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

        setApplied(false);
    }

    function copyToClipboard(value: string) {
        navigator.clipboard.writeText(value);
        setCopied(true);
        toast({ title: 'Copied to clipboard' });
    }

    return (
        <div key={content.id} className="flex flex-col gap-3 items-center">
            {content.changes.map((change) => (
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
                                    <SizeIcon />
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
                                        <CheckIcon />
                                        {'Copied'}
                                    </>
                                ) : (
                                    <>
                                        <CopyIcon />
                                        {'Copy'}
                                    </>
                                )}
                            </Button>
                            {applied ? (
                                <Button
                                    size={'sm'}
                                    className="w-24 rounded-none gap-2 px-1"
                                    variant={'ghost'}
                                    onClick={() => rejectChange(change)}
                                >
                                    <Cross1Icon className="text-red" />
                                    Revert
                                </Button>
                            ) : (
                                <Button
                                    size={'sm'}
                                    className="w-24 rounded-none gap-2 px-1"
                                    variant={'ghost'}
                                    onClick={() => applyChange(change)}
                                >
                                    <PlayIcon className="text-green-400" />
                                    Apply
                                </Button>
                            )}
                        </div>
                    </div>
                    <p className="mt-2">{change.description}</p>
                </div>
            ))}
        </div>
    );
}
