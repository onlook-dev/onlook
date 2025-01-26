import { useState } from 'react';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { CodeBlock } from './CodeBlock';
import CodeModal from './CodeModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { getTruncatedFileName } from '@/lib/utils';

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
            <div className="border rounded-md bg-background">
                <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                        <Icons.Code className="h-4 w-4 text-foreground-secondary" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span className="text-sm font-medium">
                                    {getTruncatedFileName(path)}
                                </span>
                            </TooltipTrigger>
                            <TooltipPortal container={document.getElementById('style-tab-id')}>
                                <TooltipContent>{path}</TooltipContent>
                            </TooltipPortal>
                        </Tooltip>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={copyToClipboard}
                        >
                            {copied ? (
                                <Icons.Check className="h-4 w-4" />
                            ) : (
                                <Icons.Copy className="h-4 w-4" />
                            )}
                        </Button>

                        {applied ? (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-foreground-secondary"
                                onClick={onRevert}
                            >
                                <Icons.Return className="h-4 w-4 mr-1" />
                                Revert
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-teal-200 hover:text-teal-100"
                                onClick={onApply}
                                disabled={isWaiting}
                            >
                                <Icons.Play className="h-4 w-4 mr-1" />
                                Apply
                            </Button>
                        )}

                        <CollapsibleTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7">
                                <Icons.ChevronDown
                                    className={cn(
                                        'h-4 w-4 transition-transform duration-200',
                                        isOpen && 'rotate-180',
                                    )}
                                />
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </div>

                <CollapsibleContent>
                    <div className="border-t">
                        {isWaiting ? (
                            <code className="p-4 text-xs w-full overflow-x-auto block">
                                {content}
                            </code>
                        ) : (
                            <CodeBlock code={replaceContent} variant="minimal" />
                        )}
                        <div className="flex justify-end p-2 border-t">
                            <CodeModal
                                fileName={path}
                                value={replaceContent}
                                original={searchContent}
                            >
                                <Button size="sm" variant="ghost" className="gap-2">
                                    <Icons.Code className="h-4 w-4" />
                                    View Diff
                                </Button>
                            </CodeModal>
                        </div>
                    </div>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
}
