import { useEditorEngine } from '@/components/Context';
import { getTruncatedFileName } from '@/lib/utils';
import { CodeBlockProcessor } from '@onlook/ai';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/use-toast';
import { cn } from '@onlook/ui/utils';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { CodeBlock } from './CodeBlock';
import CodeModal from './CodeModal';

export const CodeChangeDisplay = observer(
    ({
        path,
        content,
        messageId,
        applied,
    }: {
        path: string;
        content: string;
        messageId: string;
        applied: boolean;
    }) => {
        const editorEngine = useEditorEngine();
        const codeBlockProcessor = new CodeBlockProcessor();
        const codeDiffs = codeBlockProcessor.parseDiff(content);
        const diffedContent = getReplacedContent(codeDiffs);

        const [copied, setCopied] = useState(false);

        useEffect(() => {
            if (copied) {
                setTimeout(() => setCopied(false), 2000);
            }
        }, [copied]);

        function getReplacedContent(
            diffs: {
                search: string;
                replace: string;
            }[],
        ) {
            let content = '';
            for (const diff of diffs) {
                content += diff.replace + `\n`;
            }
            return content;
        }

        function applyChange() {
            editorEngine.chat.code.applyCode(messageId);
        }

        function rejectChange() {
            editorEngine.chat.code.revertCode(messageId);
        }

        function copyToClipboard() {
            navigator.clipboard.writeText(getCopyValue());
            setCopied(true);
            toast({ title: 'Copied to clipboard' });
        }

        function getCopyValue() {
            let value = '';
            for (const diff of codeDiffs) {
                value += diff.replace + `\n`;
            }
            return value;
        }

        return (
            <div
                className="flex flex-col border rounded-sm bg-background w-full text-foreground "
                key={path}
            >
                <p className="px-2 items-center text-foreground">{getTruncatedFileName(path)}</p>
                <div className={cn('flex flex-col w-full h-full')}>
                    {editorEngine.chat.isWaiting ? (
                        <code className="p-0 px-4 text-xs w-full overflow-x-auto">{content}</code>
                    ) : (
                        <CodeBlock code={diffedContent} variant="minimal" />
                    )}
                </div>
                <div
                    className={cn(
                        'flex h-8 items-center',
                        editorEngine.chat.isWaiting && 'invisible',
                    )}
                >
                    <CodeModal fileName={path} value={content} original={content}>
                        <Button
                            size={'sm'}
                            className="flex flex-grow rounded-none gap-2 px-1"
                            variant={'ghost'}
                        >
                            <Icons.Code />
                            Diffs
                        </Button>
                    </CodeModal>
                    <Button
                        size={'sm'}
                        className="flex flex-grow rounded-none gap-2 px-1"
                        variant={'ghost'}
                        onClick={() => copyToClipboard()}
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
                    {applied ? (
                        <Button
                            size={'sm'}
                            className="flex flex-grow rounded-none gap-2 px-1"
                            variant={'ghost'}
                            onClick={rejectChange}
                        >
                            <Icons.CrossL className="text-red" />
                            Revert
                        </Button>
                    ) : (
                        <Button
                            size={'sm'}
                            className="flex flex-grow rounded-none gap-2 px-1"
                            variant={'ghost'}
                            onClick={applyChange}
                        >
                            <Icons.Play className="text-green-400" />
                            Apply
                        </Button>
                    )}
                </div>
            </div>
        );
    },
);

export default CodeChangeDisplay;
