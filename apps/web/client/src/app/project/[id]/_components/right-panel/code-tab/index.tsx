import { useEditorEngine } from '@/components/store/editor';
import type { CodeRange } from '@/components/store/editor/ide';
import { hashContent } from '@/services/sync-engine/sync-engine';
import { EditorView } from '@codemirror/view';
import { useDirectory, useFile, useFS } from '@onlook/file-system/hooks';
import { EditorSelection } from '@uiw/react-codemirror';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CodeEditorArea } from './file-content';
import { createSearchHighlight, scrollToFirstMatch } from './file-content/code-mirror-config';
import { FileTabs } from './file-tabs';
import type { BinaryEditorFile, EditorFile, TextEditorFile } from './shared/types';
import { FileTree } from './sidebar/file-tree';

// Check if file content differs from original
async function isDirty(file: EditorFile): Promise<boolean> {
    if (file.type === 'binary') {
        return false; // Binary files are never considered dirty
    }

    if (file.type === 'text') {
        const textFile = file as TextEditorFile;
        const currentHash = await hashContent(textFile.content);
        return currentHash !== textFile.originalHash;
    }

    return false;
}


export const CodeTab = () => {
    const editorEngine = useEditorEngine();
    const rootDir = `/${editorEngine.projectId}/${editorEngine.branches.activeBranch.id}`;

    const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
    const [activeEditorFile, setActiveEditorFile] = useState<EditorFile | null>(null);
    const [openedEditorFiles, setOpenedEditorFiles] = useState<EditorFile[]>([]);
    const [showLocalUnsavedDialog, setShowLocalUnsavedDialog] = useState(false);

    const { fs, isInitializing: fsInitializing, error: fsError } = useFS(rootDir);
    const {
        entries: fileEntries,
        loading: filesLoading,
    } = useDirectory(rootDir, '/');

    const {
        content: loadedContent,
    } = useFile(rootDir, selectedFilePath || '');

    const createEditorFile = async (filePath: string, content: string | Uint8Array): Promise<EditorFile> => {
        const isBinary = content instanceof Uint8Array;

        if (isBinary) {
            return {
                path: filePath,
                content: content,
                type: 'binary',
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

    // React to loadedContent changes - build local EditorFile and manage opened files
    useEffect(() => {
        console.log('loadedContent', loadedContent);
        if (!selectedFilePath || !loadedContent) return;

        const processFile = async () => {
            const newLocalFile = await createEditorFile(selectedFilePath, loadedContent);

            // Check if file is already open
            const existingFileIndex = openedEditorFiles.findIndex(f => f.path === selectedFilePath);

            if (existingFileIndex >= 0) {
                // File already open, just set as active and update content
                const existingFile = openedEditorFiles[existingFileIndex];
                if (existingFile) {
                    const updatedFile: EditorFile = existingFile.type === 'text'
                        ? {
                            path: existingFile.path,
                            type: existingFile.type,
                            content: newLocalFile.content as string,
                            originalHash: (existingFile as TextEditorFile).originalHash,
                        } as TextEditorFile
                        : {
                            path: existingFile.path,
                            type: existingFile.type,
                            content: newLocalFile.content,
                        } as BinaryEditorFile;
                    const updatedFiles = [...openedEditorFiles];
                    updatedFiles[existingFileIndex] = updatedFile;
                    setOpenedEditorFiles(updatedFiles);
                    setActiveEditorFile(updatedFile);
                }
            } else {
                // Add new file to opened files
                const updatedFiles = [...openedEditorFiles, newLocalFile];
                setOpenedEditorFiles(updatedFiles);
                setActiveEditorFile(newLocalFile);
            }
        };

        processFile();
    }, [loadedContent]);

    const handleSaveFile = async () => {
        if (!fs || !selectedFilePath || !activeEditorFile) return;
        try {
            await fs.writeFile(selectedFilePath, activeEditorFile.content || '');

            // Update originalHash to mark file as clean after successful save
            if (activeEditorFile.type === 'text') {
                const newHash = await hashContent(activeEditorFile.content);
                const updatedFile = { ...activeEditorFile, originalHash: newHash };

                // Update in opened files list
                const updatedFiles = openedEditorFiles.map(file =>
                    file.path === selectedFilePath ? updatedFile : file
                );
                setOpenedEditorFiles(updatedFiles);
                setActiveEditorFile(updatedFile);
            }
        } catch (error) {
            console.error('Failed to save file:', error);
            alert(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // OLD SHIT_____________________________________________________
    const ide = editorEngine.ide;
    const editorViewsRef = useRef<Map<string, EditorView>>(new Map());

    // Helper function to check if sandbox is connected and ready

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
                    setSelectedFilePath(filePath);

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

    const handleFileTreeSelect = (filePath: string, searchTerm?: string) => {
        setSelectedFilePath(filePath);
        if (searchTerm) {
            //    TODO: Reimplement search term handling
        }
    };

    async function getFilePathFromOid(oid: string): Promise<string | null> {
        return ide.getFilePathFromOid(oid);
    }

    const closeLocalFile = useCallback((filePath: string) => {
        const fileToClose = openedEditorFiles.find(f => f.path === filePath);
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
        // Also update selectedFile to sync with file tree
        setSelectedFilePath(file.path);
    };

    const updateLocalFileContent = (filePath: string, content: string) => {
        const updatedFiles = openedEditorFiles.map(file =>
            file.path === filePath
                ? { ...file, content }
                : file
        );
        setOpenedEditorFiles(updatedFiles);

        // Update active file if it's the one being updated
        if (activeEditorFile?.path === filePath) {
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

        const updatedFiles = openedEditorFiles.filter(f => f.path !== filePath);
        setOpenedEditorFiles(updatedFiles);

        if (activeEditorFile?.path === filePath) {
            const newActiveFile = updatedFiles.length > 0 ? updatedFiles[updatedFiles.length - 1] || null : null;
            setActiveEditorFile(newActiveFile);
        }
    };

    const discardLocalFileChanges = (filePath: string) => {
        closeFileInternal(filePath);
        setShowLocalUnsavedDialog(false);
    };

    // Cleanup editor instances when component unmounts
    useEffect(() => {
        return () => {
            editorViewsRef.current.forEach((view) => view.destroy());
            editorViewsRef.current.clear();
        };
    }, []);

    return (
        <div className="size-full flex flex-col">
            <div className="flex flex-1 min-h-0 overflow-hidden">
                <FileTree
                    onFileSelect={handleFileTreeSelect}
                    fileEntries={fileEntries}
                    isLoading={filesLoading}
                    selectedFilePath={selectedFilePath}
                />
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    <FileTabs
                        selectedFilePath={selectedFilePath}
                        openedFiles={openedEditorFiles}
                        activeFile={activeEditorFile}
                        isFilesVisible={ide.isFilesVisible}
                        onToggleFilesVisible={() => ide.isFilesVisible = !ide.isFilesVisible}
                        onFileSelect={handleLocalFileTabSelect}
                        onCloseFile={closeLocalFile}
                        onCloseAllFiles={closeAllLocalFiles}
                    />
                    <CodeEditorArea
                        editorViewsRef={editorViewsRef}
                        openedFiles={openedEditorFiles}
                        activeFile={activeEditorFile}
                        showUnsavedDialog={showLocalUnsavedDialog}
                        onSaveFile={handleSaveFile}
                        onUpdateFileContent={updateLocalFileContent}
                        onDiscardChanges={discardLocalFileChanges}
                        onCancelUnsaved={() => { setShowLocalUnsavedDialog(false); }}
                    />
                </div>
            </div>
        </div>
    );
};
