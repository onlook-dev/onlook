'use client';

import { useEditorEngine } from '@/components/store/editor';
import { hashContent } from '@/services/sync-engine/sync-engine';
import { EditorView } from '@codemirror/view';
import { useDirectory, useFile } from '@onlook/file-system/hooks';
import { toast } from '@onlook/ui/sonner';
import { pathsEqual } from '@onlook/utility';
import { motion } from 'motion/react';
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { CodeEditorArea } from './file-content';
import { FileTabs } from './file-tabs';
import { CodeControls } from './header-controls';
import { useCodeNavigation } from './hooks/use-code-navigation';
import type { BinaryEditorFile, EditorFile, TextEditorFile } from './shared/types';
import { isDirty } from './shared/utils';
import { FileTree } from './sidebar/file-tree';

// Keep the number of opened files below the soft limit to avoid performance issues
const SOFT_MAX_OPENED_FILES = 7;

export interface CodeTabRef {
    hasUnsavedChanges: boolean;
    getCurrentPath: () => string;
    handleSaveFile: () => Promise<void>;
    refreshFileTree: () => void;
    handleCreateFile: (filePath: string, content?: string) => Promise<void>;
    handleCreateFolder: (folderPath: string) => Promise<void>;
}

interface CodeTabProps {
    projectId: string;
    branchId: string;
}

const createEditorFile = async (filePath: string, content: string | Uint8Array): Promise<EditorFile> => {
    const isBinary = content instanceof Uint8Array;

    if (isBinary) {
        return {
            path: filePath,
            content: content,
            type: 'binary',
            originalHash: null,
        } satisfies BinaryEditorFile;
    } else if (typeof content === 'string') {
        const originalHash = await hashContent(content);
        return {
            path: filePath,
            content: content,
            type: 'text',
            originalHash,
        } as TextEditorFile;
    } else {
        throw new Error('Invalid content type');
    }
}

export const CodeTab = memo(forwardRef<CodeTabRef, CodeTabProps>(({ projectId, branchId }, ref) => {
    const editorEngine = useEditorEngine();
    const editorViewsRef = useRef<Map<string, EditorView>>(new Map());
    const navigationTarget = useCodeNavigation();

    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [activeEditorFile, setActiveEditorFile] = useState<EditorFile | null>(null);
    const [openedEditorFiles, setOpenedEditorFiles] = useState<EditorFile[]>([]);
    const [showLocalUnsavedDialog, setShowLocalUnsavedDialog] = useState(false);
    const [filesToClose, setFilesToClose] = useState<string[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(openedEditorFiles.length === 0);
    const [editorSelection, setEditorSelection] = useState<{ from: number; to: number; text: string } | null>(null);

    // This is a workaround to allow code controls to access the hasUnsavedChanges state
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const branchData = editorEngine.branches.getBranchDataById(branchId);
    const {
        entries: fileEntries,
        loading: filesLoading,
    } = useDirectory(projectId, branchId, '/');

    const {
        content: loadedContent,
    } = useFile(projectId, branchId, selectedFilePath || '');

    // React to loadedContent changes - build local EditorFile and manage opened files
    useEffect(() => {
        if (!selectedFilePath || !loadedContent) return;

        const processFile = async () => {
            const newLocalFile = await createEditorFile(selectedFilePath, loadedContent);
            const existingFileIndex = openedEditorFiles.findIndex(f => pathsEqual(f.path, selectedFilePath));

            if (existingFileIndex >= 0) {
                updateExistingFile(existingFileIndex, newLocalFile);
            } else {
                addNewFile(newLocalFile);
            }
        };

        const updateExistingFile = (index: number, newFile: EditorFile) => {
            const existingFile = openedEditorFiles[index];
            if (!existingFile) return;

            const updatedFile = createUpdatedFile(existingFile, newFile);
            const updatedFiles = [...openedEditorFiles];
            updatedFiles[index] = updatedFile;

            setOpenedEditorFiles(updatedFiles);
            setActiveEditorFile(updatedFile);
        };

        const addNewFile = async (newFile: EditorFile) => {
            // If we've reached the limit, try to close first non-dirty file
            if (openedEditorFiles.length >= SOFT_MAX_OPENED_FILES) {
                const dirtyChecks = await Promise.all(
                    openedEditorFiles.map(async file => ({
                        file,
                        dirty: await isDirty(file)
                    }))
                );

                // Find first non-dirty file
                const fileToClose = dirtyChecks.find(check => !check.dirty)?.file;

                if (fileToClose) {
                    closeFileInternal(fileToClose.path);
                }
            }

            setOpenedEditorFiles(prev => [...prev, newFile]);
            setActiveEditorFile(newFile);
        };

        const createUpdatedFile = (existing: EditorFile, newFile: EditorFile): EditorFile => {
            if (existing.type === 'binary') {
                return { ...existing, content: newFile.content };
            }

            const existingText = existing as TextEditorFile;
            const newText = newFile as TextEditorFile;
            const diskContentChanged = existingText.originalHash !== newText.originalHash;

            return {
                ...existingText,
                content: diskContentChanged ? newText.content : existingText.content,
                originalHash: diskContentChanged ? newText.originalHash : existingText.originalHash,
            };
        };

        processFile();
    }, [loadedContent]);

    useEffect(() => {
        if (!navigationTarget) return;

        const { filePath } = navigationTarget;

        if (!selectedFilePath || !pathsEqual(selectedFilePath, filePath)) {
            setSelectedFilePath(filePath);
        }
    }, [navigationTarget]);

    // Track dirty state of opened files
    useEffect(() => {
        const checkDirtyState = async () => {
            if (openedEditorFiles.length === 0) {
                setHasUnsavedChanges(false);
                return;
            }

            const dirtyChecks = await Promise.all(
                openedEditorFiles.map(file => isDirty(file))
            );
            setHasUnsavedChanges(dirtyChecks.some(dirty => dirty));
        };

        checkDirtyState();
    }, [openedEditorFiles]);

    const refreshFileTree = () => {
        // Force refresh of file entries
        // This will cause the file tree to re-render with updated file list
        // Note: The useDirectory hook automatically handles file watching,
        // but this provides an explicit refresh mechanism for after file operations
        setTimeout(() => {
            // Simple state update to trigger re-render
            setSelectedFilePath(prev => prev);
        }, 100);
    };

    // Get current directory from selected file path or default to root
    const getCurrentPath = () => {
        if (!selectedFilePath) return '';
        const parts = selectedFilePath.split('/');
        parts.pop(); // Remove filename to get directory
        return parts.join('/');
    };

    const handleFileTreeSelect = (filePath: string, searchTerm?: string) => {
        setSelectedFilePath(filePath);
        if (searchTerm) {
            //    TODO: Reimplement search term handling
        }
    };

    const saveFileWithHash = async (filePath: string, file: EditorFile): Promise<EditorFile> => {
        if (!branchData) {
            throw new Error('Branch data not found');
        }

        await branchData.codeEditor.writeFile(filePath, file.content || '');

        if (file.type === 'text') {
            const newHash = await hashContent(file.content);
            return { ...file, originalHash: newHash };
        }

        return file;
    };

    const handleSaveFile = async () => {
        if (!selectedFilePath || !activeEditorFile || !branchData) return;
        try {
            await saveFileWithHash(selectedFilePath, activeEditorFile);

            // Read back the formatted content from disk
            const formattedContent = await branchData.codeEditor.readFile(selectedFilePath);
            if (typeof formattedContent === 'string') {
                const newHash = await hashContent(formattedContent);
                const formattedFile: TextEditorFile = {
                    ...activeEditorFile as TextEditorFile,
                    content: formattedContent,
                    originalHash: newHash
                };

                // Update in opened files list
                const updatedFiles = openedEditorFiles.map(file =>
                    pathsEqual(file.path, selectedFilePath) ? formattedFile : file
                );
                setOpenedEditorFiles(updatedFiles);
                setActiveEditorFile(formattedFile);
            }
        } catch (error) {
            console.error('Failed to save file:', error);
            alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleSaveAndCloseFiles = async () => {
        try {
            // Save all files in filesToClose
            await Promise.all(filesToClose.map(async (filePath) => {
                const fileToSave = openedEditorFiles.find(f => pathsEqual(f.path, filePath));
                if (!fileToSave) return;

                await saveFileWithHash(filePath, fileToSave);
            }));

            // Close the files (no need to update hashes since we're closing them)
            filesToClose.forEach(filePath => closeFileInternal(filePath));
            setFilesToClose([]);
            setShowLocalUnsavedDialog(false);
        } catch (error) {
            console.error('Failed to save files:', error);
            alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const closeLocalFile = useCallback((filePath: string) => {
        const fileToClose = openedEditorFiles.find(f => pathsEqual(f.path, filePath));
        if (fileToClose) {
            isDirty(fileToClose).then(dirty => {
                if (dirty) {
                    setFilesToClose([filePath]);
                    setShowLocalUnsavedDialog(true);
                    return;
                }

                closeFileInternal(filePath);
            });
        }
    }, [openedEditorFiles]);

    const closeAllLocalFiles = () => {
        Promise.all(openedEditorFiles.map(async file => ({
            file,
            dirty: await isDirty(file)
        }))).then(fileStatuses => {
            // Close clean files immediately
            const cleanFiles = fileStatuses.filter(status => !status.dirty);
            cleanFiles.forEach(status => closeFileInternal(status.file.path));

            // Check if any dirty files remain
            const dirtyFiles = fileStatuses.filter(status => status.dirty);
            if (dirtyFiles.length > 0) {
                setFilesToClose(dirtyFiles.map(status => status.file.path));
                setShowLocalUnsavedDialog(true);
                return;
            }
        });
    };

    const handleLocalFileTabSelect = (file: EditorFile) => {
        setActiveEditorFile(file);
        setSelectedFilePath(file.path);
    };

    const updateLocalFileContent = (filePath: string, content: string) => {
        const updatedFiles = openedEditorFiles.map(file =>
            pathsEqual(file.path, filePath)
                ? { ...file, content }
                : file
        );
        setOpenedEditorFiles(updatedFiles);

        // Update active file if it's the one being updated
        if (activeEditorFile && pathsEqual(activeEditorFile.path, filePath)) {
            const updatedActiveFile = { ...activeEditorFile, content };
            setActiveEditorFile(updatedActiveFile);
        }
    };

    // Centralized function to close a file and clean up resources
    const closeFileInternal = (filePath: string) => {
        const editorView = editorViewsRef.current.get(filePath);
        if (editorView) {
            editorView.destroy();
            editorViewsRef.current.delete(filePath);
        }

        setOpenedEditorFiles(prev => {
            const updatedFiles = prev.filter(f => !pathsEqual(f.path, filePath));

            // Update active file if we're closing it
            if (activeEditorFile && pathsEqual(activeEditorFile.path, filePath)) {
                const newActiveFile = updatedFiles.length > 0 ? updatedFiles[updatedFiles.length - 1] || null : null;
                setActiveEditorFile(newActiveFile);
            }

            return updatedFiles;
        });

        // Clear selected file path if the closed file was selected
        if (selectedFilePath && pathsEqual(selectedFilePath, filePath)) {
            setSelectedFilePath(null);
        }
    };

    const discardLocalFileChanges = () => {
        filesToClose.forEach(filePath => closeFileInternal(filePath));
        setFilesToClose([]);
        setShowLocalUnsavedDialog(false);
    };

    const handleRenameFile = (oldPath: string, newName: string) => {
        if (!branchData?.codeEditor) return;
        try {
            branchData.codeEditor.moveFile(oldPath, newName);
        } catch (error) {
            console.error('Failed to rename file:', error);
            toast.error(`Failed to rename: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleDeleteFile = (path: string) => {
        if (!branchData?.codeEditor) return;
        try {
            branchData.codeEditor.deleteFile(path);
        } catch (error) {
            console.error('Failed to delete file:', error);
            toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleCreateFile = async (filePath: string, content: string = '') => {
        try {
            if (!branchData) {
                throw new Error('Branch data not found');
            }

            await branchData.codeEditor.writeFile(filePath, content);

            toast(`File "${filePath.split('/').pop()}" created successfully!`);
        } catch (error) {
            console.error('Failed to create file:', error);
            throw error;
        }
    };

    const handleCreateFolder = async (folderPath: string) => {
        if (!branchData?.codeEditor) throw new Error('Code editor not available');
        try {
            await branchData.codeEditor.createDirectory(folderPath);
            toast(`Folder "${folderPath.split('/').pop()}" created successfully!`);
        } catch (error) {
            console.error('Failed to create folder:', error);
            throw error;
        }
    };

    // Expose functions through ref. This won't be needed once we move the code controls
    useImperativeHandle(ref, (): CodeTabRef => ({
        hasUnsavedChanges,
        getCurrentPath,
        handleSaveFile,
        refreshFileTree,
        handleCreateFile,
        handleCreateFolder
    }), [hasUnsavedChanges, getCurrentPath, handleSaveFile, refreshFileTree, handleCreateFile, handleCreateFolder]);

    // Cleanup editor instances when component unmounts
    useEffect(() => {
        return () => {
            editorViewsRef.current.forEach((view) => view.destroy());
            editorViewsRef.current.clear();
        };
    }, []);


    return (
        <div className="flex flex-col size-full">
            <CodeControls
                isDirty={hasUnsavedChanges}
                currentPath={getCurrentPath()}
                onSave={handleSaveFile}
                onRefresh={refreshFileTree}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                selection={editorSelection}
            />
            <div className="flex flex-1 overflow-auto min-h-0">
                <motion.div
                    initial={false}
                    animate={{
                        width: isSidebarOpen ? "auto" : 0,
                        opacity: isSidebarOpen ? 1 : 0
                    }}
                    transition={{
                        duration: 0.3,
                        ease: [0.4, 0.0, 0.2, 1]
                    }}
                    className="flex-shrink-0 overflow-y-auto min-h-0"
                    style={{ minWidth: 0 }}>
                    <FileTree
                        onFileSelect={handleFileTreeSelect}
                        fileEntries={fileEntries}
                        isLoading={filesLoading}
                        selectedFilePath={selectedFilePath}
                        onDeleteFile={handleDeleteFile}
                        onRenameFile={handleRenameFile}
                        onRefresh={() => { }}
                    />
                </motion.div>
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <FileTabs
                        openedFiles={openedEditorFiles}
                        activeFile={activeEditorFile}
                        isSidebarOpen={isSidebarOpen}
                        setIsSidebarOpen={setIsSidebarOpen}
                        onFileSelect={handleLocalFileTabSelect}
                        onCloseFile={closeLocalFile}
                        onCloseAllFiles={closeAllLocalFiles}
                    />
                    <CodeEditorArea
                        editorViewsRef={editorViewsRef}
                        openedFiles={openedEditorFiles}
                        activeFile={activeEditorFile}
                        showUnsavedDialog={showLocalUnsavedDialog}
                        navigationTarget={navigationTarget}
                        onSaveFile={handleSaveFile}
                        onSaveAndCloseFiles={handleSaveAndCloseFiles}
                        onUpdateFileContent={updateLocalFileContent}
                        onDiscardChanges={discardLocalFileChanges}
                        onCancelUnsaved={() => {
                            setFilesToClose([]);
                            setShowLocalUnsavedDialog(false);
                        }}
                        fileCountToClose={filesToClose.length}
                        onSelectionChange={setEditorSelection}
                    />
                </div>
            </div>
        </div>
    );
}))
