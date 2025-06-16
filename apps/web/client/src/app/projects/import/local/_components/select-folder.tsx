'use client';

import type { NextJsProjectValidation, ProcessedFile } from '@/app/projects/types';
import { BINARY_EXTENSIONS, IGNORED_FILES, IGNORED_UPLOAD_DIRECTORIES } from '@onlook/constants';
import { Button } from '@onlook/ui/button';
import { CardDescription, CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { motion } from 'motion/react';
import { useCallback, useRef, useState } from 'react';
import { useProjectCreation } from '../_context/context';
import { StepContent, StepFooter, StepHeader } from '../../steps';

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
    const [error, setError] = useState('');
    const [validation, setValidation] = useState<NextJsProjectValidation | null>(null);
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
        setIsUploading(true);
        fileInputRef.current?.click();
    };

    const filterAndProcessFiles = async (files: File[]): Promise<ProcessedFile[]> => {
        const processedFiles: ProcessedFile[] = [];
        const MAX_FILE_SIZE = 10 * 1024 * 1024;

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
                IGNORED_UPLOAD_DIRECTORIES.some(
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

    const validateNextJsProject = async (
        files: ProcessedFile[],
    ): Promise<NextJsProjectValidation> => {
        // Look for package.json
        const packageJsonFile = files.find((f) => f.path.endsWith('package.json') && !f.isBinary);

        if (!packageJsonFile) {
            return { isValid: false, error: 'No package.json found' };
        }

        try {
            const packageJson = JSON.parse(packageJsonFile.content as string);

            // Check for Next.js in dependencies
            const hasNext = packageJson.dependencies?.next || packageJson.devDependencies?.next;
            if (!hasNext) {
                return { isValid: false, error: 'Next.js not found in dependencies' };
            }

            // Check for React dependencies
            const hasReact = packageJson.dependencies?.react || packageJson.devDependencies?.react;
            if (!hasReact) {
                return { isValid: false, error: 'React not found in dependencies' };
            }

            // Determine router type
            let routerType: 'app' | 'pages' = 'pages';

            // Check for App Router (app directory with layout file)
            const hasAppLayout = files.some(
                (f) =>
                    (f.path.includes('app/layout.') || f.path.includes('src/app/layout.')) &&
                    (f.path.endsWith('.tsx') ||
                        f.path.endsWith('.ts') ||
                        f.path.endsWith('.jsx') ||
                        f.path.endsWith('.js')),
            );

            if (hasAppLayout) {
                routerType = 'app';
            } else {
                // Check for Pages Router (pages directory)
                const hasPagesDir = files.some(
                    (f) => f.path.includes('pages/') || f.path.includes('src/pages/'),
                );

                if (!hasPagesDir) {
                    return {
                        isValid: false,
                        error: 'No valid Next.js router structure found (missing app/ or pages/ directory)',
                    };
                }
            }

            return { isValid: true, routerType };
        } catch (error) {
            return { isValid: false, error: 'Invalid package.json format' };
        }
    };

    const processProjectFiles = async (fileList: FileList | File[]) => {
        setError('');
        setIsUploading(true);

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
                setError('No project name found in the selected folder');
                return;
            }

            // Validate the project
            const validationResult = await validateNextJsProject(processedFiles);
            setValidation(validationResult);

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
        }
    };

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
        setIsUploading(false);
        setIsDragging(false);
    };

    const renderHeader = () => {
        const headerConfig = {
            initial: {
                title: 'Select your project folder',
                description: "This is where we'll reference your App"
            },
            validating: {
                title: 'Verifying compatibility with Onlook',
                description: "We're checking to make sure this project can work with Onlook"
            },
            valid: {
                title: 'Project verified',
                description: 'Your project is ready to import to Onlook'
            },
            invalid: {
                title: "This project won't work with Onlook",
                description: 'Onlook only works with NextJS + React + Tailwind projects'
            }
        };

        let config = headerConfig.initial;
        if (projectData.folderPath) {
            if (!validation) {
                config = headerConfig.validating;
            } else if (validation.isValid) {
                config = headerConfig.valid;
            } else {
                config = headerConfig.invalid;
            }
        }

        return (
            <>
                <CardTitle>{config.title}</CardTitle>
                <CardDescription>{config.description}</CardDescription>
            </>
        );
    };

    const renderProjectInfo = () => {
        if (!projectData.folderPath) {
            return (
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
                            duration-200 cursor-pointer
                            ${isDragging
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
                                <div className="flex items-center justify-center gap-2">
                                    <Icons.Shadow className="w-4 h-4 text-gray-200 animate-spin" />
                                    <p className="text-sm font-medium text-gray-200">
                                        Uploading...
                                    </p>
                                </div>
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

                    <input
                        ref={fileInputRef}
                        type="file"
                        style={{ display: 'none' }}
                        onChange={handleFileInputChange}
                        accept=".js,.jsx,.ts,.tsx,.json,.md,.txt,.css,.scss,.less,.html,.svg,.png,.jpg,.jpeg,.gif,.ico"
                        directory=""
                        webkitdirectory=""
                    />
                </motion.div>
            );
        }

        const statusConfig = {
            valid: {
                bgColor: 'bg-teal-900',
                borderColor: 'border-teal-600',
                iconBgColor: 'bg-teal-500',
                textColor: 'text-teal-100',
                subTextColor: 'text-teal-200',
                icon: <Icons.CheckCircled className="w-5 h-5 text-teal-200 group-hover:opacity-0 transition-opacity duration-200" />,
                showError: false
            },
            invalid: {
                bgColor: 'bg-amber-900',
                borderColor: 'border-amber-600',
                iconBgColor: 'bg-amber-500',
                textColor: 'text-amber-100',
                subTextColor: 'text-amber-200',
                icon: <Icons.ExclamationTriangle className="w-5 h-5 text-amber-200" />,
                showError: true
            }
        };

        const config = validation?.isValid ? statusConfig.valid : statusConfig.invalid;

        return (
            <motion.div
                key="folderPath"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`w-full flex flex-row items-center border p-4 rounded-lg ${config.bgColor} ${config.borderColor} gap-2 group relative`}
            >
                <div className={`flex flex-col gap-2 w-full ${config.showError ? '' : 'flex-row items-center justify-between'}`}>
                    <div className="flex flex-row items-center justify-between w-full gap-3">
                        <div className={`p-3 ${config.iconBgColor} rounded-lg`}>
                            <Icons.Directory className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-1 break-all w-full">
                            <p className={`text-regular ${config.textColor}`}>{projectData.name}</p>
                            <p className={`text-mini ${config.subTextColor}`}>{projectData.folderPath}</p>
                        </div>
                        {config.icon}
                    </div>
                    {config.showError && (
                        <p className={`${config.textColor} text-sm`}>This is not a NextJS Project</p>
                    )}
                </div>
                {validation?.isValid && (
                    <Button
                        className={`absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:bg-transparent p-0 size-10 transition-opacity duration-200 ${config.bgColor}`}
                        variant="ghost"
                        size="icon"
                        onClick={reset}
                    >
                        <Icons.MinusCircled className="w-5 h-5 text-teal-200" />
                    </Button>
                )}
            </motion.div>
        );
    };

    return (
        <>
            <StepHeader>{renderHeader()}</StepHeader>
            <StepContent>
                {renderProjectInfo()}
            </StepContent>
            <StepFooter>
                <Button type="button" onClick={prevStep} variant="outline" className="px-3 py-2">
                    Cancel
                </Button>
                {projectData.folderPath ? (
                    <Button
                        type="button"
                        onClick={validation?.isValid ? nextStep : reset}
                        className="px-3 py-2"
                        disabled={isUploading}
                    >
                        {validation?.isValid ? 'Finish setup' : 'Select a different folder'}
                    </Button>
                ) : (
                    <Button
                        disabled={!projectData.folderPath || !!error || isUploading}
                        type="button"
                        onClick={nextStep}
                        className="px-3 py-2"
                    >
                        Continue
                    </Button>
                )}
            </StepFooter>
        </>
    );
};
