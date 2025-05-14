import { useEditorEngine } from '@/components/store/editor';
import { EditorView } from '@codemirror/view';
import { SystemTheme } from '@onlook/models';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { toast } from '@onlook/ui/use-toast';
import CodeMirror, { EditorSelection } from '@uiw/react-codemirror';
import { observer } from 'mobx-react-lite';
import { nanoid } from 'nanoid';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { getBasicSetup, getExtensions, getLanguageFromFileName } from './code-mirror-config';
import { FileTab } from './file-tab';
import { FileTree } from './file-tree';

enum TabValue {
    CONSOLE = 'console',
    NETWORK = 'network',
    ELEMENTS = 'elements',
}

interface EditorFile {
    id: string;
    filename: string;
    path: string;
    content: string;
    language: string;
    isDirty: boolean;
}

interface CodeRange {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
}

export const DevTab = observer(() => {
    const editorEngine = useEditorEngine();
    const { theme } = useTheme();

    const [openedFiles, setOpenedFiles] = useState<EditorFile[]>([]);
    const [activeFile, setActiveFile] = useState<EditorFile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightRange, setHighlightRange] = useState<CodeRange | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [isFilesVisible, setIsFilesVisible] = useState(true);

    const editorContainer = useRef<HTMLDivElement | null>(null);
    const editorViewsRef = useRef<Map<string, EditorView>>(new Map());

    const getActiveEditorView = (): EditorView | undefined => {
        if (!activeFile) {
            return undefined;
        }
        return editorViewsRef.current.get(activeFile.id);
    };

    useEffect(() => {
        const checkSelectedElement = async () => {
            const selectedElements = editorEngine.elements.selected;
            if (selectedElements.length === 0) {
                return;
            }

            const element = selectedElements[0];
            setIsLoading(true);

            try {
                const filePath = await getFilePathFromOid(element?.oid || '');

                if (filePath) {
                    const file = await loadFile(filePath);

                    // Only get range information if file was successfully loaded
                    if (file) {
                        // Gets range information for the selected element
                        const range = await getElementCodeRange(element);

                        if (range) {
                            setHighlightRange(range);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading file for selected element:', error);
            } finally {
                setIsLoading(false);
            }
        };

        checkSelectedElement();
    }, [editorEngine.elements.selected]);

    async function getElementCodeRange(element: any): Promise<CodeRange | null> {
        if (!activeFile || !element.oid) {
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
        if (!activeFile || !highlightRange) {
            return;
        }

        const editorView = getActiveEditorView();
        if (!editorView) {
            return;
        }

        try {
            // Calculate positions for scrolling
            const lines = activeFile.content.split('\n');

            // Safety check - validate line numbers are within bounds
            if (
                highlightRange.startLineNumber > lines.length ||
                highlightRange.endLineNumber > lines.length ||
                highlightRange.startLineNumber < 1 ||
                highlightRange.endLineNumber < 1
            ) {
                console.warn('Highlight range out of bounds, clearing selection');
                setHighlightRange(null);
                return;
            }

            // Calculate start position
            let startPos = 0;
            for (let i = 0; i < highlightRange.startLineNumber - 1; i++) {
                startPos += (lines[i]?.length || 0) + 1; // +1 for newline
            }
            startPos += highlightRange.startColumn - 1;

            // Calculate end position
            let endPos = 0;
            for (let i = 0; i < highlightRange.endLineNumber - 1; i++) {
                endPos += (lines[i]?.length || 0) + 1; // +1 for newline
            }
            endPos += highlightRange.endColumn - 1;
            if (
                startPos >= activeFile.content.length ||
                endPos > activeFile.content.length ||
                startPos < 0 ||
                endPos < 0
            ) {
                console.warn('Highlight position out of bounds, clearing selection');
                setHighlightRange(null);
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
            setHighlightRange(null);
        }
    }, [highlightRange, activeFile]);

    async function loadFile(filePath: string): Promise<EditorFile | null> {
        try {
            setIsLoading(true);
            const content = await editorEngine.sandbox.readFile(filePath);
            const fileName = filePath.split('/').pop() || '';
            const fileLanguage = getLanguageFromFileName(fileName);

            // Check if file is already open
            const existingFile = openedFiles.find((f) => f.path === filePath);
            if (existingFile) {
                setActiveFile(existingFile);
                return existingFile;
            }

            const newFile = {
                id: nanoid(),
                filename: fileName,
                path: filePath,
                content: content || '',
                language: fileLanguage,
                isDirty: false,
            };

            setOpenedFiles([...openedFiles, newFile]);
            setActiveFile(newFile);
            setIsDirty(false);
            return newFile;
        } catch (error) {
            console.error('Error loading file:', error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }

    function handleFileSelect(file: EditorFile) {
        setHighlightRange(null);
        setActiveFile(file);
        setIsDirty(file.isDirty);
    }

    function handleJumpToElement() {
        if (!activeFile) {
            return;
        }

        console.log(`Jump to element in ${activeFile.path}`);
    }

    async function getFilePathFromOid(oid: string): Promise<string | null> {
        // Try to get the actual file path from the object ID
        try {
            const templateNode = await editorEngine.sandbox.getTemplateNode(oid);
            if (templateNode?.path) {
                return templateNode.path;
            }
        } catch (error) {
            console.error('Error getting file path from OID:', error);
        }

        return null;
    }

    // Add saving functionality
    async function saveFile() {
        if (!activeFile) {
            return;
        }

        setIsLoading(true);
        try {
            const originalContent = await editorEngine.sandbox.readFile(activeFile.path);
            editorEngine.action.run({
                type: 'write-code',
                diffs: [
                    {
                        path: activeFile.path,
                        original: originalContent || '',
                        generated: activeFile.content,
                    },
                ],
            });

            // Mark the file as no longer dirty
            const updatedFiles = openedFiles.map((file: EditorFile) =>
                file.id === activeFile.id ? { ...file, isDirty: false } : file,
            );

            setOpenedFiles(updatedFiles);
            setActiveFile({ ...activeFile, isDirty: false });
            setIsDirty(false);

            toast({
                title: 'File saved',
                description: `${activeFile.filename} has been saved successfully.`,
            });
        } catch (error) {
            console.error('Error saving file:', error);
            toast({
                title: 'Save failed',
                description: 'Could not save the file.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    const handleFileTreeSelect = async (nodes: any[]) => {
        if (nodes.length > 0 && !nodes[0].data.isDirectory) {
            await loadFile(nodes[0].data.path);
            setHighlightRange(null);
        }
    };

    function closeFile(fileId: string) {
        const fileIndex = openedFiles.findIndex((f) => f.id === fileId);
        if (fileIndex === -1) {
            return;
        }

        // Clean up the editor instance for this file
        const editorView = editorViewsRef.current.get(fileId);
        if (editorView) {
            editorView.destroy();
            editorViewsRef.current.delete(fileId);
        }

        const newOpenedFiles = [...openedFiles];
        newOpenedFiles.splice(fileIndex, 1);
        setOpenedFiles(newOpenedFiles);

        // If we're closing the active file, set a new active file
        if (activeFile?.id === fileId) {
            if (newOpenedFiles.length > 0) {
                // Tries to select the file at the same index, or the previous one
                const newIndex = Math.min(fileIndex, newOpenedFiles.length - 1);
                setActiveFile(newOpenedFiles[newIndex] ?? null);
                setIsDirty(newOpenedFiles[newIndex]?.isDirty ?? false);
            } else {
                setActiveFile(null);
                setIsDirty(false);
            }
        }

        // Clears highlight range when closing a file
        setHighlightRange(null);
    }

    function closeAllFiles() {
        // Clean up all editor instances
        editorViewsRef.current.forEach((view) => view.destroy());
        editorViewsRef.current.clear();

        setOpenedFiles([]);
        setActiveFile(null);
        setHighlightRange(null);
        setIsDirty(false);
    }

    const updateFileContent = (fileId: string, content: string) => {
        const file = openedFiles.find((f) => f.id === fileId);
        if (!file) {
            return;
        }

        // Check if content has actually changed
        const hasChanged = content !== file.content;

        const updatedFiles = openedFiles.map((file) =>
            file.id === fileId
                ? {
                    ...file,
                    content: content,
                    isDirty: hasChanged,
                }
                : file,
        );

        setOpenedFiles(updatedFiles);

        // If this is the active file, update the dirty state
        if (activeFile && activeFile.id === fileId) {
            setActiveFile({
                ...activeFile,
                content: content,
                isDirty: hasChanged,
            });
            setIsDirty(hasChanged);
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
        <div className="h-full flex flex-col w-full border-l-[0.5px] border-t-[0.5px] border-b-[0.5px] backdrop-blur shadow rounded-tl-xl">
            <div className="flex items-center justify-between h-11 pl-4 pr-2 rounded-tl-xl border-b-[0.5px]">
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

            <div className="flex flex-1 min-h-0 overflow-hidden">
                {isFilesVisible && <FileTree onFileSelect={loadFile} />}

                {/* Editor section */}
                <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                    {/* File tabs */}
                    <div className="flex items-center justify-between h-10 border-b-[0.5px] flex-shrink-0">
                        <div className="flex items-center h-full overflow-x-auto">
                            {openedFiles.map((file: EditorFile) => (
                                <FileTab
                                    key={file.id}
                                    filename={file.filename}
                                    isActive={activeFile?.id === file.id}
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
                                        onClick={() => activeFile && closeFile(activeFile.id)}
                                        disabled={!activeFile}
                                    >
                                        Close file
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => closeAllFiles()}
                                        disabled={openedFiles.length === 0}
                                    >
                                        Close all
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Code Editor Area */}
                    <div className="flex-1 relative overflow-hidden">
                        {isLoading && (
                            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin h-8 w-8 border-2 border-foreground-hover rounded-full border-t-transparent"></div>
                                    <span className="mt-2 text-sm">Loading file...</span>
                                </div>
                            </div>
                        )}
                        <div ref={editorContainer} className="h-full">
                            {openedFiles.map((file) => (
                                <div
                                    key={file.id}
                                    className="h-full"
                                    style={{
                                        display: activeFile?.id === file.id ? 'block' : 'none',
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
                                            if (highlightRange) {
                                                setHighlightRange(null);
                                            }
                                            updateFileContent(file.id, value);
                                        }}
                                        className="h-full overflow-hidden"
                                        onCreateEditor={(editor) => {
                                            editorViewsRef.current.set(file.id, editor);

                                            editor.dom.addEventListener('mousedown', () => {
                                                if (highlightRange) {
                                                    setHighlightRange(null);
                                                }
                                            });

                                            // If this file is the active file and we have a highlight range,
                                            // trigger the highlight effect again
                                            if (
                                                activeFile &&
                                                activeFile.id === file.id &&
                                                highlightRange
                                            ) {
                                                setTimeout(() => {
                                                    setHighlightRange({ ...highlightRange });
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
        </div>
    );
});
