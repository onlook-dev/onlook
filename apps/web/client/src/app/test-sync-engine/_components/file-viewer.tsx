'use client';

import { ScrollArea } from '@onlook/ui/scroll-area';
import { Badge } from '@onlook/ui/badge';

interface FileViewerProps {
    fileName: string | null;
    content: string | null;
    isLoading?: boolean;
    isBinary?: boolean;
}

export function FileViewer({ fileName, content, isLoading, isBinary }: FileViewerProps) {
    if (!fileName) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                <p className="text-sm">Select a file to view its contents</p>
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-mono text-gray-100 truncate">{fileName}</h3>
                {isBinary && (
                    <Badge variant="secondary" className="text-xs">
                        Binary
                    </Badge>
                )}
            </div>
            
            <ScrollArea className="flex-1 bg-gray-950">
                <div className="p-4">
                    {isLoading ? (
                        <div className="space-y-2 animate-pulse">
                            <div className="h-4 w-full bg-gray-800 rounded" />
                            <div className="h-4 w-3/4 bg-gray-800 rounded" />
                            <div className="h-4 w-5/6 bg-gray-800 rounded" />
                            <div className="h-4 w-2/3 bg-gray-800 rounded" />
                            <div className="h-4 w-4/5 bg-gray-800 rounded" />
                        </div>
                    ) : isBinary ? (
                        <p className="text-sm text-gray-500 italic">Binary file content not displayed</p>
                    ) : (
                        <pre className="text-xs font-mono text-gray-300 whitespace-pre-wrap">
                            {content || '(empty file)'}
                        </pre>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

// Optional: Add line numbers
export function FileViewerWithLineNumbers({ fileName, content, isLoading, isBinary }: FileViewerProps) {
    const lines = content?.split('\n') || [];
    
    if (!fileName) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                <p className="text-sm">Select a file to view its contents</p>
            </div>
        );
    }
    
    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-mono text-gray-100 truncate">{fileName}</h3>
                <div className="flex items-center gap-2">
                    {!isBinary && content && (
                        <Badge variant="secondary" className="text-xs">
                            {lines.length} lines
                        </Badge>
                    )}
                    {isBinary && (
                        <Badge variant="secondary" className="text-xs">
                            Binary
                        </Badge>
                    )}
                </div>
            </div>
            
            <ScrollArea className="flex-1 bg-gray-950">
                {isLoading ? (
                    <div className="p-4 space-y-2 animate-pulse">
                        <div className="h-4 w-full bg-gray-800 rounded" />
                        <div className="h-4 w-3/4 bg-gray-800 rounded" />
                        <div className="h-4 w-5/6 bg-gray-800 rounded" />
                        <div className="h-4 w-2/3 bg-gray-800 rounded" />
                        <div className="h-4 w-4/5 bg-gray-800 rounded" />
                    </div>
                ) : isBinary ? (
                    <div className="p-4">
                        <p className="text-sm text-gray-500 italic">Binary file content not displayed</p>
                    </div>
                ) : (
                    <div className="flex">
                        <div className="select-none px-4 py-4 text-right border-r border-gray-800">
                            {lines.map((_, index) => (
                                <div key={index} className="text-xs text-gray-600 font-mono leading-5">
                                    {index + 1}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 px-4 py-4">
                            <pre className="text-xs font-mono text-gray-300 leading-5 whitespace-pre">
                                {content || '(empty file)'}
                            </pre>
                        </div>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}