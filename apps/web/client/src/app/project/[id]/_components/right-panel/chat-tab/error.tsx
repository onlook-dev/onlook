import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';

import type { ParsedError } from '@onlook/utility';
import { ChatType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';

import type { SendMessage } from '../../../_hooks/use-chat';
import { useEditorEngine } from '@/components/store/editor';

interface ErrorSectionProps {
    isStreaming: boolean;
    onSendMessage: SendMessage;
}

export const ErrorSection = observer(({ isStreaming, onSendMessage }: ErrorSectionProps) => {
    const editorEngine = useEditorEngine();
    const [isOpen, setIsOpen] = useState(false);
    const allErrors = editorEngine.branches.getAllErrors();
    const errorCount = editorEngine.branches.getTotalErrorCount();

    const sendFixError = () => {
        toast.promise(
            onSendMessage(
                'How can I resolve these errors? If you propose a fix, please make it concise.',
                ChatType.FIX,
            ),
            {
                error: 'Failed to send fix error message. Please try again.',
            },
        );
    };

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className={cn('m-2 flex flex-col', errorCount === 0 && 'hidden')}
        >
            <div
                className={cn(
                    'relative rounded-lg border border-amber-200 bg-amber-100 dark:border-amber-500/20 dark:bg-amber-950',
                    !isOpen && 'hover:bg-amber-50 dark:hover:bg-amber-900',
                )}
            >
                <div
                    className={cn(
                        'flex items-center justify-between text-amber-800 transition-colors dark:text-amber-200',
                        !isOpen && 'hover:text-amber-600 dark:hover:text-amber-400',
                    )}
                >
                    <CollapsibleTrigger asChild disabled={errorCount === 1}>
                        <div className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 py-2 pl-3">
                            <Icons.ChevronDown
                                className={cn(
                                    'h-4 w-4 shrink-0 text-amber-600 transition-transform duration-200 dark:text-amber-400',
                                    isOpen && 'rotate-180',
                                )}
                            />
                            <div className="min-w-0 flex-1 text-start">
                                <p className="text-small pointer-events-none truncate text-amber-800 select-none dark:text-amber-200">
                                    {errorCount === 1 ? 'Error' : `${errorCount} Errors`}
                                </p>
                                <p className="text-small pointer-events-none hidden max-w-[300px] truncate text-amber-800 select-none dark:text-yellow-200">
                                    {errorCount === 1
                                        ? allErrors[0]?.content
                                        : `You have ${errorCount} errors`}
                                </p>
                            </div>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex shrink-0 items-center gap-1 py-1 pr-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={isStreaming}
                            className="h-7 px-2 font-sans text-amber-600 select-none hover:bg-amber-200 hover:text-amber-900 dark:text-amber-400 dark:hover:bg-amber-700 dark:hover:text-amber-100"
                            onClick={sendFixError}
                        >
                            <Icons.MagicWand className="mr-2 h-4 w-4" />
                            Fix
                        </Button>
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
                            className="border-t border-amber-200/20 dark:border-amber-500/20"
                        >
                            <div className="max-h-60 overflow-auto px-2.5 py-2">
                                {allErrors.map((error: ParsedError) => (
                                    <div
                                        key={`${error.branchId}-${error.content}`}
                                        className="mb-3 font-mono last:mb-0"
                                    >
                                        <div className="mb-1 flex items-center gap-2 text-sm text-amber-800/80 dark:text-amber-200/80">
                                            <span className="truncate">
                                                {error.sourceId} • {error.branchName}
                                            </span>
                                        </div>
                                        <pre className="text-micro text-amber-800/60 dark:text-amber-200/60">
                                            {error.content}
                                        </pre>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </CollapsibleContent>
            </div>
        </Collapsible>
    );
});
