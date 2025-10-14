'use client';

import { useEditorEngine } from '@/components/store/editor';
import { hashContent } from '@/services/sync-engine/sync-engine';
import { EditorView } from '@codemirror/view';
import { useDirectory, useFile } from '@onlook/file-system/hooks';
import { MessageContextType } from '@onlook/models';
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
    handleCreateFile: (filePath: string, content?: string | Uint8Array) => Promise<void>;
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
            // Preserve scroll position and cursor before save
            const editorView = editorViewsRef.current.get(selectedFilePath);
            const scrollPos = editorView ? {
                top: editorView.scrollDOM.scrollTop,
                left: editorView.scrollDOM.scrollLeft
            } : null;

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

                // Restore scroll position after content update with multiple attempts to ensure it sticks
                if (scrollPos && editorView) {
                    const restoreScroll = () => {
                        editorView.scrollDOM.scrollTop = scrollPos.top;
                        editorView.scrollDOM.scrollLeft = scrollPos.left;
                    };

                    // Use multiple RAF cycles to ensure the scroll is applied after all reflows
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            restoreScroll();
                            // One more check after a short delay to handle any final adjustments
                            setTimeout(restoreScroll, 10);
                        });
                    });
                }
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

    const handleRenameFile = (oldPath: string, newPath: string) => {
        if (!branchData?.codeEditor) return;

        const fileName = oldPath.split('/').pop() || 'file';
        const newFileName = newPath.split('/').pop() || 'file';

        toast.promise(
            branchData.codeEditor.moveFile(oldPath, newPath),
            {
                loading: `Renaming ${fileName}...`,
                success: `Renamed to ${newFileName}`,
                error: (error) => `Failed to rename: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
        );
    };

    const handleDeleteFile = (path: string) => {
        if (!branchData?.codeEditor) return;

        const fileName = path.split('/').pop() || 'item';
        const isDirectory = fileEntries.some(entry => {
            const checkPath = (e: typeof fileEntries[0]): boolean => {
                if (pathsEqual(e.path, path)) return e.isDirectory;
                if (e.children) return e.children.some(checkPath);
                return false;
            };
            return checkPath(entry);
        });

        toast.promise(
            branchData.codeEditor.deleteFile(path),
            {
                loading: `Deleting ${fileName}...`,
                success: `${isDirectory ? 'Folder' : 'File'} "${fileName}" deleted`,
                error: (error) => `Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
        );
    };

    const handleCreateFile = async (filePath: string, content: string | Uint8Array = '') => {
        if (!branchData) {
            throw new Error('Branch data not found');
        }

        const fileName = filePath.split('/').pop() || 'file';

        await toast.promise(
            branchData.codeEditor.writeFile(filePath, content),
            {
                loading: `Creating ${fileName}...`,
                success: `File "${fileName}" created`,
                error: (error) => `Failed to create file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
        );
    };

    const handleCreateFolder = async (folderPath: string) => {
        if (!branchData?.codeEditor) {
            throw new Error('Code editor not available');
        }

        const folderName = folderPath.split('/').pop() || 'folder';

        await toast.promise(
            branchData.codeEditor.createDirectory(folderPath),
            {
                loading: `Creating ${folderName}...`,
                success: `Folder "${folderName}" created`,
                error: (error) => `Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
            }
        );
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

    // Handle adding selection to chat
    const handleAddSelectionToChat = useCallback((selection: { from: number; to: number; text: string }) => {
        if (!selection || !selectedFilePath || !activeEditorFile?.content) return;

        try {
            // Calculate line numbers from character positions
            const content = typeof activeEditorFile.content === 'string' ? activeEditorFile.content : '';

            // Validate selection indices
            if (typeof selection.from !== 'number' || typeof selection.to !== 'number') {
                console.error('Invalid selection: from and to must be numbers', selection);
                toast.error('Invalid selection');
                return;
            }

            // Ensure from < to
            if (selection.from >= selection.to) {
                console.error('Invalid selection: from must be less than to', selection);
                toast.error('Invalid selection range');
                return;
            }

            // Clamp indices to valid range [0, content.length]
            const from = Math.max(0, Math.min(selection.from, content.length));
            const to = Math.max(0, Math.min(selection.to, content.length));

            // Double-check after clamping
            if (from >= to) {
                console.error('Invalid selection after clamping', { from, to, contentLength: content.length });
                toast.error('Selection is out of bounds');
                return;
            }

            const beforeSelection = content.substring(0, from);
            const selectionContent = content.substring(from, to);
            const startLine = beforeSelection.split('\n').length;
            const endLine = startLine + selectionContent.split('\n').length - 1;

            const fileName = selectedFilePath.split('/').pop() || selectedFilePath;
            // Add highlight context (selected code snippet)
            editorEngine.chat.context.addContexts([{
                type: MessageContextType.HIGHLIGHT,
                path: selectedFilePath,
                content: selection.text,
                displayName: fileName + ' (' + startLine + ':' + endLine + ')',
                start: startLine,
                end: endLine,
                branchId: branchId,
            }]);

            toast.success('Selection added to chat context');
        } catch (error) {
            console.error('Error adding selection to chat:', error);
            toast.error('Failed to add selection to chat');
        }
    }, [selectedFilePath, activeEditorFile, branchId, editorEngine.chat.context]);

    // Cleanup editor instances when component unmounts
    useEffect(() => {
        return () => {
            editorViewsRef.current.forEach((view) => view.destroy());
            editorViewsRef.current.clear();
        };
    }, []);

    // Handle adding file to chat
    const handleAddFileToChat = useCallback(async (filePath: string) => {
        if (!branchData) return;

        try {
            const fileName = filePath.split('/').pop() || filePath;

            // Load the file content
            const fileContent = await branchData.codeEditor.readFile(filePath);
            if (!fileContent) {
                throw new Error('Failed to load file');
            }

            // Convert content to string (handle both string and Uint8Array)
            const contentString = typeof fileContent === 'string'
                ? fileContent
                : new TextDecoder().decode(fileContent);

            editorEngine.chat.context.addContexts([{
                type: MessageContextType.FILE,
                path: filePath,
                displayName: fileName,
                branchId: branchId,
                content: contentString,
            }]);

            toast.success('File added to chat');
        } catch (error) {
            console.error('Failed to add file to chat:', error);
            toast.error('Failed to add file to chat');
        }
    }, [branchId, branchData, editorEngine.chat.context]);


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
                        onAddToChat={handleAddFileToChat}
                    />
                </motion.div>
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <FileTabs
                        openedFiles={openedEditorFiles}
                        activeFile={activeEditorFile}
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
                        onAddSelectionToChat={handleAddSelectionToChat}
                        onFocusChatInput={() => editorEngine.chat.focusChatInput()}
                    />
                </div>
            </div>
        </div>
    );
}))
