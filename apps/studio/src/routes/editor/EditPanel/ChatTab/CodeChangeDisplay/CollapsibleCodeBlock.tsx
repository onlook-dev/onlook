import { useUserManager } from '@/components/Context';
import { getTruncatedFileName } from '@/lib/utils';
import { Button } from '@onlook/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { CodeBlock } from './CodeBlock';
import CodeModal from './CodeModal';

interface CollapsibleCodeBlockProps {
    path: string;
    content: string;
    searchContent: string;
    replaceContent: string;
    applied: boolean;
    isStream?: boolean;
    onApply: () => void;
    onRevert: () => void;
}

export function CollapsibleCodeBlock({
    path,
    content,
    searchContent,
    replaceContent,
    applied,
    isStream,
    onApply,
    onRevert,
}: CollapsibleCodeBlockProps) {
    const userManager = useUserManager();
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(replaceContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getAnimation = () => {
        if (isStream && userManager.settings?.chatSettings?.expandCodeBlocks) {
            return { height: 'auto', opacity: 1 };
        }
        return isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 };
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div
                className={cn(
                    'border rounded-lg bg-background-primary relative',
                    !isOpen && 'group-hover:bg-background-secondary',
                )}
            >
                <div
                    className={cn(
                        'flex items-center justify-between text-foreground-secondary transition-colors',
                        !isOpen && 'group-hover:text-foreground-primary',
                    )}
                >
                    <CollapsibleTrigger asChild>
                        <div className="flex-1 flex items-center gap-2 cursor-pointer pl-3 py-2">
                            {isStream ? (
                                <Icons.Shadow className="h-4 w-4 animate-spin" />
                            ) : (
                                <Icons.ChevronDown
                                    className={cn(
                                        'h-4 w-4 transition-transform duration-200',
                                        isOpen && 'rotate-180',
                                    )}
                                />
                            )}
                            <span
                                className={cn(
                                    'text-small pointer-events-none select-none',
                                    isStream && 'text-shimmer',
                                )}
                            >
                                {getTruncatedFileName(path)}
                            </span>
                        </div>
                    </CollapsibleTrigger>

                    <div className="flex items-center gap-1 pr-1 py-1">
                        {applied ? (
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRevert();
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-7 px-3 text-foreground-secondary hover:text-foreground font-sans select-none"
                            >
                                <Icons.Return className="h-4 w-4 mr-2" />
                                Revert
                            </Button>
                        ) : (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-3 dark:text-teal-200 dark:bg-teal-900/80 dark:border-teal-600 text-teal-700 bg-teal-50 border-teal-300 border-[0.5px] dark:hover:border-teal-400 dark:hover:text-teal-100 dark:hover:bg-teal-700 hover:bg-teal-100 hover:border-teal-400 hover:text-teal-800 transition-all font-sans select-none"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onApply();
                                }}
                                disabled={isStream}
                            >
                                <Icons.Sparkles className="h-4 w-4 mr-2" />
                                Apply
                            </Button>
                        )}
                    </div>
                </div>

                <CollapsibleContent forceMount>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="content"
                            initial={getAnimation()}
                            animate={getAnimation()}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div className="border-t">
                                {isStream ? (
                                    <code className="p-4 text-xs w-full overflow-x-auto block">
                                        {content}
                                    </code>
                                ) : (
                                    <CodeBlock code={replaceContent} variant="minimal" />
                                )}
                                <div className="flex justify-end gap-1.5 p-1 border-t">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-foreground-secondary hover:text-foreground font-sans select-none"
                                        onClick={copyToClipboard}
                                    >
                                        {copied ? (
                                            <>
                                                <Icons.Check className="h-4 w-4 mr-2" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Icons.Copy className="h-4 w-4 mr-2" />
                                                Copy
                                            </>
                                        )}
                                    </Button>
                                    <CodeModal
                                        fileName={path}
                                        value={replaceContent}
                                        original={searchContent}
                                    >
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 px-2 text-foreground-secondary hover:text-foreground font-sans select-none"
                                        >
                                            <Icons.Code className="h-4 w-4 mr-2" />
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
