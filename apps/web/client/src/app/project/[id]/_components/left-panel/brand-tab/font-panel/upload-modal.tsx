import { useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import { extractFontParts } from '@onlook/utility';

import type { FontFile } from './font-files';
import FontFiles from './font-files';

interface UploadModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUpload: (fonts: FontFile[]) => Promise<boolean>;
    isUploading?: boolean;
}

const UploadModal = observer(
    ({ isOpen, onOpenChange, onUpload, isUploading = false }: UploadModalProps) => {
        const [fontFiles, setFontFiles] = useState<FontFile[]>([]);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
            if (event.target.files) {
                const newFiles = await Promise.all(
                    Array.from(event.target.files).map(async (file) => {
                        const buffer = await file.arrayBuffer();
                        const parts = extractFontParts(file.name);
                        return {
                            name: parts.family,
                            file: {
                                name: file.name,
                                buffer: Array.from(new Uint8Array(buffer)),
                            },
                            weight: parts.weight,
                            style: parts.style,
                        };
                    }),
                );
                setFontFiles([...fontFiles, ...newFiles]);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };

        const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            if (event.dataTransfer.files) {
                const newFiles = await Promise.all(
                    Array.from(event.dataTransfer.files).map(async (file) => {
                        const buffer = await file.arrayBuffer();
                        const parts = extractFontParts(file.name);
                        return {
                            name: parts.family,
                            file: {
                                name: file.name,
                                buffer: Array.from(new Uint8Array(buffer)),
                            },
                            weight: parts.weight,
                            style: parts.style,
                        };
                    }),
                );
                setFontFiles([...fontFiles, ...newFiles]);
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };

        const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
        };

        const handleWeightChange = (index: number, weight: string) => {
            const updatedFiles = [...fontFiles];
            if (updatedFiles[index]) {
                updatedFiles[index].weight = weight;
                setFontFiles(updatedFiles);
            }
        };

        const handleStyleChange = (index: number, style: string) => {
            const updatedFiles = [...fontFiles];
            if (updatedFiles[index]) {
                updatedFiles[index].style = style;
                setFontFiles(updatedFiles);
            }
        };

        const handleRemoveFont = (index: number) => {
            const updatedFiles = [...fontFiles];
            if (updatedFiles[index]) {
                updatedFiles.splice(index, 1);
                setFontFiles(updatedFiles);
            }
        };

        const handleSave = async () => {
            try {
                const success = await onUpload(fontFiles);
                if (success) {
                    onOpenChange(false);
                    setFontFiles([]);
                }
            } catch (error) {
                // Don't close modal if upload fails
                console.error('Upload failed:', error);
            }
        };

        const handleCancel = () => {
            onOpenChange(false);
            setFontFiles([]);
        };

        return (
            <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
                <AlertDialogContent className="bg-background-onlook/20 max-h-[80vh] max-w-2xl gap-0 p-0">
                    <div className="relative flex flex-col">
                        {/* Loading overlay */}
                        {isUploading && (
                            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                                <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                                <span className="text-primary text-base font-medium">
                                    Uploading...
                                </span>
                            </div>
                        )}

                        <div className="flex items-center justify-between p-6 pt-4 pb-3">
                            <AlertDialogTitle className="text-left text-base font-medium">
                                Upload a font
                            </AlertDialogTitle>
                            <Button
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={handleCancel}
                                disabled={isUploading}
                            >
                                <svg
                                    width="15"
                                    height="15"
                                    viewBox="0 0 15 15"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z"
                                        fill="currentColor"
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                    ></path>
                                </svg>
                            </Button>
                        </div>

                        <div className="mb-0 flex min-h-0 flex-1 flex-col px-6 pb-0">
                            <div
                                className="mb-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-black/20 p-8"
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                            >
                                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-black/30">
                                    <svg
                                        className="text-primary h-5 w-5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M12 17V3"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                        <path
                                            d="M7 8L12 3L17 8"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M20 21H4"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                </div>
                                <p className="text-primary mb-1 text-center">
                                    Click to upload or drag and drop
                                </p>
                                <p className="text-muted-foreground text-center text-sm">
                                    For maximum browser support, upload in
                                    <br />
                                    TTF, OTF, EOT and WOFF formats.
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".ttf,.otf,.eot,.woff,.woff2"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <FontFiles
                                fontFiles={fontFiles}
                                onWeightChange={handleWeightChange}
                                onStyleChange={handleStyleChange}
                                onRemoveFont={handleRemoveFont}
                            />
                        </div>

                        {fontFiles.length > 0 && (
                            <AlertDialogFooter className="mt-0 space-x-2 border-t px-6 pt-4 pb-4 sm:justify-end">
                                <Button
                                    variant="ghost"
                                    onClick={handleCancel}
                                    disabled={isUploading}
                                    className="text-sm"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="default"
                                    onClick={handleSave}
                                    disabled={fontFiles.length === 0 || isUploading}
                                    className="rounded-md text-sm"
                                >
                                    {isUploading ? (
                                        <>
                                            <Icons.LoadingSpinner className="mr-2 h-4 w-4 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        'Save font files'
                                    )}
                                </Button>
                            </AlertDialogFooter>
                        )}
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        );
    },
);

export default UploadModal;
