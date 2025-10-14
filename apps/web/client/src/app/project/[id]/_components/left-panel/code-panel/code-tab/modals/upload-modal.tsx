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
import { toast } from '@onlook/ui/sonner';
import { cn } from '@onlook/ui/utils';
import { isBinaryFile } from '@onlook/utility';
import path from 'path';
import { useCallback, useEffect, useState } from 'react';

interface UploadModalProps {
    basePath: string;
    show: boolean;
    setShow: (show: boolean) => void;
    onSuccess?: () => void;
    onCreateFile: (filePath: string, content?: string | Uint8Array) => Promise<void>;
}

export const UploadModal = ({
    basePath,
    show,
    setShow,
    onSuccess,
    onCreateFile,
}: UploadModalProps) => {

    const [currentPath, setCurrentPath] = useState(basePath);
    const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Update currentPath when basePath prop changes
    useEffect(() => {
        setCurrentPath(basePath);
    }, [basePath]);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedFiles(event.target.files);
    };

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            setSelectedFiles(files);
        }
    }, []);

    const handleDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
    }, []);

    const handleSubmit = async () => {
        if (!selectedFiles || selectedFiles.length === 0) return;

        try {
            setIsLoading(true);

            for (let i = 0; i < selectedFiles.length; i++) {
                const file = selectedFiles[i];
                if (!file) continue;

                const fileName = file.name;
                const fullPath = path.join(currentPath, fileName).replace(/\\/g, '/');
                const isBinary = isBinaryFile(fileName);

                const content = await new Promise<string | Uint8Array>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        if (isBinary) {
                            // For binary files, convert ArrayBuffer to Uint8Array
                            resolve(new Uint8Array(reader.result as ArrayBuffer));
                        } else {
                            // For text files, use string result
                            resolve(reader.result as string);
                        }
                    };
                    reader.onerror = () => reject(reader.error);

                    // Use appropriate read method
                    if (isBinary) {
                        reader.readAsArrayBuffer(file);
                    } else {
                        reader.readAsText(file);
                    }
                });

                await onCreateFile(fullPath, content);
            }

            const fileCount = selectedFiles.length;
            toast(`${fileCount} file${fileCount > 1 ? 's' : ''} uploaded successfully!`);

            setSelectedFiles(null);
            setCurrentPath(basePath);
            setShow(false);
            onSuccess?.();
        } catch (error) {
            console.error('Failed to upload files:', error);
            toast.error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const clearSelection = () => {
        setSelectedFiles(null);
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    };

    return (
        <Dialog open={show} onOpenChange={(isOpen) => {
            setShow(isOpen);
            if (!isOpen) {
                clearSelection();
            }
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Files</DialogTitle>
                    <DialogDescription>
                        Upload files to your project
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
                            Path where files will be uploaded
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file-upload">
                            Select Files
                        </Label>
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer hover:border-primary/50",
                                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                                selectedFiles && selectedFiles.length > 0 ? "border-green-500" : ""
                            )}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => document.getElementById('file-upload')?.click()}
                        >
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                                disabled={isLoading}
                            />

                            <div className="text-center">
                                {selectedFiles && selectedFiles.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-green-500">
                                            {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                                        </p>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            {Array.from(selectedFiles).map((file, index) => (
                                                <div key={index}>
                                                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearSelection();
                                            }}
                                            disabled={isLoading}
                                        >
                                            Clear Selection
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-sm">
                                            Drag and drop files here, or click to select
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Multiple files can be selected
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
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
                        disabled={isLoading || !selectedFiles || selectedFiles.length === 0}
                    >
                        {isLoading ? 'Uploading...' : `Upload ${selectedFiles?.length || 0} file${selectedFiles && selectedFiles.length > 1 ? 's' : ''}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};