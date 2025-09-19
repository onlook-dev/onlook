import { useEditorEngine } from '@/components/store/editor';
import { api } from '@/trpc/react';
import { Button } from '@onlook/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { cn, getTruncatedFileName } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { CodeBlock } from './code-block';

interface CollapsibleCodeBlockProps {
    path: string;
    content: string;
    messageId: string;
    originalContent: string;
    updatedContent: string;
    applied: boolean;
    isStream?: boolean;
    branchId?: string;
}

export const CollapsibleCodeBlock = observer(({
    path,
    content,
    messageId,
    updatedContent,
    applied,
    isStream,
    branchId,
}: CollapsibleCodeBlockProps) => {
    const { data: settings } = api.user.settings.get.useQuery();
    const editorEngine = useEditorEngine();
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(updatedContent);
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
                        'border rounded-lg bg-background-primary relative',
                        !isOpen && 'group-hover:bg-background-secondary',
                    )}
                >
                    <div
                        className={cn(
                            'flex items-center justify-between text-foreground-secondary',
                            !isOpen && 'group-hover:text-foreground-primary',
                        )}
                    >
                        <CollapsibleTrigger asChild>
                            <div className="flex-1 flex items-center gap-2 cursor-pointer pl-3 py-2">
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
                                        'text-small pointer-events-none select-none flex items-center min-w-0 overflow-hidden',
                                        isStream && 'text-shimmer',
                                    )}
                                >
                                    <span className="truncate flex-1 min-w-0">{getTruncatedFileName(path)}</span>
                                    {(() => {
                                        const branch = branchId
                                            ? editorEngine.branches.allBranches.find(b => b.id === branchId)
                                            : editorEngine.branches.activeBranch;
                                        return branch && (
                                            <span className="text-foreground-tertiary group-hover:text-foreground-secondary text-mini ml-0.5 flex-shrink-0 truncate max-w-24">
                                                {' • '}{branch.name}
                                            </span>
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
                                    <CodeBlock code={updatedContent} />
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
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </CollapsibleContent>
                </div>
            </Collapsible>
        </div >
    );
});
