import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { AnimatePresence, motion } from 'motion/react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';

interface SearchResult {
    title: string;
    url: string;
}

interface SearchSourcesDisplayProps {
    query: string;
    results: SearchResult[];
}

export const SearchSourcesDisplay = observer(({ query, results }: SearchSourcesDisplayProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <div className="text-foreground-secondary flex cursor-pointer items-center gap-2 p-1 text-sm">
                        <Icons.ChevronDown
                            className={cn(
                                'text-foreground-tertiary h-4 w-4 min-w-4 transition-transform duration-200',
                                isOpen && 'rotate-180',
                            )}
                        />
                        <div className="flex flex-col">
                            <span>Searched web</span>
                            <span className="text-foreground-tertiary truncate text-xs">
                                {query}
                            </span>
                        </div>
                    </div>
                </CollapsibleTrigger>
                <AnimatePresence>
                    {isOpen && (
                        <CollapsibleContent asChild>
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                    height: { duration: 0.2 },
                                    opacity: { duration: 0.15 },
                                }}
                                className="overflow-hidden"
                            >
                                <div>
                                    <div className="px-2 py-1">
                                        {results.map((result, index) => (
                                            <div key={index} className="group/source">
                                                <a
                                                    href={result.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:bg-background-secondary/50 block rounded px-2 py-1 transition-colors"
                                                >
                                                    <div className="flex items-center text-xs">
                                                        <span
                                                            className="text-foreground-secondary hover:text-foreground flex-shrink-0 truncate font-medium"
                                                            style={{
                                                                minWidth: '120px',
                                                                maxWidth: '70%',
                                                            }}
                                                        >
                                                            {result.title}
                                                        </span>
                                                        <span className="text-foreground-tertiary min-w-0 flex-1 truncate pl-1">
                                                            {result.url}
                                                        </span>
                                                    </div>
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        </CollapsibleContent>
                    )}
                </AnimatePresence>
            </Collapsible>
        </div>
    );
});
