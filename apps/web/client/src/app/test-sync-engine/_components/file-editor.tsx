'use client';

import { useState, useEffect } from 'react';
import { Button } from '@onlook/ui/button';
import { Badge } from '@onlook/ui/badge';
import { Save } from 'lucide-react';

interface FileEditorProps {
    fileName: string | null;
    content: string | null;
    isLoading?: boolean;
    isBinary?: boolean;
    onSave?: (content: string) => Promise<void>;
}

export function FileEditor({ 
    fileName, 
    content, 
    isLoading, 
    isBinary,
    onSave
}: FileEditorProps) {
    const [editContent, setEditContent] = useState(content || '');
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setEditContent(content || '');
        setHasChanges(false);
    }, [content]);

    const handleContentChange = (value: string) => {
        setEditContent(value);
        setHasChanges(value !== content);
    };

    const handleSave = async () => {
        if (!onSave || !hasChanges) return;
        
        setIsSaving(true);
        try {
            await onSave(editContent);
            setHasChanges(false);
        } catch (error) {
            console.error('Failed to save file:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle Cmd+S / Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's' && hasChanges && !isBinary) {
                e.preventDefault();
                handleSave();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasChanges, editContent]);

    if (!fileName) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                <p className="text-sm">Select a file to view its contents</p>
            </div>
        );
    }

    const lines = editContent.split('\n');
    
    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-sm font-mono text-gray-100 truncate">{fileName}</h3>
                <div className="flex items-center gap-2">
                    {!isBinary && content !== null && (
                        <Badge variant="secondary" className="text-xs">
                            {lines.length} lines
                        </Badge>
                    )}
                    {isBinary && (
                        <Badge variant="secondary" className="text-xs">
                            Binary
                        </Badge>
                    )}
                    {!isBinary && hasChanges && (
                        <Button
                            onClick={handleSave}
                            size="sm"
                            className="h-7 px-2"
                            disabled={isSaving}
                        >
                            <Save className="h-3 w-3 mr-1" />
                            {isSaving ? 'Saving...' : 'Save'}
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
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
                    <div className="h-full w-full overflow-auto bg-gray-950 p-4">
                        <textarea
                            value={editContent}
                            onChange={(e) => handleContentChange(e.target.value)}
                            className="min-h-full min-w-full resize-none border-0 bg-transparent font-mono text-xs text-gray-300 outline-none"
                            placeholder="Enter file content..."
                            spellCheck={false}
                            style={{ 
                                lineHeight: '1.25rem',
                                whiteSpace: 'pre',
                                overflowWrap: 'normal'
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}