import { useEditorEngine } from '@/components/store/editor';
import type { CodeRange, EditorFile } from '@/components/store/editor/ide';
import { EditorView } from '@codemirror/view';
import { useDirectory, useFile, type FileEntry } from '@onlook/file-system/hooks';
import { toast } from '@onlook/ui/sonner';
import { getMimeType } from '@onlook/utility';
import { EditorSelection } from '@uiw/react-codemirror';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CodeEditorArea } from './file-content/code-editor-area';
import { createSearchHighlight, scrollToFirstMatch } from './file-content/code-mirror-config';
import { FileTabs } from './file-tabs';
import { FileTree } from './sidebar/file-tree';
import type { FileNode } from './types';

export const CodeTab = observer(() => {
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
    const [fileContent, setFileContent] = useState<string>('');
    const [isEditing, setIsEditing] = useState(false);

    // Use file hook for selected file
    const {
        content: loadedContent,
        loading: isLoadingContent,
        error: fileError,
    } = useFile(rootDir, selectedFile || '');

    // Update content when file loads
    useEffect(() => {
        if (typeof loadedContent === 'string') {
            setFileContent(loadedContent);
        } else if (loadedContent) {
            setFileContent('[Binary file - cannot display]');
        } else {
            setFileContent('');
        }
        setIsEditing(false);
    }, [loadedContent]);

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

    console.log('localFiles', localFiles);
    // _____________________________________________________


    // const activeSandbox = editorEngine.branches.activeSandbox;
    // const files = activeSandbox.files;
    const ide = editorEngine.ide;
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const editorViewsRef = useRef<Map<string, EditorView>>(new Map());
    const fileTabsContainerRef = useRef<HTMLDivElement>(null);
    const fileTreeRef = useRef<any>(null);

    // Helper function to check if sandbox is connected and ready
    const isSandboxReady = ide.isSandboxReady;

    // Helper function to handle sandbox not ready scenarios
    const handleSandboxNotReady = (operation: string): void => {
        const message = `Cannot ${operation}: sandbox not connected`;
        console.error(message);
    };

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
                    const file = await loadFile(filePath);

                    // Only get range information if file was successfully loaded
                    if (file) {
                        // Gets range information for the selected element
                        const range = await getElementCodeRange(element);

                        if (range) {
                            ide.setHighlightRange(range);
                        }
                    }
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
            handleSandboxNotReady('get element code range');
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

    // Subscribe to file events
    // useEffect(() => {
    //     const handleFileEvent = async (event: FileEvent) => {
    //         // Only fetch all files when files are added/removed
    //         if (event.type === 'add' || event.type === 'remove') {
    //             ide.isFilesLoading = true;
    //             try {
    //                 await ide.refreshFiles();
    //             } catch (error) {
    //                 console.error('Error loading files:', error);
    //             }
    //         }

    //         if (event.type === 'change') {
    //             if (ide.activeFile) {
    //                 if (event.paths.includes(ide.activeFile.path)) {
    //                     await loadNewContent(ide.activeFile.path);
    //                 }
    //             }
    //         }
    //     };

    //     // TODO: use fs hook
    //     // const unsubscribe = activeSandbox.fileEventBus.subscribe('*', handleFileEvent);

    //     return () => {
    //         // unsubscribe();
    //     };
    // }, [activeSandbox, ide.activeFile, editorEngine.branches.activeBranch.id]);

    // Load files when active sandbox changes
    // useEffect(() => {
    //     const loadFilesForActiveSandbox = async () => {
    //         if (!isSandboxReady) {
    //             return;
    //         }

    //         // Preserve the currently active file path and highlight range before clearing
    //         const activeFilePath = ide.activeFile?.path;
    //         const savedHighlightRange = ide.highlightRange;

    //         // Clear existing files and editors when switching sandboxes
    //         ide.clear();
    //         editorViewsRef.current.forEach((view) => view.destroy());
    //         editorViewsRef.current.clear();

    //         // Reset file tree selection state
    //         if (fileTreeRef.current?.deselectAll) {
    //             fileTreeRef.current.deselectAll();
    //         }

    //         ide.isFilesLoading = true;
    //         try {
    //             await ide.refreshFiles();

    //             // Reopen the previously active file if it exists in the new branch
    //             if (activeFilePath) {
    //                 const fileExists = files.some(file => file === activeFilePath);
    //                 if (fileExists) {
    //                     await loadFile(activeFilePath);
    //                     // Restore the highlight range if it was preserved
    //                     if (savedHighlightRange) {
    //                         ide.setHighlightRange(savedHighlightRange);
    //                     }
    //                     // Update the file tree selection
    //                     if (fileTreeRef.current?.selectFile) {
    //                         fileTreeRef.current.selectFile(activeFilePath);
    //                     }
    //                 }
    //             }
    //         } catch (error) {
    //             console.error('Error loading files for active sandbox:', error);
    //         }
    //     };

    //     loadFilesForActiveSandbox();
    // }, [activeSandbox]);

    const loadFile = useCallback(async (filePath: string, searchTerm?: string): Promise<EditorFile | null> => {
        if (!isSandboxReady) {
            handleSandboxNotReady('load file');
            return null;
        }

        try {
            return await ide.openFile(filePath, searchTerm, false);
        } catch (error) {
            console.error('Error loading file:', error);
            return null;
        }
    }, [isSandboxReady]);

    function handleFileSelect(file: EditorFile) {
        ide.setHighlightRange(null);
        ide.activeFile = file;
    }

    async function getFilePathFromOid(oid: string): Promise<string | null> {
        if (!isSandboxReady) {
            handleSandboxNotReady('get file path from OID');
            return null;
        }

        return ide.getFilePathFromOid(oid);
    }

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

        if (!isSandboxReady) {
            handleSandboxNotReady('save file');
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

    const handleFileTreeSelect = async (nodes: any[]) => {
        if (nodes.length > 0 && !nodes[0].data.isDirectory) {
            await loadFile(nodes[0].data.path);
            ide.setHighlightRange(null);
        }
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

    const getFileUrl = (file: EditorFile) => {
        const mime = getMimeType(file.filename.toLowerCase());
        return `data:${mime};base64,${file.content}`;
    };

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
                    ref={fileTreeRef}
                    onFileSelect={loadFile}
                    fileNodes={localFiles}
                    isLoading={localDirLoading}
                    selectedFilePath={selectedFile}
                />
                {/* Editor section */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <FileTabs
                        ref={fileTabsContainerRef}
                        openedFiles={ide.openedFiles}
                        activeFile={ide.activeFile}
                        isFilesVisible={ide.isFilesVisible}
                        onToggleFilesVisible={() => ide.isFilesVisible = !ide.isFilesVisible}
                        onFileSelect={handleFileSelect}
                        onCloseFile={closeFile}
                        onCloseAllFiles={closeAllFiles}
                    />

                    {/* Code Editor Area */}
                    <CodeEditorArea
                        editorViewsRef={editorViewsRef}
                        onSaveFile={saveFile}
                        onUpdateFileContent={updateFileContent}
                        onDiscardChanges={discardChanges}
                        onGetFileUrl={getFileUrl}
                    />
                </div>
            </div>
        </div>
    );
});
