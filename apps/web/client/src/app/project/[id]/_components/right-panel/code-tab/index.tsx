import { useEditorEngine } from '@/components/store/editor';
import { hashContent } from '@/services/sync-engine/sync-engine';
import { EditorView } from '@codemirror/view';
import { useDirectory, useFile, useFS } from '@onlook/file-system/hooks';
import { toast } from '@onlook/ui/sonner';
import { pathsEqual } from '@onlook/utility';
import { observer } from 'mobx-react-lite';
import { motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CodeEditorArea } from './file-content';
import { FileTabs } from './file-tabs';
import { CodeControls } from './header-controls';
import { useCodeNavigation } from './hooks/use-code-navigation';
import type { BinaryEditorFile, EditorFile, TextEditorFile } from './shared/types';
import { isDirty } from './shared/utils';
import { FileTree } from './sidebar/file-tree';

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

export const CodeTab = observer(() => {
    const editorEngine = useEditorEngine();
    const rootDir = `/${editorEngine.projectId}/${editorEngine.branches.activeBranch.id}`;
    const editorViewsRef = useRef<Map<string, EditorView>>(new Map());
    const navigationTarget = useCodeNavigation();


    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [activeEditorFile, setActiveEditorFile] = useState<EditorFile | null>(null);
    const [openedEditorFiles, setOpenedEditorFiles] = useState<EditorFile[]>([]);
    const [showLocalUnsavedDialog, setShowLocalUnsavedDialog] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);


    const { fs } = useFS(rootDir);
    const {
        entries: fileEntries,
        loading: filesLoading,
    } = useDirectory(rootDir, '/');


    const {
        content: loadedContent,
    } = useFile(rootDir, selectedFilePath || '');

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

        const addNewFile = (newFile: EditorFile) => {
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

    const handleSaveFile = async () => {
        if (!selectedFilePath || !activeEditorFile) return;
        try {
            const branchData = editorEngine.branches.getBranchDataById(editorEngine.branches.activeBranch.id);
            if (!branchData) {
                throw new Error('Branch data not found');
            }

            await branchData.codeEditor.writeFile(selectedFilePath, activeEditorFile.content || '');

            // Update originalHash to mark file as clean after successful save
            if (activeEditorFile.type === 'text') {
                const newHash = await hashContent(activeEditorFile.content);
                const updatedFile = { ...activeEditorFile, originalHash: newHash };

                // Update in opened files list
                const updatedFiles = openedEditorFiles.map(file =>
                    pathsEqual(file.path, selectedFilePath) ? updatedFile : file
                );
                setOpenedEditorFiles(updatedFiles);
                setActiveEditorFile(updatedFile);
            }
        } catch (error) {
            console.error('Failed to save file:', error);
            alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const closeLocalFile = useCallback((filePath: string) => {
        const fileToClose = openedEditorFiles.find(f => pathsEqual(f.path, filePath));
        if (fileToClose) {
            isDirty(fileToClose).then(dirty => {
                if (dirty) {
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

        const updatedFiles = openedEditorFiles.filter(f => !pathsEqual(f.path, filePath));
        setOpenedEditorFiles(updatedFiles);

        if (activeEditorFile && pathsEqual(activeEditorFile.path, filePath)) {
            const newActiveFile = updatedFiles.length > 0 ? updatedFiles[updatedFiles.length - 1] || null : null;
            setActiveEditorFile(newActiveFile);
        }

        // Clear selected file path if the closed file was selected
        if (selectedFilePath && pathsEqual(selectedFilePath, filePath)) {
            setSelectedFilePath(null);
        }
    };

    const discardLocalFileChanges = (filePath: string) => {
        closeFileInternal(filePath);
        setShowLocalUnsavedDialog(false);
    };

    const handleRenameFile = (oldPath: string, newName: string) => {
        if (!fs) return;
        try {
            fs.moveFile(oldPath, newName);
        } catch (error) {
            console.error('Failed to rename file:', error);
            toast.error(`Failed to rename: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleDeleteFile = (path: string) => {
        if (!fs) return;
        try {
            fs.deleteFile(path);
        } catch (error) {
            console.error('Failed to delete file:', error);
            toast.error(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleCreateFile = async (filePath: string, content: string = '') => {
        try {
            const branchData = editorEngine.branches.getBranchDataById(editorEngine.branches.activeBranch.id);
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
        if (!fs) throw new Error('File system not available');
        try {
            await fs.createDirectory(folderPath);
            toast(`Folder "${folderPath.split('/').pop()}" created successfully!`);
        } catch (error) {
            console.error('Failed to create folder:', error);
            throw error;
        }
    };

    // Cleanup editor instances when component unmounts
    useEffect(() => {
        return () => {
            editorViewsRef.current.forEach((view) => view.destroy());
            editorViewsRef.current.clear();
        };
    }, []);

    return (
        <div className="size-full flex flex-row flex-1 min-h-0 relative">
            {/* Absolute position for encapsulation */}
            <div className="absolute right-2 -top-9">
                <CodeControls
                    isDirty={hasUnsavedChanges}
                    currentPath={getCurrentPath()}
                    onSave={handleSaveFile}
                    onRefresh={refreshFileTree}
                    onCreateFile={handleCreateFile}
                    onCreateFolder={handleCreateFolder}
                />
            </div>

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
                className="flex-shrink-0 overflow-y-auto"
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
                    onUpdateFileContent={updateLocalFileContent}
                    onDiscardChanges={discardLocalFileChanges}
                    onCancelUnsaved={() => {
                        setShowLocalUnsavedDialog(false);
                    }}
                />
            </div>
        </div>
    );
});
