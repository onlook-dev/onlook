import { useEditorEngine } from '@/components/store/editor';
import type { CodeRange, EditorFile } from '@/components/store/editor/dev';
import type { FileEvent } from '@/components/store/editor/sandbox/file-event-bus';
import { EditorView } from '@codemirror/view';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@onlook/ui/tooltip';
import { getMimeType } from '@onlook/utility';
import CodeMirror, { EditorSelection } from '@uiw/react-codemirror';
import { observer } from 'mobx-react-lite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getBasicSetup, getExtensions, createSearchHighlight, clearSearchHighlight, scrollToFirstMatch } from './code-mirror-config';
import { FileModal } from './file-modal';
import { FileTab } from './file-tab';
import { FileTree } from './file-tree';
import { FolderModal } from './folder-modal';

export const DevTab = observer(() => {
    const editorEngine = useEditorEngine();
    const ide = editorEngine.ide;
    const [isFilesVisible, setIsFilesVisible] = useState(true);
    const [fileModalOpen, setFileModalOpen] = useState(false);
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
    const [pendingCloseAll, setPendingCloseAll] = useState(false);
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const editorViewsRef = useRef<Map<string, EditorView>>(new Map());
    const fileTabsContainerRef = useRef<HTMLDivElement>(null);

    // Helper function to check if sandbox is connected and ready
    const isSandboxReady = useCallback((): boolean => {
        return !!(editorEngine.sandbox.session.provider && !editorEngine.sandbox.session.isConnecting);
    }, [editorEngine.sandbox.session.provider, editorEngine.sandbox.session.isConnecting]);

    // Helper function to handle sandbox not ready scenarios
    const handleSandboxNotReady = useCallback((operation: string): void => {
        const message = `Cannot ${operation}: sandbox not connected`;
        console.error(message);
    }, []);

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

        if (!isSandboxReady()) {
            handleSandboxNotReady('get element code range');
            return null;
        }

        try {
            const templateNode = await editorEngine.sandbox.getTemplateNode(element.oid);
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
                    EditorView.scrollIntoView(selection.main, {
                        y: 'start'
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
    useEffect(() => {
        const handleFileEvent = async (event: FileEvent) => {
            // Only fetch all files when files are added/removed
            if (event.type === 'add' || event.type === 'remove') {
                ide.isFilesLoading = true;
                try {
                    await ide.refreshFiles();
                } catch (error) {
                    console.error('Error loading files:', error);
                }
            }

            if (event.type === 'change') {
                if (ide.activeFile) {
                    if (event.paths.includes(ide.activeFile.path)) {
                        await loadNewContent(ide.activeFile.path);
                    }
                }
            }
        };

        const unsubscribe = editorEngine.sandbox.fileEventBus.subscribe('*', handleFileEvent);

        return () => {
            unsubscribe();
        };
    }, [editorEngine.sandbox, ide.activeFile]);

    // Load files when sandbox becomes connected
    useEffect(() => {
        const loadInitialFiles = async () => {
            // Only load files if sandbox is connected and not connecting
            if (!isSandboxReady()) {
                return;
            }

            ide.isFilesLoading = true;
            try {
                await ide.refreshFiles();
            } catch (error) {
                console.error('Error loading initial files:', error);
            }
        };

        loadInitialFiles();
    }, [editorEngine.sandbox.session.provider, editorEngine.sandbox.session.isConnecting]);

    // Clear files and opened files when sandbox disconnects
    useEffect(() => {
        if (!isSandboxReady()) {
            ide.clear();
            // Clean up all editor instances
            editorViewsRef.current.forEach((view) => view.destroy());
            editorViewsRef.current.clear();
        }
    }, [editorEngine.sandbox.session.provider, editorEngine.sandbox.session.isConnecting]);

    const handleRefreshFiles = useCallback(async () => {
        if (!isSandboxReady()) {
            handleSandboxNotReady('refresh files');
            return;
        }

        ide.isFilesLoading = true;
        try {
            await editorEngine.sandbox.index(true);
            await ide.refreshFiles();
        } catch (error) {
            console.error('Error refreshing files:', error);
        }
    }, [isSandboxReady]);

    async function loadNewContent(filePath: string) {
        if (!isSandboxReady()) {
            handleSandboxNotReady('load new content');
            return;
        }

        try {
            await ide.loadNewContent(filePath);
        } catch (error) {
            console.error('Error loading new content:', error);
        }
    }

    const loadFile = useCallback(async (filePath: string, searchTerm?: string): Promise<EditorFile | null> => {
        if (!isSandboxReady()) {
            handleSandboxNotReady('load file');
            return null;
        }

        try {
            return await ide.openFile(filePath, searchTerm);
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
        if (!isSandboxReady()) {
            handleSandboxNotReady('get file path from OID');
            return null;
        }

        return ide.getFilePathFromOid(oid);
    }

    const closeFile = useCallback((fileId: string) => {
        if (ide.openedFiles.find(f => f.id === fileId)?.isDirty) {
            setShowUnsavedDialog(true);
            return;
        }

        const editorView = editorViewsRef.current.get(fileId);
        if (editorView) {
            editorView.destroy();
            editorViewsRef.current.delete(fileId);
        }
        ide.closeFile(fileId);
    }, [ide, setShowUnsavedDialog]);

    const saveFile = useCallback(async () => {
        if (!ide.activeFile) {
            return;
        }

        if (!isSandboxReady()) {
            handleSandboxNotReady('save file');
            return;
        }

        if (pendingCloseAll) {
            const file = ide.openedFiles.find((f) => f.id === ide.activeFile?.id);
            if (file) {
                await ide.saveActiveFile();
                closeFile(file.id);
            }

            const remainingDirty = ide.openedFiles.filter((f) => f.isDirty);
            if (remainingDirty.length !== 0) {
                setShowUnsavedDialog(true);
                return;
            }

            ide.closeAllFiles();
            setPendingCloseAll(false);
            setShowUnsavedDialog(false);

            return;
        }

        await ide.saveActiveFile();

        if (showUnsavedDialog) {
            setShowUnsavedDialog(false);
            closeFile(ide.activeFile.id);
        }

        toast('File saved!');
    }, [ide, isSandboxReady, handleSandboxNotReady, pendingCloseAll, showUnsavedDialog, setShowUnsavedDialog, setPendingCloseAll, closeFile]);

    const handleFileTreeSelect = async (nodes: any[]) => {
        if (nodes.length > 0 && !nodes[0].data.isDirectory) {
            await loadFile(nodes[0].data.path);
            ide.setHighlightRange(null);
        }
    };

    function closeAllFiles() {
        const dirtyFiles = ide.openedFiles.filter((file) => file.isDirty);
        if (dirtyFiles.length > 0) {
            setShowUnsavedDialog(true);
            setPendingCloseAll(true);
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
        if (pendingCloseAll) {
            const file = ide.openedFiles.find((e) => e.id === fileId);
            if (file) {
                await ide.discardFileChanges(file.id);
                closeFile(fileId);
                setShowUnsavedDialog(true);
                const isDirty = ide.openedFiles.filter((val) => val.isDirty);
                if (isDirty.length === 0) {
                    ide.closeAllFiles();
                    setPendingCloseAll(false);
                    setShowUnsavedDialog(false);
                }
                return;
            }

            setPendingCloseAll(false);
            return;
        }

        if (!ide.activeFile) {
            return;
        }

        await ide.discardFileChanges(fileId);
        closeFile(fileId);
        setShowUnsavedDialog(false);
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

    // Add shortcut
    const saveFileRef = useRef(saveFile);
    useEffect(() => {
        saveFileRef.current = saveFile;
    }, [saveFile]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                void saveFileRef.current();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
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

            {/* Show connection status when sandbox is not ready */}
            {!isSandboxReady() && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="animate-spin h-8 w-8 border-2 border-foreground-hover rounded-full border-t-transparent"></div>
                        <span className="text-sm text-muted-foreground">
                            {editorEngine.sandbox.session.isConnecting
                                ? 'Connecting to sandbox...'
                                : 'Waiting for sandbox connection...'}
                        </span>
                    </div>
                </div>
            )}

            {/* Main content - only show when sandbox is connected */}
            {isSandboxReady() && (
                <div className="flex flex-1 min-h-0 overflow-hidden">
                    {isFilesVisible && (
                        <FileTree
                            onFileSelect={loadFile}
                            files={ide.files}
                            isLoading={ide.isFilesLoading}
                            onRefresh={handleRefreshFiles}
                            activeFilePath={ide.activeFile?.path || null}
                        />
                    )}

                    {/* Editor section */}
                    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                        {/* File tabs */}
                        <div className="flex items-center justify-between h-11 pl-0 border-b-[0.5px] flex-shrink-0 relative">
                            <div className="absolute left-0 top-0 bottom-0 z-20 border-r-[0.5px] h-full flex items-center p-1 bg-background">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setIsFilesVisible(!isFilesVisible)}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            {isFilesVisible ? <Icons.SidebarLeftCollapse /> : <Icons.SidebarLeftExpand />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="mt-1" hideArrow>
                                        {isFilesVisible ? 'Collapse sidebar' : 'Expand sidebar'}
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center h-full border-l-[0.5px] p-1 bg-background w-11">
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground hover:bg-foreground/5 p-1 rounded h-full w-full flex items-center justify-center px-2.5">
                                        <Icons.DotsHorizontal className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="-mt-1">
                                        <DropdownMenuItem
                                            onClick={() => ide.activeFile && closeFile(ide.activeFile.id)}
                                            disabled={!ide.activeFile}
                                            className="cursor-pointer"
                                        >
                                            Close file
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => closeAllFiles()}
                                            disabled={ide.openedFiles.length === 0}
                                            className="cursor-pointer"
                                        >
                                            Close all
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <div className="flex items-center h-full overflow-x-auto w-full ml-11 mr-10.5" ref={fileTabsContainerRef}>
                                {ide.openedFiles.map((file) => (
                                    <FileTab
                                        key={file.id}
                                        filename={file.filename}
                                        isActive={ide.activeFile?.id === file.id}
                                        isDirty={file.isDirty}
                                        onClick={() => handleFileSelect(file)}
                                        onClose={() => closeFile(file.id)}
                                        data-active={ide.activeFile?.id === file.id}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Code Editor Area */}
                        <div className="flex-1 relative overflow-hidden">
                            {ide.isLoading && (
                                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                                    <div className="flex flex-col items-center">
                                        <div className="animate-spin h-8 w-8 border-2 border-foreground-hover rounded-full border-t-transparent"></div>
                                        <span className="mt-2 text-sm">Loading file...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={editorContainer} className="h-full">
                                {/* Empty state when no file is selected */}
                                {ide.openedFiles.length === 0 || !ide.activeFile ? (
                                    <div className="absolute inset-0 flex items-center justify-center z-10">
                                        <div className="text-center text-muted-foreground text-base">
                                            Open a file or select an element on the page.
                                        </div>
                                    </div>
                                ) : (
                                    ide.openedFiles.map((file) => (
                                        <div
                                            key={file.id}
                                            className="h-full"
                                            style={{
                                                display: ide.activeFile?.id === file.id ? 'block' : 'none',
                                            }}
                                        >
                                            {file.isBinary ? (
                                                <img
                                                    src={getFileUrl(file)}
                                                    alt={file.filename}
                                                    className="w-full h-full object-contain p-5"
                                                />
                                            ) : (
                                                <CodeMirror
                                                    key={file.id}
                                                    value={file.content}
                                                    height="100%"
                                                    theme="dark"
                                                    extensions={[
                                                        ...getBasicSetup(saveFile),
                                                        ...getExtensions(file.language),
                                                    ]}
                                                    onChange={(value) => {
                                                        if (ide.highlightRange) {
                                                            ide.setHighlightRange(null);
                                                        }
                                                        updateFileContent(file.id, value);
                                                    }}
                                                    className="h-full overflow-hidden"
                                                    onCreateEditor={(editor) => {
                                                        editorViewsRef.current.set(file.id, editor);

                                                        editor.dom.addEventListener('mousedown', () => {
                                                            if (ide.highlightRange) {
                                                                ide.setHighlightRange(null);
                                                            }
                                                        });

                                                        // If this file is the active file and we have a highlight range,
                                                        // trigger the highlight effect again
                                                        if (
                                                            ide.activeFile &&
                                                            ide.activeFile.id === file.id &&
                                                            ide.highlightRange
                                                        ) {
                                                            setTimeout(() => {
                                                                if (ide.highlightRange) {
                                                                    ide.setHighlightRange(ide.highlightRange);
                                                                }
                                                            }, 300);
                                                        }
                                                    }}
                                                />
                                            )}
                                            {ide.activeFile?.isDirty && showUnsavedDialog && (
                                                <div className="absolute top-4 left-1/2 z-50 -translate-x-1/2 bg-white dark:bg-zinc-800 border dark:border-zinc-700 shadow-lg rounded-lg p-4 w-[320px]">
                                                    <div className="text-sm text-gray-800 dark:text-gray-100 mb-4">
                                                        You have unsaved changes. Are you sure you want
                                                        to close this file?
                                                    </div>
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            onClick={async () => {
                                                                await discardChanges(file.id);
                                                            }}
                                                            variant="ghost"
                                                            className="text-red hover:text-red"
                                                        >
                                                            Discard
                                                        </Button>
                                                        <Button
                                                            onClick={async () => {
                                                                await saveFile();
                                                            }}
                                                            variant="ghost"
                                                            className="text-sm text-blue-500 hover:text-blue-500"
                                                        >
                                                            Save
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setShowUnsavedDialog(false);
                                                                setPendingCloseAll(false);
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {fileModalOpen && (
                <FileModal
                    open={fileModalOpen}
                    onOpenChange={setFileModalOpen}
                    basePath=""
                    files={ide.files}
                />
            )}

            {folderModalOpen && (
                <FolderModal
                    open={folderModalOpen}
                    onOpenChange={setFolderModalOpen}
                    basePath=""
                    files={ide.files}
                />
            )}
        </div>
    );
});
