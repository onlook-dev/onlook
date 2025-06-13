'use client';

import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { motion } from 'motion/react';
import { useCallback, useRef, useState } from 'react';
import { BINARY_EXTENSIONS, IGNORED_DIRECTORIES, IGNORED_FILES } from '@onlook/constants';
import { useProjectCreation } from './project-creation-context';
import { StepHeader } from './steps';
import { StepContent } from './steps';
import { StepFooter } from './steps';
import type { ProcessedFile } from '../../types';

declare module 'react' {
    interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
        webkitdirectory?: string;
        directory?: string;
    }
}

export const NewSelectFolder = () => {
    const { projectData, setProjectData, prevStep, nextStep, resetProjectData } =
        useProjectCreation();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const extractProjectName = (files: ProcessedFile[]): string | null => {
        const packageJsonFile = files.find((f) => f.path.endsWith('package.json') && !f.isBinary);

        if (packageJsonFile) {
            try {
                const packageJson = JSON.parse(packageJsonFile.content as string);
                return packageJson.name || null;
            } catch (error) {
                console.warn('Error parsing package.json for name:', error);
            }
        }

        return null;
    };

    const handleClickUpload = () => {
        fileInputRef.current?.click();
    };

    const filterAndProcessFiles = async (files: File[]): Promise<ProcessedFile[]> => {
        const processedFiles: ProcessedFile[] = [];
        const MAX_FILE_SIZE = 5 * 1024 * 1024;

        // Find the common root path from all files
        const allPaths = files.map((file) => (file as any).webkitRelativePath || file.name);

        const rootPath =
            allPaths.length > 0 && allPaths[0].includes('/') ? allPaths[0].split('/')[0] : '';

        for (const file of files) {
            // Skip if file is too large
            if (file.size > MAX_FILE_SIZE) {
                console.warn(`Skipping large file: ${file.name} (${file.size} bytes)`);
                continue;
            }

            // Get relative path from webkitRelativePath or name
            // Remove the root path from the relative path
            let relativePath = (file as any).webkitRelativePath || file.name;
            relativePath = relativePath.replace(rootPath, '').replace(/^\//, '');

            // Skip ignored directories
            if (
                IGNORED_DIRECTORIES.some(
                    (dir) => relativePath.includes(`${dir}/`) || relativePath.startsWith(`${dir}/`),
                )
            ) {
                continue;
            }

            // Skip ignored files
            if (IGNORED_FILES.includes(file.name)) {
                continue;
            }

            // Determine if file is binary
            const extension = '.' + file.name.split('.').pop()?.toLowerCase();
            const isBinary = BINARY_EXTENSIONS.includes(extension);

            try {
                let content: string | ArrayBuffer;

                if (isBinary) {
                    content = await file.arrayBuffer();
                } else {
                    content = await file.text();
                }

                processedFiles.push({
                    path: relativePath,
                    content,
                    isBinary,
                });
            } catch (error) {
                console.warn(`Error reading file ${file.name}:`, error);
            }
        }
        return processedFiles;
    };

    const processProjectFiles = async (fileList: FileList | File[]) => {
        setIsUploading(true);
        setError('');
        setUploadProgress('Processing files...');

        try {
            const files = Array.from(fileList);
            const fullPath = files[0]?.webkitRelativePath;

            // Normalize path by removing leading slash if present
            const normalizedPath = fullPath?.startsWith('/') ? fullPath.substring(1) : fullPath;
            const folderPath = normalizedPath?.substring(0, normalizedPath.indexOf('/'));

            const processedFiles = await filterAndProcessFiles(files);

            if (processedFiles.length === 0) {
                throw new Error('No valid files found in the selected folder');
            }

            const projectName = extractProjectName(processedFiles);

            if (!projectName) {
                throw new Error('No project name found in the selected folder');
            }

            setProjectData({
                name: projectName,
                folderPath: folderPath,
                files: processedFiles,
            });
        } catch (error) {
            console.error('Error processing project:', error);
            setError(error instanceof Error ? error.message : 'Failed to process project');
        } finally {
            setIsUploading(false);
            setTimeout(() => setUploadProgress(''), 3000);
        }
    };

    // File upload functions
    const handleFileInputChange = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files;
            if (files && files.length > 0) {
                await processProjectFiles(files);
            }
        },
        [],
    );

    // Helper function to recursively read directory entries
    const readDirectory = async (dirEntry: any): Promise<File[]> => {
        const files: File[] = [];

        return new Promise((resolve) => {
            const reader = dirEntry.createReader();

            const readEntries = () => {
                reader.readEntries(async (entries: any[]) => {
                    if (entries.length === 0) {
                        resolve(files);
                        return;
                    }

                    for (const entry of entries) {
                        if (entry.isFile) {
                            const fileEntry = entry;
                            try {
                                let file = await new Promise<File>((resolve, reject) => {
                                    fileEntry.file(resolve, reject);
                                });

                                // Create a new File object with webkitRelativePath
                                const fileWithPath = new File([file], file.name, {
                                    type: file.type,
                                    lastModified: file.lastModified,
                                });
                                Object.defineProperty(fileWithPath, 'webkitRelativePath', {
                                    value: fileEntry.fullPath,
                                    writable: false,
                                    enumerable: true,
                                    configurable: false,
                                });

                                files.push(fileWithPath);
                            } catch (error) {
                                console.warn(`Error reading file ${entry.name}:`, error);
                            }
                        } else if (entry.isDirectory) {
                            const subFiles = await readDirectory(entry);
                            files.push(...subFiles);
                        }
                    }

                    // Continue reading entries (directories can have many entries)
                    readEntries();
                });
            };

            readEntries();
        });
    };

    const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const items = e.dataTransfer.items;
        const files: File[] = [];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item && item.kind === 'file') {
                const entry = item.webkitGetAsEntry();

                if (entry) {
                    if (entry.isFile) {
                        // Handle individual file
                        const fileEntry = entry as any;
                        try {
                            const file = await new Promise<File>((resolve, reject) => {
                                fileEntry.file(resolve, reject);
                            });
                            files.push(file);
                        } catch (error) {
                            console.warn(`Error reading file ${entry.name}:`, error);
                        }
                    } else if (entry.isDirectory) {
                        // Handle directory
                        const dirFiles = await readDirectory(entry);
                        files.push(...dirFiles);
                    }
                } else {
                    // Fallback for browsers that don't support webkitGetAsEntry
                    const file = item.getAsFile();
                    if (file) {
                        files.push(file);
                    }
                }
            }
        }

        if (files.length > 0) {
            await processProjectFiles(files);
        } else {
            setError('No files found in the dropped folder');
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
        }
    }, []);

    const reset = () => {
        resetProjectData();
        // Reset all related states
        setError('');
        setUploadProgress('');
        setIsUploading(false);
        setIsDragging(false);
    };

    return (
        <>
            <StepHeader>
                <CardTitle>{'Select your project folder'}</CardTitle>
                <CardDescription>{"This is where we'll reference your App"}</CardDescription>
            </StepHeader>
            <StepContent>
                {projectData.folderPath ? (
                    <motion.div
                        key="folderPath"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full flex flex-row items-center border px-4 py-5 rounded bg-background-onlook gap-2"
                    >
                        <div className="flex flex-col gap-1 break-all">
                            <p className="text-regular">{projectData.name}</p>
                            <p className="text-mini text-foreground-onlook">
                                {projectData.folderPath}
                            </p>
                        </div>
                        <Button
                            className="ml-auto w-10 h-10"
                            variant={'ghost'}
                            size={'icon'}
                            onClick={() => reset()}
                        >
                            <Icons.MinusCircled />
                        </Button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="selectFolder"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="w-full space-y-4"
                    >
                        <div
                            className={`
                        w-full h-20 rounded-lg bg-gray-900 border border-gray rounded-lg m-0
                        flex flex-col items-center justify-center gap-4
                        transition-colors duration-200 cursor-pointer
                        ${
                            isDragging
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-gray-300 bg-gray-50 hover:bg-gray-700'
                        }
                        ${isUploading ? 'pointer-events-none opacity-50' : ''}
                    `}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={handleClickUpload}
                        >
                            {isUploading ? (
                                <div className="text-center">
                                    <p className="text-sm font-medium text-gray-900">
                                        Uploading...
                                    </p>
                                    <p className="text-xs text-gray-500">{uploadProgress}</p>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <Icons.DirectoryOpen className="w-5 h-5 text-gray-200" />
                                    <p className="text-sm font-medium text-gray-200">
                                        Click to select your folder
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Hidden file input */}

                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleFileInputChange}
                            accept=".js,.jsx,.ts,.tsx,.json,.md,.txt,.css,.scss,.less,.html,.svg,.png,.jpg,.jpeg,.gif,.ico"
                            directory=""
                            webkitdirectory=""
                        />
                    </motion.div>
                )}
            </StepContent>
            <StepFooter>
                <Button type="button" onClick={prevStep} variant="outline" className="px-3 py-2">
                    Cancel
                </Button>
                <Button
                    disabled={!projectData.folderPath || !!error || isUploading}
                    type="button"
                    onClick={nextStep}
                    className="px-3 py-2"
                >
                    Continue
                </Button>
            </StepFooter>
        </>
    );
};
