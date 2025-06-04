import { useEditorEngine } from '@/components/store/editor';
import type { FileEvent } from '@/components/store/editor/sandbox/file-event-bus';
import { EditorView } from '@codemirror/view';
import { SystemTheme } from '@onlook/models';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/sonner';
import CodeMirror, { EditorSelection } from '@uiw/react-codemirror';
import { observer } from 'mobx-react-lite';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { getBasicSetup, getExtensions } from './code-mirror-config';
import { FileTab } from './file-tab';
import { FileTree } from './file-tree';
import type { EditorFile, CodeRange } from '@/components/store/editor/dev';

enum TabValue {
    CONSOLE = 'console',
    NETWORK = 'network',
    ELEMENTS = 'elements',
}

export const DevTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { theme } = useTheme();
    const dev = editorEngine.dev;
    const [isFilesVisible, setIsFilesVisible] = useState(true);
    const isDirty = dev.activeFile?.isDirty ?? false;
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const editorViewsRef = useRef<Map<string, EditorView>>(new Map());

    // Helper function to check if sandbox is connected and ready
    const isSandboxReady = (): boolean => {
        return !!(editorEngine.sandbox.session.session && !editorEngine.sandbox.session.isConnecting);
    };

    // Helper function to handle sandbox not ready scenarios
    const handleSandboxNotReady = (operation: string): void => {
        const message = `Cannot ${operation}: sandbox not connected`;
        console.error(message);
    };

    const getActiveEditorView = (): EditorView | undefined => {
        if (!dev.activeFile) {
            return undefined;
        }
        return editorViewsRef.current.get(dev.activeFile.id);
    };

    useEffect(() => {
        const checkSelectedElement = async () => {
            const selectedElements = editorEngine.elements.selected;
            if (selectedElements.length === 0) {
                return;
            }

            const element = selectedElements[0];
            dev.isLoading = true;

            try {
                const filePath = await getFilePathFromOid(element?.oid || '');

                if (filePath) {
                    const file = await loadFile(filePath);

                    // Only get range information if file was successfully loaded
                    if (file) {
                        // Gets range information for the selected element
                        const range = await getElementCodeRange(element);

                        if (range) {
                            dev.setHighlightRange(range);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading file for selected element:', error);
            } finally {
                dev.isLoading = false;
            }
        };

        checkSelectedElement();
    }, [editorEngine.elements.selected]);

    async function getElementCodeRange(element: any): Promise<CodeRange | null> {
        if (!dev.activeFile || !element.oid) {
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
        if (!dev.activeFile || !dev.highlightRange) {
            return;
        }

        const editorView = getActiveEditorView();
        if (!editorView) {
            return;
        }

        try {
            // Calculate positions for scrolling
            const lines = dev.activeFile!.content.split('\n');

            // Safety check - validate line numbers are within bounds
            if (
                dev.highlightRange!.startLineNumber > lines.length ||
                dev.highlightRange!.endLineNumber > lines.length ||
                dev.highlightRange!.startLineNumber < 1 ||
                dev.highlightRange!.endLineNumber < 1
            ) {
                console.warn('Highlight range out of bounds, clearing selection');
                dev.setHighlightRange(null);
                return;
            }

            // Calculate start position
            let startPos = 0;
            for (let i = 0; i < dev.highlightRange!.startLineNumber - 1; i++) {
                startPos += (lines[i]?.length || 0) + 1; // +1 for newline
            }
            startPos += dev.highlightRange!.startColumn;

            // Calculate end position
            let endPos = 0;
            for (let i = 0; i < dev.highlightRange!.endLineNumber - 1; i++) {
                endPos += (lines[i]?.length || 0) + 1; // +1 for newline
            }
            endPos += dev.highlightRange!.endColumn;
            if (
                startPos >= dev.activeFile!.content.length ||
                endPos > dev.activeFile!.content.length ||
                startPos < 0 ||
                endPos < 0
            ) {
                console.warn('Highlight position out of bounds, clearing selection');
                dev.setHighlightRange(null);
                return;
            }

            // Creates a selection at the highlight position
            editorView.dispatch({
                selection: EditorSelection.create([EditorSelection.range(startPos, endPos)]),
            });

            // Scrolls to the selection
            editorView.dispatch({
                effects: EditorView.scrollIntoView(editorView.state.selection.main, {
                    y: 'center',
                }),
            });
        } catch (error) {
            console.error('Error applying highlight:', error);
            dev.setHighlightRange(null);
        }
    }, [dev.highlightRange, dev.activeFile]);

    // Subscribe to file events
    useEffect(() => {
        const handleFileEvent = async (event: FileEvent) => {
            // Only fetch all files when files are added/removed
            if (event.type === 'add' || event.type === 'remove') {
                dev.isFilesLoading = true;
                try {
                    await dev.refreshFiles();
                } catch (error) {
                    console.error('Error loading files:', error);
                }
            }

            if (event.type === 'change') {
                if (dev.activeFile) {
                    if (event.paths.includes(dev.activeFile.path)) {
                        await loadNewContent(dev.activeFile.path);
                    }
                }
            }
        };
        // Subscribe to all file events
        const unsubscribe = editorEngine.sandbox.fileEventBus.subscribe('*', handleFileEvent);

        return () => {
            unsubscribe();
        };
    }, [editorEngine.sandbox, dev.activeFile]);

    // Load files when sandbox becomes connected
    useEffect(() => {
        const loadInitialFiles = async () => {
            // Only load files if sandbox is connected and not connecting
            if (!isSandboxReady()) {
                return;
            }

            dev.isFilesLoading = true;
            try {
                await dev.refreshFiles();
            } catch (error) {
                console.error('Error loading initial files:', error);
            }
        };

        loadInitialFiles();
    }, [editorEngine.sandbox.session.session, editorEngine.sandbox.session.isConnecting]);

    // Clear files and opened files when sandbox disconnects
    useEffect(() => {
        if (!isSandboxReady()) {
            dev.clear();
            // Clean up all editor instances
            editorViewsRef.current.forEach((view) => view.destroy());
            editorViewsRef.current.clear();
        }
    }, [editorEngine.sandbox.session.session, editorEngine.sandbox.session.isConnecting]);

    const handleRefreshFiles = async () => {
        if (!isSandboxReady()) {
            handleSandboxNotReady('refresh files');
            return;
        }

        dev.isFilesLoading = true;
        try {
            await editorEngine.sandbox.index();
            await dev.refreshFiles();
        } catch (error) {
            console.error('Error refreshing files:', error);
        }
    };

    async function loadNewContent(filePath: string) {
        if (!isSandboxReady()) {
            handleSandboxNotReady('load new content');
            return;
        }

        try {
            await dev.loadNewContent(filePath);
        } catch (error) {
            console.error('Error loading new content:', error);
        }
    }

    async function loadFile(filePath: string): Promise<EditorFile | null> {
        if (!isSandboxReady()) {
            handleSandboxNotReady('load file');
            return null;
        }

        try {
            return await dev.openFile(filePath);
        } catch (error) {
            console.error('Error loading file:', error);
            return null;
        }
    }

    function handleFileSelect(file: EditorFile) {
        dev.setHighlightRange(null);
        dev.activeFile = file;
    }

    function handleJumpToElement() {
        if (!dev.activeFile) {
            return;
        }

        console.log(`Jump to element in ${dev.activeFile.path}`);
    }

    async function getFilePathFromOid(oid: string): Promise<string | null> {
        if (!isSandboxReady()) {
            handleSandboxNotReady('get file path from OID');
            return null;
        }

        return dev.getFilePathFromOid(oid);
    }

    // Add saving functionality
    async function saveFile() {
        if (!dev.activeFile) {
            return;
        }

        if (!isSandboxReady()) {
            handleSandboxNotReady('save file');
            return;
        }

        await dev.saveActiveFile();
        toast('File saved!');
    }

    const handleFileTreeSelect = async (nodes: any[]) => {
        if (nodes.length > 0 && !nodes[0].data.isDirectory) {
            await loadFile(nodes[0].data.path);
            dev.setHighlightRange(null);
        }
    };

    function closeFile(fileId: string) {
        const editorView = editorViewsRef.current.get(fileId);
        if (editorView) {
            editorView.destroy();
            editorViewsRef.current.delete(fileId);
        }
        dev.closeFile(fileId);
    }

    function closeAllFiles() {
        editorViewsRef.current.forEach((view) => view.destroy());
        editorViewsRef.current.clear();
        dev.closeAllFiles();
    }

    const updateFileContent = (fileId: string, content: string) => {
        dev.updateFileContent(fileId, content);
    };

    // Cleanup editor instances when component unmounts
    useEffect(() => {
        return () => {
            editorViewsRef.current.forEach((view) => view.destroy());
            editorViewsRef.current.clear();
        };
    }, []);

    return (
        <div className="h-full flex flex-col w-full">
            <div className="flex items-center justify-between h-11 pl-4 pr-2 border-b-[0.5px]">
                <div className="flex items-center space-x-5 h-full">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center text-foreground text-sm hover:text-foreground-hover h-full">
                            <Icons.Sparkles className="mr-1.5 h-4 w-4" />
                            <span className="mr-1">Code actions</span>
                            <Icons.ChevronDown className="h-3 w-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="-mt-1">
                            <DropdownMenuItem onClick={handleJumpToElement}>
                                <Icons.Check className="mr-2 h-4 w-4" />
                                Jump to code from canvas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={saveFile} disabled={!isDirty}>
                                <Icons.File className="mr-2 h-4 w-4" />
                                Save changes
                                <span className="ml-auto text-xs text-muted-foreground">
                                    {navigator.platform.includes('Mac') ? '⌘S' : 'Ctrl+S'}
                                </span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <button
                        className="flex items-center text-foreground text-sm hover:text-foreground-hover h-full"
                        onClick={() => setIsFilesVisible(!isFilesVisible)}
                    >
                        <Icons.Directory className="mr-1.5 h-4 w-4" />
                        {isFilesVisible ? (
                            <span className="mr-1">Hide files tab</span>
                        ) : (
                            <span className="mr-1">Show files tab</span>
                        )}
                        {isFilesVisible ? (
                            <Icons.ChevronDown className="h-3 w-3" />
                        ) : (
                            <Icons.ChevronRight className="h-3 w-3" />
                        )}
                    </button>
                </div>
            </div>

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
                            files={dev.files}
                            isLoading={dev.isFilesLoading}
                            onRefresh={handleRefreshFiles}
                        />
                    )}

                    {/* Editor section */}
                    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                        {/* File tabs */}
                        <div className="flex items-center justify-between h-10 border-b-[0.5px] flex-shrink-0">
                            <div className="flex items-center h-full overflow-x-auto">
                                {dev.openedFiles.map((file: EditorFile) => (
                                    <FileTab
                                        key={file.id}
                                        filename={file.filename}
                                        isActive={dev.activeFile?.id === file.id}
                                        isDirty={file.isDirty}
                                        onClick={() => handleFileSelect(file)}
                                        onClose={() => closeFile(file.id)}
                                    />
                                ))}
                            </div>

                            <div className="border-l-[0.5px] h-full flex items-center p-1">
                                <DropdownMenu>
                                    <DropdownMenuTrigger className="text-foreground hover:text-foreground-hover hover:bg-foreground/5 p-1 rounded h-full w-full flex items-center justify-center px-3">
                                        <Icons.DotsHorizontal className="h-4 w-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="-mt-1">
                                        <DropdownMenuItem
                                            onClick={() => dev.activeFile && closeFile(dev.activeFile.id)}
                                            disabled={!dev.activeFile}
                                        >
                                            Close file
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => closeAllFiles()}
                                            disabled={dev.openedFiles.length === 0}
                                        >
                                            Close all
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Code Editor Area */}
                        <div className="flex-1 relative overflow-hidden">
                            {dev.isLoading && (
                                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                                    <div className="flex flex-col items-center">
                                        <div className="animate-spin h-8 w-8 border-2 border-foreground-hover rounded-full border-t-transparent"></div>
                                        <span className="mt-2 text-sm">Loading file...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={editorContainer} className="h-full">
                                {dev.openedFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="h-full"
                                        style={{
                                            display: dev.activeFile?.id === file.id ? 'block' : 'none',
                                        }}
                                    >
                                        <CodeMirror
                                            key={file.id}
                                            value={file.content}
                                            height="100%"
                                            theme={theme === SystemTheme.DARK ? 'dark' : 'light'}
                                            extensions={[
                                                ...getBasicSetup(theme === SystemTheme.DARK, saveFile),
                                                ...getExtensions(file.language),
                                            ]}
                                            onChange={(value) => {
                                                if (dev.highlightRange) {
                                                    dev.setHighlightRange(null);
                                                }
                                                updateFileContent(file.id, value);
                                            }}
                                            className="h-full overflow-hidden"
                                            onCreateEditor={(editor) => {
                                                editorViewsRef.current.set(file.id, editor);

                                                editor.dom.addEventListener('mousedown', () => {
                                                    if (dev.highlightRange) {
                                                        dev.setHighlightRange(null);
                                                    }
                                                });

                                                // If this file is the active file and we have a highlight range,
                                                // trigger the highlight effect again
                                                if (
                                                    dev.activeFile &&
                                                    dev.activeFile.id === file.id &&
                                                    dev.highlightRange
                                                ) {
                                                    setTimeout(() => {
                                                        dev.setHighlightRange({ ...dev.highlightRange! });
                                                    }, 300);
                                                }
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
