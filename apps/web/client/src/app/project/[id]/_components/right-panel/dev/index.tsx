// import type { FileNode } from '@/lib/editor/engine/files';
// import { MainChannels, Theme } from '@onlook/models/constants';
import { Button } from '@onlook/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { toast } from '@onlook/ui/use-toast';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Tree, type TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import { FileTab } from './file-tab';
import {FileTreeNode} from './file-tree-node';
import {FileTreeRow} from './file-tree-row';

import { getBasicSetup, getExtensions, getLanguageFromFileName } from './code-mirror-config';

import { EditorSelection } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { nanoid } from 'nanoid';
import { useTheme } from '@/app/_components/theme';
import { useEditorEngine } from '@/components/store';
import { EditorTabValue } from '@onlook/models/editor';


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
    const { ref: filesContainerRef, width: filesWidth } = useResizeObserver();

    const [openedFiles, setOpenedFiles] = useState<EditorFile[]>([]);
    const [activeFile, setActiveFile] = useState<EditorFile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightRange, setHighlightRange] = useState<CodeRange | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
    const [isFilesVisible, setIsFilesVisible] = useState(true);

    const editorContainer = useRef<HTMLDivElement | null>(null);
    const editorViewsRef = useRef<Map<string, EditorView>>(new Map());
    const treeRef = useRef<TreeApi<FileNode>>();
    const inputRef = useRef<HTMLInputElement>(null);

    const getActiveEditorView = (): EditorView | undefined => {
        if (!activeFile) {
            return undefined;
        }
        return editorViewsRef.current.get(activeFile.id);
    };

    // Scan project files when the component is mounted
    // useEffect(() => {
    //     loadProjectFiles();
    // }, []);

    // Load files from the project
    async function loadProjectFiles() {
        try {
            await editorEngine.files.scanFiles();
        } catch (error) {
            console.error('Error loading project files:', error);
        }
    }

    // useEffect(() => {
    //     const handleOpenCodeInOnlook = async (data: any) => {
    //         if (data?.filePath) {
    //             editorEngine.editPanelTab = EditorTabValue.DEV;

    //             const file = await loadFile(data.filePath);

    //             // Only set highlight range if file was successfully loaded
    //             if (file) {
    //                 setTimeout(() => {
    //                     if (data.startLine) {
    //                         setHighlightRange({
    //                             startLineNumber: data.startLine,
    //                             startColumn: data.startColumn || 1,
    //                             endLineNumber: data.endLine || data.startLine,
    //                             endColumn: data.endColumn || 80,
    //                         });
    //                     } else if (data.line) {
    //                         setHighlightRange({
    //                             startLineNumber: data.line,
    //                             startColumn: 1,
    //                             endLineNumber: data.line,
    //                             endColumn: 80,
    //                         });
    //                     }
    //                 }, 300);
    //             }
    //         }
    //     };

    //     // Subscribe to the event using the standard IPC API
    //     window.api.on(MainChannels.VIEW_CODE_IN_ONLOOK, handleOpenCodeInOnlook);

    //     // Cleanup
    //     return () => {
    //         window.api.removeListener(MainChannels.VIEW_CODE_IN_ONLOOK, handleOpenCodeInOnlook);
    //     };
    // }, [editorEngine]);

    // useEffect(() => {
    //     const checkSelectedElement = async () => {
    //         const selectedElements = editorEngine.elements.selected;
    //         if (selectedElements.length === 0) {
    //             return;
    //         }

    //         const element = selectedElements[0];
    //         setIsLoading(true);

    //         try {
    //             const filePath = await getFilePathFromOid(element?.oid || '');

    //             if (filePath) {
    //                 const file = await loadFile(filePath);

    //                 // Only get range information if file was successfully loaded
    //                 if (file) {
    //                     // Gets range information for the selected element
    //                     const range = await getElementCodeRange(element);

    //                     if (range) {
    //                         setHighlightRange(range);
    //                     }
    //                 }
    //             }
    //         } catch (error) {
    //             console.error('Error loading file for selected element:', error);
    //         } finally {
    //             setIsLoading(false);
    //         }
    //     };

    //     checkSelectedElement();
    // }, [editorEngine.elements.selected]);

    async function getElementCodeRange(element: any): Promise<CodeRange | null> {
        if (!activeFile || !element.oid) {
            return null;
        }

        try {
            const templateNode = await editorEngine.ast.getTemplateNodeById(element.oid);
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

    // Update highlighting when highlightRange changes
    // useEffect(() => {
    //     if (!activeFile || !highlightRange) {
    //         return;
    //     }

    //     const editorView = getActiveEditorView();
    //     if (!editorView) {
    //         return;
    //     }

    //     try {
    //         // Calculate positions for scrolling
    //         const lines = activeFile.content.split('\n');

    //         // Safety check - validate line numbers are within bounds
    //         if (
    //             highlightRange.startLineNumber > lines.length ||
    //             highlightRange.endLineNumber > lines.length ||
    //             highlightRange.startLineNumber < 1 ||
    //             highlightRange.endLineNumber < 1
    //         ) {
    //             console.warn('Highlight range out of bounds, clearing selection');
    //             setHighlightRange(null);
    //             return;
    //         }

    //         // Calculate start position
    //         let startPos = 0;
    //         for (let i = 0; i < highlightRange.startLineNumber - 1; i++) {
    //             startPos += (lines[i]?.length || 0) + 1; // +1 for newline
    //         }
    //         startPos += highlightRange.startColumn - 1;

    //         // Calculate end position
    //         let endPos = 0;
    //         for (let i = 0; i < highlightRange.endLineNumber - 1; i++) {
    //             endPos += (lines[i]?.length || 0) + 1; // +1 for newline
    //         }
    //         endPos += highlightRange.endColumn - 1;
    //         if (
    //             startPos >= activeFile.content.length ||
    //             endPos > activeFile.content.length ||
    //             startPos < 0 ||
    //             endPos < 0
    //         ) {
    //             console.warn('Highlight position out of bounds, clearing selection');
    //             setHighlightRange(null);
    //             return;
    //         }

    //         // Creates a selection at the highlight position
    //         editorView.dispatch({
    //             selection: EditorSelection.create([EditorSelection.range(startPos, endPos)]),
    //         });

    //         // Scrolls to the selection
    //         editorView.dispatch({
    //             effects: EditorView.scrollIntoView(editorView.state.selection.main, {
    //                 y: 'center',
    //             }),
    //         });
    //     } catch (error) {
    //         console.error('Error applying highlight:', error);
    //         setHighlightRange(null);
    //     }
    // }, [highlightRange, activeFile]);

    async function loadFile(filePath: string): Promise<EditorFile | null> {
        try {
            setIsLoading(true);
            const content = await editorEngine.files.getFileContent(filePath);
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
            const templateNode = await editorEngine.ast.getTemplateNodeById(oid);
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
            const originalContent =
                (await editorEngine.code.getFileContent(activeFile.path, false)) || '';
            editorEngine.code.runCodeDiffs([
                {
                    path: activeFile.path,
                    original: originalContent,
                    generated: activeFile.content,
                },
            ]);

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

    // Filter files based on search
    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) {
            return editorEngine.files.tree;
        }

        const searchLower = searchQuery.toLowerCase();

        const filterNodes = (nodes: FileNode[]): FileNode[] => {
            return nodes.reduce<FileNode[]>((filtered, node) => {
                const nameMatches = node.name.toLowerCase().includes(searchLower);
                const childMatches = node.children ? filterNodes(node.children) : [];

                if (nameMatches || childMatches.length > 0) {
                    const newNode = { ...node };
                    if (childMatches.length > 0) {
                        newNode.children = childMatches;
                    }
                    filtered.push(newNode);
                }

                return filtered;
            }, []);
        };

        return filterNodes(editorEngine.files.tree);
    }, [editorEngine.files.tree, searchQuery]);

    // Handle keyboard navigation in the file list
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setSearchQuery('');
            inputRef.current?.blur();
            setHighlightedIndex(null);
            return;
        }

        const flattenedNodes = treeRef.current?.visibleNodes ?? [];

        if (flattenedNodes.length === 0) {
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();

            if (highlightedIndex === null) {
                setHighlightedIndex(e.key === 'ArrowDown' ? 0 : flattenedNodes.length - 1);
                return;
            }

            const newIndex =
                e.key === 'ArrowDown'
                    ? Math.min(highlightedIndex + 1, flattenedNodes.length - 1)
                    : Math.max(highlightedIndex - 1, 0);

            setHighlightedIndex(newIndex);

            // Ensures highlighted item is visible
            const node = flattenedNodes[newIndex];
            if (node) {
                treeRef.current?.scrollTo(node.id);
            }
        }

        if (e.key === 'Enter' && highlightedIndex !== null) {
            const selectedNode = flattenedNodes[highlightedIndex];
            if (selectedNode && !selectedNode.isInternal && !selectedNode.data.isDirectory) {
                loadFile(selectedNode.data.path);
                setHighlightedIndex(null);
                setHighlightRange(null);
            }
        }
    };

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
                setActiveFile(newOpenedFiles[newIndex]);
                setIsDirty(newOpenedFiles[newIndex].isDirty);
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

    const filesTreeDimensions = useMemo(
        () => ({
            width: filesWidth ?? 250,
            height: 600,
        }),
        [filesWidth],
    );

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
                {isFilesVisible && (
                    <div
                        ref={filesContainerRef}
                        className="w-64 border-r-[0.5px] flex-shrink-0 overflow-hidden flex flex-col"
                        style={{ height: 'calc(100% - 0px)' }}
                    >
                        <div className="flex flex-col h-full overflow-hidden">
                            <div className="p-3 flex-shrink-0">
                                <div className="flex flex-row justify-between items-center gap-2 mb-2">
                                    <div className="relative flex-grow">
                                        <Input
                                            ref={inputRef}
                                            className="h-8 text-xs pr-8"
                                            placeholder="Search files"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                        />
                                        {searchQuery && (
                                            <button
                                                className="absolute right-[1px] top-[1px] bottom-[1px] aspect-square hover:bg-background-onlook active:bg-transparent flex items-center justify-center rounded-r-[calc(theme(borderRadius.md)-1px)] group"
                                                onClick={() => setSearchQuery('')}
                                            >
                                                <Icons.CrossS className="h-3 w-3 text-foreground-primary/50 group-hover:text-foreground-primary" />
                                            </button>
                                        )}
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant={'default'}
                                                size={'icon'}
                                                className="p-2 w-fit h-fit text-foreground-primary border-border-primary hover:border-border-onlook bg-background-secondary hover:bg-background-onlook border"
                                                onClick={loadProjectFiles}
                                            >
                                                <Icons.Reload />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipPortal>
                                            <TooltipContent>
                                                <p>Refresh files</p>
                                            </TooltipContent>
                                        </TooltipPortal>
                                    </Tooltip>
                                </div>
                            </div>

                            <div
                                className="flex-1 overflow-auto px-3 text-xs"
                                style={{ height: 'calc(100% - 56px)' }}
                            >
                                {editorEngine.files.loading ? (
                                    <div className="flex justify-center items-center h-full">
                                        <div className="animate-spin h-5 w-5 border-2 border-foreground-hover rounded-full border-t-transparent"></div>
                                    </div>
                                ) : filteredFiles.length === 0 ? (
                                    <div className="flex justify-center items-center h-full text-sm text-foreground/50">
                                        No files found
                                    </div>
                                ) : (
                                    <div className="h-full">
                                        <Tree
                                            ref={treeRef}
                                            data={filteredFiles}
                                            idAccessor={(node: FileNode) => node.id}
                                            childrenAccessor={(node: FileNode) =>
                                                node.children && node.children.length > 0
                                                    ? node.children
                                                    : null
                                            }
                                            onSelect={handleFileTreeSelect}
                                            height={filesTreeDimensions.height}
                                            width={filesTreeDimensions.width}
                                            indent={8}
                                            rowHeight={24}
                                            openByDefault={false}
                                            renderRow={(props: any) => (
                                                <FileTreeRow
                                                    {...props}
                                                    isHighlighted={
                                                        highlightedIndex !== null &&
                                                        treeRef.current?.visibleNodes[
                                                            highlightedIndex
                                                        ]?.id === props.node.id
                                                    }
                                                />
                                            )}
                                        >
                                            {(props) => <FileTreeNode {...props} />}
                                        </Tree>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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
                                        theme={theme === Theme.Dark ? 'dark' : 'light'}
                                        extensions={[
                                            ...getBasicSetup(theme === Theme.Dark, saveFile),
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
