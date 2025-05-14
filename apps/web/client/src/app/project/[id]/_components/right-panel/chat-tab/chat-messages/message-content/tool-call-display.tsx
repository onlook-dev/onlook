import { useUserManager } from '@/components/store/user';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import type { ToolInvocation } from 'ai';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { CodeBlock } from '../../code-change-display/code-block';

export const ToolCallDisplay = observer(
    ({ toolInvocation, isStream }: { toolInvocation: ToolInvocation; isStream: boolean }) => {
        const userManager = useUserManager();
        const [isOpen, setIsOpen] = useState(false);

        const getAnimation = () => {
            if (isStream && userManager.settings.settings?.chat?.expandCodeBlocks) {
                return { height: 'auto', opacity: 1 };
            }
            return isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 };
        };

        const getInvocationCode = () => {
            if (toolInvocation.state === 'result') {
                return JSON.stringify(
                    { inputs: toolInvocation.args, result: toolInvocation.result },
                    null,
                    2,
                );
            }
            return JSON.stringify({ inputs: toolInvocation.args }, null, 2);
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
                                <Icons.ChevronDown
                                    className={cn(
                                        'h-4 w-4 transition-transform duration-200',
                                        isOpen && 'rotate-180',
                                    )}
                                />
                                <span
                                    className={cn(
                                        'text-small pointer-events-none select-none',
                                        isStream && 'text-shimmer',
                                    )}
                                >
                                    Used tool
                                </span>
                            </div>
                        </CollapsibleTrigger>

                        <div className="flex items-center mr-2 px-2 py-0 border rounded-md bg-background-secondary">
                            {toolInvocation.toolName}
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
                                    <CodeBlock code={getInvocationCode()} />
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </CollapsibleContent>
                </div>
            </Collapsible>
        );
    },
);
