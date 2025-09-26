import { useEditorEngine } from '@/components/store/editor';
import type { CodeRange, EditorFile } from '@/components/store/editor/ide';
import { EditorView } from '@codemirror/view';
import { useDirectory, useFile, type FileEntry } from '@onlook/file-system/hooks';
import { toast } from '@onlook/ui/sonner';
import { EditorSelection } from '@uiw/react-codemirror';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CodeEditorArea } from './file-content';
import { createSearchHighlight, scrollToFirstMatch } from './file-content/code-mirror-config';
import { FileTabs } from './file-tabs';
import type { FileNode } from './shared/types';
import { FileTree } from './sidebar/file-tree';

export const CodeTab = () => {
    const editorEngine = useEditorEngine();

    // File system
    const rootDir = `/${editorEngine.projectId}/${editorEngine.branches.activeBranch.id}`;
    // const { fs, isInitializing: fsInitializing, error: fsError } = useFS(rootDir);

    // Use directory hook for local files
    const {
        entries: localEntries,
        loading: localDirLoading,
        error: localDirError,
    } = useDirectory(rootDir, '/');

    // File browser state
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    // Local file management state using EditorFile interface
    const [openedLocalFiles, setOpenedLocalFiles] = useState<EditorFile[]>([]);
    const [activeLocalFile, setActiveLocalFile] = useState<EditorFile | null>(null);
    const [showLocalUnsavedDialog, setShowLocalUnsavedDialog] = useState(false);

    // Use file hook for selected file
    const {
        content: loadedContent,
        loading: isLoadingContent,
        error: fileError,
    } = useFile(rootDir, selectedFile || '');

    // Convert FileEntry[] to FileNode[] format
    const convertToFileNodes = (entries: FileEntry[]): FileNode[] => {
        return entries.map((entry) => ({
            name: entry.name,
            path: entry.path,
            type: entry.isDirectory ? 'directory' : 'file',
            children: entry.children ? convertToFileNodes(entry.children) : undefined,
        }));
    };

    const localFiles = convertToFileNodes(localEntries ?? []);

    // Helper function to create EditorFile from local file data
    const createLocalEditorFile = (filePath: string, content: string | Uint8Array | null): EditorFile => {
        const fileName = filePath.split('/').pop() || filePath;
        const fileExtension = fileName.includes('.') ? fileName.split('.').pop() || '' : '';
        const stringContent = typeof content === 'string' ? content : '';

        return {
            id: filePath, // Use file path as unique ID
            path: filePath,
            filename: fileName,
            content: stringContent,
            language: fileExtension,
            isDirty: false,
            isBinary: typeof content !== 'string',
            savedContent: stringContent,
        };
    };

    // React to selectedFile changes - build local EditorFile and manage opened files
    useEffect(() => {
        if (!selectedFile || !loadedContent) return;

        const newLocalFile = createLocalEditorFile(selectedFile, loadedContent);

        // Check if file is already open
        const existingFileIndex = openedLocalFiles.findIndex(f => f.path === selectedFile);

        if (existingFileIndex >= 0) {
            // File already open, just set as active and update content
            const existingFile = openedLocalFiles[existingFileIndex];
            if (existingFile) {
                const updatedFile: EditorFile = {
                    id: existingFile.id,
                    filename: existingFile.filename,
                    path: existingFile.path,
                    language: existingFile.language,
                    isDirty: existingFile.isDirty,
                    isBinary: existingFile.isBinary,
                    savedContent: existingFile.savedContent,
                    content: newLocalFile.content
                };
                const updatedFiles = [...openedLocalFiles];
                updatedFiles[existingFileIndex] = updatedFile;
                setOpenedLocalFiles(updatedFiles);
                setActiveLocalFile(updatedFile);
            }
        } else {
            // Add new file to opened files
            const updatedFiles = [...openedLocalFiles, newLocalFile];
            setOpenedLocalFiles(updatedFiles);
            setActiveLocalFile(newLocalFile);
        }
    }, [selectedFile, loadedContent]);

    // _____________________________________________________

    const ide = editorEngine.ide;
    const editorViewsRef = useRef<Map<string, EditorView>>(new Map());
    const fileTabsContainerRef = useRef<HTMLDivElement>(null);

    // Helper function to check if sandbox is connected and ready
    const isSandboxReady = ide.isSandboxReady;

    const getActiveEditorView = (): EditorView | undefined => {
        if (!ide.activeFile) {
            return undefined;
        }
        return editorViewsRef.current.get(ide.activeFile.id);
    };

    useEffect(() => {
        const checkSelectedElement = async () => {
            const selectedElements = editorEngine.elements.selected;
            if (selectedElements.length === 0) {
                return;
            }

            const element = selectedElements[0];
            ide.isLoading = true;

            try {
                const filePath = await getFilePathFromOid(element?.oid || '');

                if (filePath) {
                    // Update local selected file state which will trigger IDE sync
                    setSelectedFile(filePath);

                    // Wait a bit for the file to load in IDE, then get range
                    setTimeout(async () => {
                        const range = await getElementCodeRange(element);
                        if (range) {
                            ide.setHighlightRange(range);
                        }
                    }, 100);
                }
            } catch (error) {
                console.error('Error loading file for selected element:', error);
            } finally {
                ide.isLoading = false;
            }
        };

        checkSelectedElement();
    }, [editorEngine.elements.selected]);

    async function getElementCodeRange(element: any): Promise<CodeRange | null> {
        if (!ide.activeFile || !element.oid) {
            return null;
        }

        if (!isSandboxReady) {
            return null;
        }

        try {
            const templateNode = editorEngine.templateNodes.getTemplateNode(element.oid);
            if (templateNode?.startTag) {
                return {
                    startLineNumber: templateNode.startTag.start.line,
                    startColumn: templateNode.startTag.start.column,
                    endLineNumber: templateNode.endTag?.end.line || templateNode.startTag.end.line,
                    endColumn: templateNode.endTag?.end.column || templateNode.startTag.end.column,
                };
            }
        } catch (error) {
            console.error('Error getting element code range:', error);
        }
        return null;
    }

    useEffect(() => {
        if (!ide.activeFile || !ide.highlightRange) {
            return;
        }

        const editorView = getActiveEditorView();
        if (!editorView) {
            return;
        }

        try {
            // Calculate positions for scrolling
            const lines = ide.activeFile!.content.split('\n');

            // Safety check - validate line numbers are within bounds
            if (
                ide.highlightRange.startLineNumber > lines.length ||
                ide.highlightRange.endLineNumber > lines.length ||
                ide.highlightRange.startLineNumber < 1 ||
                ide.highlightRange.endLineNumber < 1
            ) {
                console.warn('Highlight range out of bounds, clearing selection');
                ide.setHighlightRange(null);
                return;
            }

            // Calculate start position
            let startPos = 0;
            for (let i = 0; i < ide.highlightRange.startLineNumber - 1; i++) {
                startPos += (lines[i]?.length || 0) + 1; // +1 for newline
            }
            startPos += ide.highlightRange.startColumn;

            // Calculate end position
            let endPos = 0;
            for (let i = 0; i < ide.highlightRange.endLineNumber - 1; i++) {
                endPos += (lines[i]?.length || 0) + 1; // +1 for newline
            }
            endPos += ide.highlightRange.endColumn;

            if (
                startPos >= ide.activeFile!.content.length ||
                endPos > ide.activeFile!.content.length ||
                startPos < 0 ||
                endPos < 0
            ) {
                console.warn('Highlight position out of bounds, clearing selection');
                ide.setHighlightRange(null);
                return;
            }

            // Create the selection and apply it in a single transaction
            const selection = EditorSelection.create([EditorSelection.range(startPos, endPos)]);

            editorView.dispatch({
                selection,
                effects: [
                    EditorView.scrollIntoView(startPos, {
                        y: 'start',
                        yMargin: 48
                    })
                ],
                userEvent: 'select.element'
            });

            // Force the editor to focus
            editorView.focus();
        } catch (error) {
            console.error('Error applying highlight:', error);
            ide.setHighlightRange(null);
        }
    }, [ide.highlightRange, ide.activeFile]);

    useEffect(() => {
        if (!ide.activeFile || !ide.searchTerm) {
            return;
        }

        const editorView = getActiveEditorView();
        if (!editorView) {
            return;
        }

        try {
            editorView.dispatch({
                effects: createSearchHighlight(ide.searchTerm)
            });

            setTimeout(() => {
                scrollToFirstMatch(editorView, ide.searchTerm);
            }, 100);
        } catch (error) {
            console.error('Error applying search highlight:', error);
        }
    }, [ide.searchTerm, ide.activeFile]);

    const handleFileTreeSelect = useCallback((filePath: string, searchTerm?: string) => {
        // Update the local selected file state
        setSelectedFile(filePath);

        // Store search term if provided for potential IDE usage
        if (searchTerm) {
            // Could store this in a ref or state if needed by IDE later
        }
    }, []);

    // Sync selected file changes to IDE
    useEffect(() => {
        const syncSelectedFileToIDE = async () => {
            if (!selectedFile || !isSandboxReady) {
                return;
            }

            try {
                // Load file in IDE when local selection changes
                await ide.openFile(selectedFile, undefined, false);
            } catch (error) {
                console.error('Error syncing selected file to IDE:', error);
            }
        };

        syncSelectedFileToIDE();
    }, [selectedFile, isSandboxReady]);

    // Sync IDE active file changes back to local state
    useEffect(() => {
        if (ide.activeFile?.path && ide.activeFile.path !== selectedFile) {
            setSelectedFile(ide.activeFile.path);
        }
    }, [ide.activeFile?.path, selectedFile]);

    function handleFileTabSelect(file: EditorFile) {
        ide.setHighlightRange(null);
        ide.activeFile = file;
    }

    async function getFilePathFromOid(oid: string): Promise<string | null> {
        return ide.getFilePathFromOid(oid);
    }

    // Local file operations
    const closeLocalFile = useCallback((fileId: string) => {
        const fileToClose = openedLocalFiles.find(f => f.id === fileId);
        if (fileToClose?.isDirty) {
            setShowLocalUnsavedDialog(true);
            return;
        }

        const editorView = editorViewsRef.current.get(fileId);
        if (editorView) {
            editorView.destroy();
            editorViewsRef.current.delete(fileId);
        }

        const updatedFiles = openedLocalFiles.filter(f => f.id !== fileId);
        setOpenedLocalFiles(updatedFiles);

        // Set new active file if we closed the active one
        if (activeLocalFile?.id === fileId) {
            const newActiveFile = updatedFiles.length > 0 ? updatedFiles[updatedFiles.length - 1] || null : null;
            setActiveLocalFile(newActiveFile);
        }
    }, [openedLocalFiles, activeLocalFile]);

    const closeAllLocalFiles = () => {
        const dirtyFiles = openedLocalFiles.filter((file) => file.isDirty);
        if (dirtyFiles.length > 0) {
            setShowLocalUnsavedDialog(true);
            return;
        }

        editorViewsRef.current.forEach((view) => view.destroy());
        editorViewsRef.current.clear();
        setOpenedLocalFiles([]);
        setActiveLocalFile(null);
    };

    const handleLocalFileTabSelect = (file: EditorFile) => {
        setActiveLocalFile(file);
        // Also update selectedFile to sync with file tree
        setSelectedFile(file.path);
    };

    const updateLocalFileContent = (fileId: string, content: string) => {
        const updatedFiles = openedLocalFiles.map(file =>
            file.id === fileId
                ? { ...file, content, isDirty: true }
                : file
        );
        setOpenedLocalFiles(updatedFiles);

        // Update active file if it's the one being updated
        if (activeLocalFile?.id === fileId) {
            const updatedActiveFile = { ...activeLocalFile, content, isDirty: true };
            setActiveLocalFile(updatedActiveFile);
        }
    };

    const closeFile = useCallback((fileId: string) => {
        if (ide.openedFiles.find(f => f.id === fileId)?.isDirty) {
            ide.showUnsavedDialog = true;
            return;
        }

        const editorView = editorViewsRef.current.get(fileId);
        if (editorView) {
            editorView.destroy();
            editorViewsRef.current.delete(fileId);
        }
        ide.closeFile(fileId);
    }, [ide]);

    const saveFile = async () => {
        if (!ide.activeFile) {
            return;
        }

        if (ide.pendingCloseAll) {
            const file = ide.openedFiles.find((f) => f.id === ide.activeFile?.id);
            if (file) {
                await ide.saveActiveFile();
                closeFile(file.id);
            }

            const remainingDirty = ide.openedFiles.filter((f) => f.isDirty);
            if (remainingDirty.length !== 0) {
                ide.showUnsavedDialog = true;
                return;
            }

            ide.closeAllFiles();
            ide.pendingCloseAll = false;
            ide.showUnsavedDialog = false;

            return;
        }

        await ide.saveActiveFile();

        if (ide.showUnsavedDialog) {
            ide.showUnsavedDialog = false;
            closeFile(ide.activeFile.id);
        }

        toast('File saved!');
    };


    function closeAllFiles() {
        const dirtyFiles = ide.openedFiles.filter((file) => file.isDirty);
        if (dirtyFiles.length > 0) {
            ide.showUnsavedDialog = true;
            ide.pendingCloseAll = true;
            return;
        }

        editorViewsRef.current.forEach((view) => view.destroy());
        editorViewsRef.current.clear();
        ide.closeAllFiles();
    }

    const updateFileContent = (fileId: string, content: string) => {
        ide.updateFileContent(fileId, content);
    };

    async function discardChanges(fileId: string) {
        if (ide.pendingCloseAll) {
            const file = ide.openedFiles.find((e) => e.id === fileId);
            if (file) {
                await ide.discardFileChanges(file.id);
                closeFile(fileId);
                ide.showUnsavedDialog = true;
                const isDirty = ide.openedFiles.filter((val) => val.isDirty);
                if (isDirty.length === 0) {
                    ide.closeAllFiles();
                    ide.pendingCloseAll = false;
                    ide.showUnsavedDialog = false;
                }
                return;
            }

            ide.pendingCloseAll = false;
            return;
        }

        if (!ide.activeFile) {
            return;
        }

        await ide.discardFileChanges(fileId);
        closeFile(fileId);
        ide.showUnsavedDialog = false;
    }

    // Cleanup editor instances when component unmounts
    useEffect(() => {
        return () => {
            editorViewsRef.current.forEach((view) => view.destroy());
            editorViewsRef.current.clear();
        };
    }, []);

    const scrollToActiveTab = useCallback(() => {
        if (!fileTabsContainerRef.current || !ide.activeFile) return;

        const container = fileTabsContainerRef.current;
        const activeTab = container.querySelector('[data-active="true"]');

        if (activeTab) {
            const containerRect = container.getBoundingClientRect();
            const tabRect = activeTab.getBoundingClientRect();

            // Calculate if the tab is outside the visible area
            if (tabRect.left < containerRect.left) {
                // Tab is to the left of the visible area
                container.scrollLeft += tabRect.left - containerRect.left;
            } else if (tabRect.right > containerRect.right) {
                // Tab is to the right of the visible area
                container.scrollLeft += tabRect.right - containerRect.right;
            }
        }
    }, [ide.activeFile]);

    // Scroll to active tab when it changes
    useEffect(() => {
        scrollToActiveTab();
    }, [ide.activeFile, scrollToActiveTab]);

    return (
        <div className="size-full flex flex-col">
            <div className="flex flex-1 min-h-0 overflow-hidden">
                <FileTree
                    onFileSelect={handleFileTreeSelect}
                    fileNodes={localFiles}
                    isLoading={localDirLoading}
                    selectedFilePath={selectedFile}
                />
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <FileTabs
                        ref={fileTabsContainerRef}
                        openedFiles={openedLocalFiles}
                        activeFile={activeLocalFile}
                        isFilesVisible={ide.isFilesVisible}
                        onToggleFilesVisible={() => ide.isFilesVisible = !ide.isFilesVisible}
                        onFileSelect={handleLocalFileTabSelect}
                        onCloseFile={closeLocalFile}
                        onCloseAllFiles={closeAllLocalFiles}
                    />
                    <CodeEditorArea
                        editorViewsRef={editorViewsRef}
                        openedFiles={openedLocalFiles}
                        activeFile={activeLocalFile}
                        showUnsavedDialog={showLocalUnsavedDialog}
                        onSaveFile={saveFile}
                        onUpdateFileContent={updateLocalFileContent}
                        onDiscardChanges={discardChanges}
                        onCancelUnsaved={() => { setShowLocalUnsavedDialog(false); }}
                    />
                </div>
            </div>
        </div>
    );
};
