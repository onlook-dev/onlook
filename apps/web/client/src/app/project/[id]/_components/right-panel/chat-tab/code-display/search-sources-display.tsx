import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@onlook/ui/collapsible';
import { Icons } from '@onlook/ui/icons';
import { cn } from '@onlook/ui/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';

interface SearchResult {
    index: number;
    title: string;
    url: string;
    text: string;
    publishedDate: string | null;
    author: string | null;
    favicon: string | null;
    summary: string | null;
}

interface SearchSourcesDisplayProps {
    query: string;
    searchType: string;
    results: SearchResult[];
    totalResults: number;
    searchTime: string;
    isStream?: boolean;
}

export const SearchSourcesDisplay = observer(({
    query,
    searchType,
    results,
    totalResults,
    searchTime,
}: SearchSourcesDisplayProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const formatDomain = (url: string) => {
        try {
            return new URL(url).hostname.replace('www.', '');
        } catch {
            return url;
        }
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return null;
        try {
            return new Date(dateString).toLocaleDateString();
        } catch {
            return dateString;
        }
    };

    return (
        <div className="group relative">
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div
                    className={cn(
                        "flex border rounded-lg bg-background text-foreground w-full overflow-hidden transition-all duration-200",
                        isOpen && "bg-background-secondary/50"
                    )}
                >
                    <div className="flex flex-col w-full">
                        <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-background-secondary/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <Icons.MagnifyingGlass className="h-4 w-4 text-foreground-tertiary flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-foreground-secondary truncate">
                                                Search: &quot;{query}&quot;
                                            </span>
                                            <span className="text-foreground-tertiary text-xs">
                                                ({searchType})
                                            </span>
                                        </div>
                                        <div className="text-xs text-foreground-tertiary">
                                            {totalResults} results • {searchTime}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-xs text-foreground-tertiary">
                                        {results.length} sources
                                    </span>
                                    <Icons.ChevronDown
                                        className={cn(
                                            "h-4 w-4 text-foreground-tertiary transition-transform duration-200",
                                            isOpen && "rotate-180"
                                        )}
                                    />
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
                                        <div className="border-t border-foreground-secondary/20">
                                            <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
                                                {results.map((result, index) => (
                                                    <div key={index} className="group/source border border-foreground-secondary/20 rounded p-3 hover:bg-background-secondary/30 transition-colors">
                                                        <div className="flex items-start gap-3">
                                                            {result.favicon && (
                                                                <img
                                                                    src={result.favicon}
                                                                    alt=""
                                                                    className="w-4 h-4 mt-0.5 flex-shrink-0"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                    }}
                                                                />
                                                            )}
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-tight">
                                                                        {result.title}
                                                                    </h4>
                                                                    <a
                                                                        href={result.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="opacity-0 group-hover/source:opacity-100 transition-opacity"
                                                                    >
                                                                        <Icons.ExternalLink className="h-3 w-3 text-foreground-tertiary hover:text-foreground-secondary" />
                                                                    </a>
                                                                </div>

                                                                <div className="flex items-center gap-2 mt-1 text-xs text-foreground-tertiary">
                                                                    <span>{formatDomain(result.url)}</span>
                                                                    {result.publishedDate && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>{formatDate(result.publishedDate)}</span>
                                                                        </>
                                                                    )}
                                                                    {result.author && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>{result.author}</span>
                                                                        </>
                                                                    )}
                                                                </div>

                                                                {result.summary && (
                                                                    <p className="text-xs text-foreground-secondary mt-1 line-clamp-2">
                                                                        {result.summary}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                </CollapsibleContent>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </Collapsible>
        </div>
    );
});