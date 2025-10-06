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
import { Label } from '@onlook/ui/label';
import { cn } from '@onlook/ui/utils';
import path from 'path';
import { useEffect, useMemo, useState } from 'react';

interface FolderModalProps {
    basePath: string;
    show: boolean;
    setShow: (show: boolean) => void;
    onSuccess?: () => void;
    onCreateFolder: (folderPath: string) => Promise<void>;
}

export const FolderModal = ({
    basePath,
    show,
    setShow,
    onSuccess,
    onCreateFolder,
}: FolderModalProps) => {

    const [name, setName] = useState('');
    const [currentPath, setCurrentPath] = useState(basePath);
    const [warning, setWarning] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isComposing, setIsComposing] = useState(false);

    // Update currentPath when basePath prop changes
    useEffect(() => {
        setCurrentPath(basePath);
    }, [basePath]);

    const fullPath = useMemo(() => {
        if (!name) return '';
        return path.join(currentPath, name).replace(/\\/g, '/');
    }, [currentPath, name]);

    const handleSubmit = async () => {
        if (!name || warning) return;

        try {
            setIsLoading(true);

            await onCreateFolder(fullPath);

            setName('');
            setCurrentPath(basePath);
            setWarning('');
            setShow(false);
            onSuccess?.();
        } catch (error) {
            console.error('Failed to create folder:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create folder';
            setWarning(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const displayPath = currentPath === '' ? '/' : `/${currentPath}`;

    return (
        <Dialog open={show} onOpenChange={(isOpen) => setShow(isOpen)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Folder</DialogTitle>
                    <DialogDescription>
                        Create a new folder
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="path">
                            Directory Path
                        </Label>
                        <Input
                            id="path"
                            value={currentPath}
                            onChange={(e) => setCurrentPath(e.target.value)}
                            placeholder="/"
                            disabled={isLoading}
                            className="text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Path where the folder will be created
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">
                            Folder Name
                        </Label>
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
                        onClick={() => setShow(false)}
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
}; 