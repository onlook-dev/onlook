import { useEditorEngine } from '@/components/Context';
import { Button } from '@onlook/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

export const ErrorView = observer(() => {
    const editorEngine = useEditorEngine();
    const [isOpen, setIsOpen] = useState(false);
    const errorCount = editorEngine.errors.errors.length;

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className={cn(
                'flex flex-col m-2',
                errorCount === 0 && 'hidden',
                !editorEngine.errors.shouldShowErrors && 'hidden',
            )}
        >
            <div
                className={cn(
                    'border rounded-lg bg-amber-100 dark:bg-amber-950 relative border-amber-200 dark:border-amber-500/20',
                    !isOpen && 'hover:bg-amber-50 dark:hover:bg-amber-900',
                )}
            >
                <div
                    className={cn(
                        'flex items-center justify-between text-amber-800 dark:text-amber-200 transition-colors',
                        !isOpen && 'hover:text-amber-600 dark:hover:text-amber-400',
                    )}
                >
                    <CollapsibleTrigger asChild disabled={errorCount === 1}>
                        <div className="flex-1 flex items-center gap-2 cursor-pointer pl-3 py-2 min-w-0">
                            <Icons.ChevronDown
                                className={cn(
                                    'h-4 w-4 shrink-0 transition-transform duration-200 text-amber-600 dark:text-amber-400',
                                    isOpen && 'rotate-180',
                                )}
                            />
                            <div className="text-start min-w-0 flex-1">
                                <div className="text-amber-800 dark:text-amber-200 truncate text-small pointer-events-none select-none">
                                    {errorCount === 1 ? 'Error' : `${errorCount} Errors`}
                                </div>
                                <div className="text-amber-800 dark:text-yellow-200 hidden truncate text-small pointer-events-none select-none max-w-[300px]">
                                    {errorCount === 1
                                        ? editorEngine.errors.errors[0].message
                                        : `You have ${errorCount} errors`}
                                </div>
                            </div>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1 pr-1 py-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={editorEngine.chat.isWaiting}
                            className="h-7 px-2 text-amber-600 dark:text-amber-400 hover:text-amber-900 hover:bg-amber-200 dark:hover:text-amber-100 dark:hover:bg-amber-700 font-sans select-none"
                            onClick={(e) => {
                                e.stopPropagation();
                                editorEngine.errors.sendFixError();
                            }}
                        >
                            <Icons.MagicWand className="h-4 w-4 mr-2" />
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
                            <div className="px-2.5 py-2">
                                {editorEngine.errors.errors.map((error) => (
                                    <div key={error.message} className="mb-3 last:mb-0 font-mono">
                                        <div className="text-miniPlus text-amber-800/80 dark:text-amber-200/80 mb-1 truncate">
                                            {error.sourceId}
                                        </div>
                                        <div className="text-micro text-amber-800/60 dark:text-amber-200/60">
                                            {error.message}
                                        </div>
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
