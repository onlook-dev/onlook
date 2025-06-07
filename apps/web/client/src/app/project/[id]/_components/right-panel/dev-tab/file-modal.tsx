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
import { useEffect, useMemo, useState } from 'react';
import {
    createFileInSandbox,
    createFolderInSandbox,
    doesFileExist,
    validateFileName,
    validateFolderName,
} from './file-operations';
import { getFileTemplate } from './file-templates';
import path from 'path';

interface FileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    mode: 'file' | 'folder';
    basePath: string;
    files: string[];
    onSuccess?: () => void;
}

export function FileModal({
    open,
    onOpenChange,
    mode,
    basePath,
    files,
    onSuccess,
}: FileModalProps) {
    const editorEngine = useEditorEngine();
    const [name, setName] = useState('');
    const [warning, setWarning] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isComposing, setIsComposing] = useState(false);

    const fullPath = useMemo(() => {
        if (!name) return '';
        return path.join(basePath, name).replace(/\\/g, '/');
    }, [basePath, name]);

    const title = mode === 'file' ? 'Create New File' : 'Create New Folder';
    const buttonText = mode === 'file' ? 'Create File' : 'Create Folder';
    const loadingText = mode === 'file' ? 'Creating file...' : 'Creating folder...';
    const placeholder = mode === 'file' ? 'component.tsx' : 'components';

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

        const validator = mode === 'file' ? validateFileName : validateFolderName;
        const { valid, error } = validator(name);

        if (!valid) {
            setWarning(error ?? `Invalid ${mode} name`);
            return;
        }

        if (doesFileExist(files, fullPath)) {
            setWarning(`This ${mode} already exists`);
            return;
        }

        setWarning('');
    }, [name, fullPath, files, mode]);

    const handleSubmit = async () => {
        if (!name || warning) return;

        try {
            setIsLoading(true);

            const session = editorEngine?.sandbox?.session?.session;
            if (!session) {
                throw new Error('No sandbox session available');
            }

            if (mode === 'file') {
                const content = getFileTemplate(name);
                await createFileInSandbox(session, fullPath, content);
                toast(`File "${name}" created successfully!`);
            } else {
                await createFolderInSandbox(session, fullPath);
                toast(`Folder "${name}" created successfully!`);
            }

            // Refresh file list
            await editorEngine.sandbox.listAllFiles();

            setName('');
            onOpenChange(false);
            onSuccess?.();
        } catch (error) {
            console.error(`Failed to create ${mode}:`, error);
            const errorMessage = error instanceof Error ? error.message : `Failed to create ${mode}`;
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
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {mode === 'file' ? 'Create a new file' : 'Create a new folder'} in{' '}
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
                            placeholder={placeholder}
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
                        {isLoading ? loadingText : buttonText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 