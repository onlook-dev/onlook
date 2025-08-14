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
import { Icons } from '@onlook/ui/icons';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@onlook/ui/select';
import { toast } from '@onlook/ui/sonner';
import { isBinaryFile } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';

interface UploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    files: string[];
    basePath?: string;
    onSuccess?: () => void;
}

export const UploadModal = observer(({
    open,
    onOpenChange,
    files,
    basePath,
    onSuccess,
}: UploadModalProps) => {
    const editorEngine = useEditorEngine();
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [targetDirectory, setTargetDirectory] = useState<string>('root');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const availableDirectories = useMemo(() => {
        const directories = new Set<string>();
        files.forEach(file => {
            const parts = file.split('/');
            for (let i = 1; i < parts.length; i++) {
                directories.add(parts.slice(0, i).join('/'));
            }
        });
        return Array.from(directories).sort();
    }, [files]);

    const getSmartDirectory = (filename: string): string => {
        const extension = filename.toLowerCase().split('.').pop();
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'];

        if (extension && imageExtensions.includes(extension)) {
            if (availableDirectories.includes('public')) {
                return 'public';
            }
            if (availableDirectories.includes('src/assets')) {
                return 'src/assets';
            }
            if (availableDirectories.includes('assets')) {
                return 'assets';
            }
            return availableDirectories.includes('public') ? 'public' : 'root';
        }

        // For non-image files, use the provided basePath or fall back to current file's directory
        if (basePath && availableDirectories.includes(basePath)) {
            return basePath;
        }

        return 'root';
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            return;
        }

        const fileArray = Array.from(files);
        setSelectedFiles(fileArray);

        // Set smart default directory based on first file
        if (fileArray.length > 0 && fileArray[0]) {
            const smartDir = getSmartDirectory(fileArray[0].name);
            setTargetDirectory(smartDir);
        }
    };

    const handleUpload = async () => {
        if (selectedFiles.length === 0) {
            return;
        }

        setIsUploading(true);
        try {
            const uploadResults: boolean[] = [];
            
            for (const file of selectedFiles) {
                const directory = targetDirectory === 'root' ? '' : targetDirectory;
                const finalPath = directory ? `${directory}/${file.name}` : file.name;

                let success: boolean;
                if (isBinaryFile(file.name)) {
                    const content = await file.arrayBuffer();
                    success = await editorEngine.sandbox.writeBinaryFile(finalPath, new Uint8Array(content));
                } else {
                    const content = await file.text();
                    success = await editorEngine.sandbox.writeFile(finalPath, content);
                }
                
                uploadResults.push(success);
            }

            // Check if all uploads succeeded
            const failedCount = uploadResults.filter(result => !result).length;
            
            if (failedCount === 0) {
                editorEngine.sandbox.listAllFiles();
                
                const fileCount = selectedFiles.length;
                const fileText = fileCount === 1 ? selectedFiles[0]?.name ?? 'file' : `${fileCount} files`;
                toast(`Successfully uploaded ${fileText}!`);

                onOpenChange(false);
                onSuccess?.();
            } else if (failedCount === selectedFiles.length) {
                // All uploads failed
                toast('Failed to upload files', { description: 'All uploads failed. Please try again.' });
            } else {
                // Some uploads failed
                const successCount = selectedFiles.length - failedCount;
                toast(`Partially uploaded files`, { 
                    description: `${successCount} uploaded successfully, ${failedCount} failed. Please try again for the failed files.` 
                });
                
                // Refresh file list even for partial success
                editorEngine.sandbox.listAllFiles();
            }
        } catch (error) {
            console.error('Error uploading files:', error);
            toast('Failed to upload files', { description: 'Upload process encountered an error. Please try again.' });
        } finally {
            setIsUploading(false);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const reset = () => {
        setSelectedFiles([]);
        setTargetDirectory('root');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    useEffect(() => {
        if (!open) {
            reset();
        }
    }, [open]);

    const displayPath = targetDirectory === 'root' ? '/' : `/${targetDirectory}/`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Files</DialogTitle>
                    <DialogDescription>
                        Upload files to{' '}
                        <code className="bg-background-secondary px-1 py-0.5 rounded text-xs">
                            {displayPath}
                        </code>
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* File Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Select Files</label>
                        <div className="border-2 border-dashed border-border-primary rounded-lg p-4 text-center">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <Button
                                variant="ghost"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full"
                            >
                                <Icons.Upload className="h-4 w-4 mr-2" />
                                Choose Files
                            </Button>
                        </div>
                    </div>

                    {/* Selected Files List */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Selected Files</label>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between bg-background-secondary p-2 rounded text-sm">
                                        <span className="truncate">{file.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => removeFile(index)}
                                        >
                                            <Icons.CrossS className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Directory Selection */}
                    {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Target Directory</label>
                            <Select value={targetDirectory} onValueChange={setTargetDirectory}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select directory" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="root">/ (root)</SelectItem>
                                    {availableDirectories.map(dir => (
                                        <SelectItem key={dir} value={dir}>
                                            /{dir}/
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isUploading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleUpload}
                        disabled={selectedFiles.length === 0 || isUploading}
                    >
                        {isUploading
                            ? 'Uploading...'
                            : `Upload ${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''}`
                        }
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});