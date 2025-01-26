import { useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { CodeBlock } from './CodeBlock';
import CodeModal from './CodeModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { getTruncatedFileName } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CollapsibleCodeBlockProps {
    path: string;
    content: string;
    searchContent: string;
    replaceContent: string;
    applied: boolean;
    isWaiting?: boolean;
    onApply: () => void;
    onRevert: () => void;
}

export function CollapsibleCodeBlock({
    path,
    content,
    searchContent,
    replaceContent,
    applied,
    isWaiting,
    onApply,
    onRevert,
}: CollapsibleCodeBlockProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(replaceContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div className="border rounded-lg bg-background">
                <div className="flex items-center justify-between pl-3 pr-1 py-1">
                    <div className="flex items-center gap-2">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-small pointer-events-none select-none">
                                    {getTruncatedFileName(path)}
                                </span>
                            </TooltipTrigger>
                            <TooltipPortal container={document.getElementById('style-tab-id')}>
                                <TooltipContent>{path}</TooltipContent>
                            </TooltipPortal>
                        </Tooltip>
                    </div>

                    <div className="flex items-center gap-1">
                        {applied ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={onRevert}
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                    >
                                        <Icons.Return className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Revert</TooltipContent>
                            </Tooltip>
                        ) : (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-3 text-teal-200 hover:text-teal-100"
                                onClick={onApply}
                                disabled={isWaiting}
                            >
                                Apply
                            </Button>
                        )}

                        <CollapsibleTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 p-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Icons.ChevronDown
                                            className={cn(
                                                'h-4 w-4 transition-transform duration-200',
                                                isOpen && 'rotate-180',
                                            )}
                                        />
                                    </TooltipTrigger>
                                    <TooltipPortal
                                        container={document.getElementById('style-tab-id')}
                                    >
                                        <TooltipContent>See code</TooltipContent>
                                    </TooltipPortal>
                                </Tooltip>
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </div>

                <CollapsibleContent forceMount>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={
                                isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }
                            }
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div className="border-t">
                                {isWaiting ? (
                                    <code className="p-4 text-xs w-full overflow-x-auto block">
                                        {content}
                                    </code>
                                ) : (
                                    <CodeBlock code={replaceContent} variant="minimal" />
                                )}
                                <div className="flex justify-end gap-2 p-1 border-t">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 px-2"
                                        onClick={copyToClipboard}
                                    >
                                        {copied ? (
                                            <>
                                                <Icons.Check className="h-4 w-4 mr-1" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Icons.Copy className="h-4 w-4 mr-1" />
                                                Copy
                                            </>
                                        )}
                                    </Button>
                                    <CodeModal
                                        fileName={path}
                                        value={replaceContent}
                                        original={searchContent}
                                    >
                                        <Button size="sm" variant="ghost" className="h-6 px-2">
                                            <Icons.Code className="h-4 w-4 mr-1" />
                                            Diffs
                                        </Button>
                                    </CodeModal>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}
