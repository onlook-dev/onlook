import { useEditorEngine } from '@/components/store/editor';
import { ChatType } from '@onlook/models';
import { Button } from '@onlook/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { useChatContext } from '../../../_hooks/use-chat';

export const ErrorSection = observer(() => {
    const { isWaiting, sendMessage } = useChatContext();
    const editorEngine = useEditorEngine();
    const [isOpen, setIsOpen] = useState(false);
    const errorCount = editorEngine.error.errors.length;

    const sendFixError = async () => {
        try {
            const message = await editorEngine.chat.addFixErrorMessage();
            sendMessage(ChatType.FIX);
        } catch (error) {
            console.error('Error sending fix error message', error);
            toast.error('Failed to send fix error message. Please try again.');
        }
    }

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className={cn(
                'flex flex-col m-2',
                (errorCount === 0 || editorEngine.error.hideErrors) && 'hidden',
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
                                <p className="text-amber-800 dark:text-amber-200 truncate text-small pointer-events-none select-none">
                                    {errorCount === 1 ? 'Error' : `${errorCount} Errors`}
                                </p>
                                <p className="text-amber-800 dark:text-yellow-200 hidden truncate text-small pointer-events-none select-none max-w-[300px]">
                                    {errorCount === 1
                                        ? editorEngine.error.errors[0]?.content
                                        : `You have ${errorCount} errors`}
                                </p>
                            </div>
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-1 pr-1 py-1 shrink-0">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={isWaiting}
                            className="h-7 px-2 text-amber-600 dark:text-amber-400 hover:text-amber-900 hover:bg-amber-200 dark:hover:text-amber-100 dark:hover:bg-amber-700 font-sans select-none"
                            onClick={sendFixError}
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
                            <div className="px-2.5 py-2 max-h-60 overflow-auto">
                                {editorEngine.error.errors.map((error) => (
                                    <div key={error.content} className="mb-3 last:mb-0 font-mono">
                                        <div className="text-miniPlus text-amber-800/80 dark:text-amber-200/80 mb-1 truncate">
                                            {error.sourceId}
                                        </div>
                                        <div className="text-micro text-amber-800/60 dark:text-amber-200/60">
                                            {error.content}
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
