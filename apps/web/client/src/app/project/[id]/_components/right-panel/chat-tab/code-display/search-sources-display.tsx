import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

interface SearchResult {
    title: string;
    url: string;
}

interface SearchSourcesDisplayProps {
    query: string;
    results: SearchResult[];
}

export const SearchSourcesDisplay = observer(({
    query,
    results,
}: SearchSourcesDisplayProps) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="overflow-hidden">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CollapsibleTrigger asChild>
                    <div className="flex items-center p-1 cursor-pointer gap-2 text-sm text-foreground-secondary">
                        <Icons.ChevronDown
                            className={cn(
                                "min-w-4 h-4 w-4 text-foreground-tertiary transition-transform duration-200",
                                isOpen && "rotate-180"
                            )}
                        />
                        <div className="flex flex-col">
                            <span>Searched web</span>
                            <span className="text-foreground-tertiary text-xs">
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
                                    opacity: { duration: 0.15 }
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
                                                    className="block px-2 py-1 rounded hover:bg-background-secondary/50 transition-colors"
                                                >
                                                    <div className="flex items-center text-xs">
                                                        <span className="text-foreground-secondary hover:text-foreground font-medium truncate flex-shrink-0" style={{ minWidth: '120px', maxWidth: '70%' }}>
                                                            {result.title}
                                                        </span>
                                                        <span className="pl-1 text-foreground-tertiary truncate flex-1 min-w-0">
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