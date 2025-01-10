import { useEditorEngine } from '@/components/Context';
import { getTruncatedFileName } from '@/lib/utils';
import { CodeBlockProcessor } from '@onlook/ai';
import type { CodeSearchReplace } from '@onlook/models/chat';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
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
        const [copied, setCopied] = useState(false);
        const codeBlockProcessor = new CodeBlockProcessor();

        const codeDiffs = codeBlockProcessor.parseDiff(content);
        const searchContent = getSearchContent(codeDiffs);
        const replaceContent = getReplaceContent(codeDiffs);

        useEffect(() => {
            if (copied) {
                setTimeout(() => setCopied(false), 2000);
            }
        }, [copied]);

        function getReplaceContent(diffs: CodeSearchReplace[]) {
            let content = '';
            for (const diff of diffs) {
                content += diff.replace + `\n`;
            }
            return content;
        }

        function getSearchContent(diffs: CodeSearchReplace[]) {
            let content = '';
            for (const diff of diffs) {
                content += diff.search + `\n`;
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
                className="flex flex-col border rounded-lg bg-background w-full text-foreground"
                key={path}
            >
                <Tooltip>
                    <TooltipTrigger asChild>
                        <p className="px-2 items-center py-1 m-0 text-foreground-secondary">
                            {getTruncatedFileName(path)}
                        </p>
                    </TooltipTrigger>
                    <TooltipPortal container={document.getElementById('style-tab-id')}>
                        <TooltipContent>{path}</TooltipContent>
                    </TooltipPortal>
                </Tooltip>
                <div className="flex flex-col w-full h-full">
                    {editorEngine.chat.isWaiting ? (
                        <code className="p-0 px-4 text-xs w-full overflow-x-auto">{content}</code>
                    ) : (
                        <CodeBlock code={replaceContent} variant="minimal" />
                    )}
                </div>
                <div
                    className={cn(
                        'flex h-8 items-center',
                        editorEngine.chat.isWaiting && 'invisible',
                    )}
                >
                    <CodeModal fileName={path} value={replaceContent} original={searchContent}>
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
                            className="flex flex-grow rounded-none gap-2 px-1 bg-foreground/10 text-foreground group-hover:bg-foreground/20 group-hover:text-foreground-secondary transition-none"
                            variant={'ghost'}
                            onClick={rejectChange}
                        >
                            <Icons.Return className="text-foreground group-hover:text-foreground-secondary transition-none" />
                            Revert
                        </Button>
                    ) : (
                        <Button
                            size={'sm'}
                            className="group flex flex-grow rounded-none gap-2 px-1 bg-teal-400/20 text-teal-200 hover:bg-teal-400/40 hover:text-teal-100"
                            variant={'ghost'}
                            onClick={applyChange}
                        >
                            <Icons.Play className="text-teal-300 group-hover:text-teal-100 transition-none" />
                            Apply
                        </Button>
                    )}
                </div>
            </div>
        );
    },
);

export default CodeChangeDisplay;
