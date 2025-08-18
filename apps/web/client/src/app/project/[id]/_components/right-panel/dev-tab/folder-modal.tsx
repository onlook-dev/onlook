import { useEditorEngine } from '@/components/store/editor';
import { Button } from '@onlook/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@onlook/ui/dialog';
import { Input } from '@onlook/ui/input';
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import path from 'path';
import { useEffect, useMemo, useState } from 'react';
import {
    createFolderInSandbox,
    doesFolderExist,
    validateFolderName,
} from './file-operations';

interface FolderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    basePath: string;
    files: string[];
    onSuccess?: () => void;
}

export function FolderModal({
    open,
    onOpenChange,
    basePath,
    files,
    onSuccess,
}: FolderModalProps) {
    const editorEngine = useEditorEngine();
    const [name, setName] = useState('');
    const [warning, setWarning] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isComposing, setIsComposing] = useState(false);

    const fullPath = useMemo(() => {
        if (!name) return '';
        return path.join(basePath, name).replace(/\\/g, '/');
    }, [basePath, name]);

    // Reset name when modal opens
    useEffect(() => {
        if (open) {
            setName('');
            setWarning('');
        }
    }, [open]);

    useEffect(() => {
        if (!name) {
            setWarning('');
            return;
        }

        const { valid, error } = validateFolderName(name);

        if (!valid) {
            setWarning(error ?? 'Invalid folder name');
            return;
        }

        if (doesFolderExist(files, fullPath)) {
            setWarning('This folder already exists');
            return;
        }

        setWarning('');
    }, [name, fullPath, files]);

    const handleSubmit = async () => {
        if (!name || warning) return;

        try {
            setIsLoading(true);

            await createFolderInSandbox(editorEngine?.sandbox?.session?.provider, fullPath, editorEngine.sandbox);
            toast(`Folder "${name}" created successfully!`);

            setName('');
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error('Failed to create folder:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create folder';
            setWarning(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const displayPath = basePath === '' ? '/' : `/${basePath}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>
                        Create a new folder in{' '}
                        <code className="bg-background-secondary px-1 py-0.5 rounded text-xs">
                            {displayPath}
                        </code>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={cn(
                                warning && 'border-yellow-300 focus-visible:ring-yellow-300',
                            )}
                            placeholder="components"
                            disabled={isLoading}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isComposing && !warning && name) {
                                    handleSubmit();
                                }
                            }}
                            onCompositionStart={() => setIsComposing(true)}
                            onCompositionEnd={() => setIsComposing(false)}
                        />
                        {warning && (
                            <p className="text-sm text-yellow-300 flex items-center gap-2">
                                {warning}
                            </p>
                        )}
                        {fullPath && !warning && (
                            <p className="text-sm text-muted-foreground">
                                Full path: <code className="bg-background-secondary px-1 py-0.5 rounded text-xs">{fullPath}</code>
                            </p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleSubmit}
                        disabled={isLoading || !!warning || !name}
                    >
                        {isLoading ? 'Creating folder...' : 'Create Folder'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 