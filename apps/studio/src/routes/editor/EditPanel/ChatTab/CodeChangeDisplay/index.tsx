import { useEditorEngine } from '@/components/Context';
import { getTruncatedFileName } from '@/lib/utils';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/use-toast';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import CodeModal from './CodeModal';

export const CodeChangeDisplay = observer(
    ({ path, content, messageId }: { path: string; content: string; messageId: string }) => {
        const editorEngine = useEditorEngine();
        const [copied, setCopied] = useState(false);
        const isStreaming =
            editorEngine.chat.isWaiting && messageId === editorEngine.chat.streamingMessage?.id;

        useEffect(() => {
            if (copied) {
                setTimeout(() => setCopied(false), 2000);
            }
        }, [copied]);

        async function applyChange() {
            // setChange({ ...change, applied: true });
            // editorEngine.chat.applyGeneratedCode(content);
        }

        async function rejectChange() {
            // setChange({ ...change, applied: false });
            // editorEngine.chat.revertGeneratedCode(content);
        }

        function copyToClipboard(value: string) {
            navigator.clipboard.writeText(value);
            setCopied(true);
            toast({ title: 'Copied to clipboard' });
        }

        return (
            <div className="flex flex-col gap-3 items-center">
                <div className="w-full flex flex-col" key={path}>
                    <div className="rounded border bg-background">
                        <p className="flex px-2 h-8 items-center rounded-t">
                            {getTruncatedFileName(path)}
                        </p>
                        <div className={cn('flex flex-col w-full h-full')}>
                            {editorEngine.chat.isWaiting ? (
                                <pre className="p-4 text-xs text-foreground rounded-lg w-full overflow-x-auto whitespace-pre">
                                    <code>{content}</code>
                                </pre>
                            ) : (
                                <CodeBlock code={content} variant="minimal" />
                            )}
                        </div>
                        <div
                            className={cn(
                                'flex h-8 items-center justify-end',
                                editorEngine.chat.isWaiting && 'invisible',
                            )}
                        >
                            <CodeModal fileName={path} value={content} original={content}>
                                <Button
                                    size={'sm'}
                                    className="w-24 rounded-none gap-2 px-1"
                                    variant={'ghost'}
                                >
                                    <Icons.Size />
                                    Details
                                </Button>
                            </CodeModal>
                            <Button
                                size={'sm'}
                                className="w-24 rounded-none gap-2 px-1"
                                variant={'ghost'}
                                onClick={() => copyToClipboard(content)}
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
                            {/* {change.applied ? (
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
                            )} */}
                        </div>
                    </div>
                </div>
            </div>
        );
    },
);

export default CodeChangeDisplay;
