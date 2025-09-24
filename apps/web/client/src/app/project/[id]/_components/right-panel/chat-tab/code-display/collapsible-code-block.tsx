import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';

import { CodeBlock } from '@onlook/ui/ai-elements';
import { Button } from '@onlook/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { cn, getTruncatedFileName } from '@onlook/ui/utils';

import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';

interface CollapsibleCodeBlockProps {
    path: string;
    content: string;
    messageId: string;
    applied: boolean;
    isStream?: boolean;
    branchId?: string;
}

export const CollapsibleCodeBlock = observer(
    ({ path, content, isStream, branchId }: CollapsibleCodeBlockProps) => {
        const { data: settings } = api.user.settings.get.useQuery();
        const editorEngine = useEditorEngine();
        const [isOpen, setIsOpen] = useState(false);
        const [copied, setCopied] = useState(false);

        const copyToClipboard = () => {
            navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };

        const getAnimation = () => {
            if (isStream && settings?.chat?.expandCodeBlocks) {
                return { height: 'auto', opacity: 1 };
            }
            return isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 };
        };

        return (
            <div className="group relative">
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                    <div
                        className={cn(
                            'bg-background-primary relative rounded-lg border',
                            !isOpen && 'group-hover:bg-background-secondary',
                        )}
                    >
                        <div
                            className={cn(
                                'text-foreground-secondary flex items-center justify-between',
                                !isOpen && 'group-hover:text-foreground-primary',
                            )}
                        >
                            <CollapsibleTrigger asChild>
                                <div className="flex flex-1 cursor-pointer items-center gap-2 py-2 pl-3">
                                    {isStream ? (
                                        <Icons.LoadingSpinner className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Icons.ChevronDown
                                            className={cn(
                                                'h-4 w-4 transition-transform duration-200',
                                                isOpen && 'rotate-180',
                                            )}
                                        />
                                    )}
                                    <div
                                        className={cn(
                                            'text-small pointer-events-none flex min-w-0 items-center overflow-hidden select-none',
                                            isStream && 'text-shimmer',
                                        )}
                                    >
                                        <span className="min-w-0 flex-1 truncate">
                                            {getTruncatedFileName(path)}
                                        </span>
                                        {(() => {
                                            const branch = branchId
                                                ? editorEngine.branches.allBranches.find(
                                                      (b) => b.id === branchId,
                                                  )
                                                : editorEngine.branches.activeBranch;
                                            return (
                                                branch && (
                                                    <span className="text-foreground-tertiary group-hover:text-foreground-secondary text-mini ml-0.5 max-w-24 flex-shrink-0 truncate">
                                                        {' • '}
                                                        {branch.name}
                                                    </span>
                                                )
                                            );
                                        })()}
                                    </div>
                                </div>
                            </CollapsibleTrigger>
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
                                        <CodeBlock
                                            code={content}
                                            language="jsx"
                                            className="overflow-x-auto text-xs"
                                        />
                                        <div className="flex justify-end gap-1.5 border-t p-1">
                                            {' '}
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-foreground-secondary hover:text-foreground h-7 px-2 font-sans select-none"
                                                onClick={copyToClipboard}
                                            >
                                                {copied ? (
                                                    <>
                                                        <Icons.Check className="mr-2 h-4 w-4" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Icons.Copy className="mr-2 h-4 w-4" />
                                                        Copy
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </CollapsibleContent>
                    </div>
                </Collapsible>
            </div>
        );
    },
);
