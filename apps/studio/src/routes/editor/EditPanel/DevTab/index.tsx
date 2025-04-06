import { useEditorEngine } from '@/components/Context';
import { useTheme } from '@/components/ThemeProvider';
import { EditorTabValue } from '@/lib/models';
import { MainChannels, Theme } from '@onlook/models/constants';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@onlook/ui/dropdown-menu';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { Button } from '@onlook/ui/button';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '@onlook/ui/tooltip';
import { cn } from '@onlook/ui/utils';
import { toast } from '@onlook/ui/use-toast';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Tree, type TreeApi } from 'react-arborist';
import useResizeObserver from 'use-resize-observer';
import type { FileNode } from '@/lib/editor/engine/files';
import FileTreeNode from './FileTreeNode';
import FileTreeRow from './FileTreeRow';

import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';

// Extensions
import { EditorView } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import CodeMirror from '@uiw/react-codemirror';
import { highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { highlightSpecialChars, drawSelection } from '@codemirror/view';
import { bracketMatching } from '@codemirror/language';
import { autocompletion } from '@codemirror/autocomplete';
import { highlightSelectionMatches } from '@codemirror/search';
import { lintGutter } from '@codemirror/lint';
import { lineNumbers } from '@codemirror/view';
import { v4 as uuidv4 } from 'uuid';
import { keymap } from '@codemirror/view';

enum TabValue {
    CONSOLE = 'console',
    NETWORK = 'network',
    ELEMENTS = 'elements',
}
interface FileTabProps {
    filename: string;
    isActive?: boolean;
    isDirty?: boolean;
    onClick?: () => void;
    onClose?: () => void;
}

const FileTab: React.FC<FileTabProps> = ({
    filename,
    isActive = false,
    isDirty = false,
    onClick,
    onClose,
}) => {
    return (
        <div className="h-full px-4 relative group">
            <div className="absolute right-0 h-[50%] w-[0.5px] bg-foreground/10 top-1/2 -translate-y-1/2"></div>
            <div className="flex items-center h-full">
                <button
                    className={cn(
                        'text-sm h-full flex items-center focus:outline-none',
                        isActive
                            ? 'text-foreground-hover'
                            : 'text-foreground hover:text-foreground-hover',
                    )}
                    onClick={onClick}
                >
                    {filename}
                    {isDirty && <span className="ml-1 text-foreground-hover text-white">●</span>}
                    {isActive && (
                        <div className="absolute bottom-0 left-0 w-full h-[2px] bg-foreground-hover"></div>
                    )}
                </button>
                <button
                    className="ml-2 cursor-pointer text-foreground"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose?.();
                    }}
                >
                    <Icons.CrossS className="h-3 w-3" />
                </button>
            </div>
        </div>
    );
};

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
    const editorViewRef = useRef<EditorView | null>(null);
    const treeRef = useRef<TreeApi<FileNode>>();
    const inputRef = useRef<HTMLInputElement>(null);

    // Scan project files when the component is mounted
    useEffect(() => {
        loadProjectFiles();
    }, []);

    // Load files from the project
    async function loadProjectFiles() {
        try {
            await editorEngine.files.scanFiles();
        } catch (error) {
            console.error('Error loading project files:', error);
        }
    }

    useEffect(() => {
        const handleOpenCodeInOnlook = (data: any) => {
            if (data && data.filePath) {
                editorEngine.editPanelTab = EditorTabValue.DEV;

                loadFile(data.filePath);
                if (data.startLine) {
                    setHighlightRange({
                        startLineNumber: data.startLine,
                        startColumn: data.startColumn || 1,
                        endLineNumber: data.endLine || data.startLine,
                        endColumn: data.endColumn || 80,
                    });
                } else if (data.line) {
                    setHighlightRange({
                        startLineNumber: data.line,
                        startColumn: 1,
                        endLineNumber: data.line,
                        endColumn: 80,
                    });
                }
            }
        };

        // Subscribe to the event using the standard IPC API
        const unsubscribe = window.api.on(MainChannels.VIEW_CODE_IN_ONLOOK, handleOpenCodeInOnlook);

        // Cleanup
        return () => {
            unsubscribe();
        };
    }, [editorEngine]);

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
                    await loadFile(filePath);

                    // Gets range information for the selected element
                    const range = await getElementCodeRange(element);

                    if (range) {
                        setHighlightRange(range);
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
            const templateNode = await editorEngine.ast.getTemplateNodeById(element.oid);
            if (templateNode && templateNode.startTag) {
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

    // Adds highlighting to CodeMirror
    const basicTheme = {
        '&': {
            fontSize: '13px',
            backgroundColor: 'transparent',
        },
        '&.cm-focused .cm-selectionBackground, & .cm-selectionBackground': {
            backgroundColor: 'rgba(21, 170, 147, 0.2) !important',
        },
        '.cm-content': {
            lineHeight: '1.5',
        },
    };

    const getBasicSetup = (isDark: boolean) => {
        return [
            EditorView.theme(basicTheme),
            isDark
                ? EditorView.theme({
                      '&': { color: '#ffffffd9' },
                  })
                : EditorView.theme({
                      '&': { color: '#000000d9' },
                  }),
            highlightActiveLine(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            drawSelection(),
            bracketMatching(),
            autocompletion(),
            highlightSelectionMatches(),
            lintGutter(),
            lineNumbers(),
            keymap.of([
                {
                    key: 'Mod-s',
                    run: () => {
                        saveFile();
                        return true;
                    },
                },
            ]),
        ];
    };

    // Update highlighting when highlightRange changes
    useEffect(() => {
        if (!activeFile || !highlightRange || !editorViewRef.current) {
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
            editorViewRef.current.dispatch({
                selection: EditorSelection.create([EditorSelection.range(startPos, endPos)]),
            });

            // Scrolls to the selection
            editorViewRef.current.dispatch({
                effects: EditorView.scrollIntoView(editorViewRef.current.state.selection.main, {
                    y: 'center',
                }),
            });
        } catch (error) {
            console.error('Error applying highlight:', error);
            setHighlightRange(null);
        }
    }, [highlightRange, activeFile, editorViewRef.current]);

    async function loadFile(filePath: string) {
        try {
            setIsLoading(true);
            const content = await editorEngine.files.getFileContent(filePath);
            const fileName = filePath.split('/').pop() || '';
            const fileLanguage = getLanguageFromFileName(fileName);

            // Check if file is already open
            const existingFile = openedFiles.find((f) => f.path === filePath);
            if (existingFile) {
                setActiveFile(existingFile);
                return;
            }

            const newFile = {
                id: uuidv4(),
                filename: fileName,
                path: filePath,
                content: content || '',
                language: fileLanguage,
                isDirty: false,
            };

            setOpenedFiles([...openedFiles, newFile]);
            setActiveFile(newFile);
            setIsDirty(false);
            setHighlightRange(null);
        } catch (error) {
            console.error('Error loading file:', error);
        } finally {
            setIsLoading(false);
        }
    }

    function getLanguageFromFileName(fileName: string): string {
        const extension = fileName.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'js':
                return 'javascript';
            case 'jsx':
                return 'javascript';
            case 'ts':
                return 'typescript';
            case 'tsx':
                return 'typescript';
            case 'css':
                return 'css';
            case 'html':
                return 'html';
            case 'json':
                return 'json';
            case 'md':
                return 'markdown';
            default:
                return 'typescript';
        }
    }

    // Get CodeMirror extensions based on file language
    function getExtensions(language: string): any[] {
        switch (language) {
            case 'javascript':
                return [javascript({ jsx: true })];
            case 'typescript':
                return [javascript({ jsx: true, typescript: true })];
            case 'css':
                return [css()];
            case 'html':
                return [html()];
            case 'json':
                return [json()];
            case 'markdown':
                return [markdown()];
            default:
                return [javascript({ jsx: true, typescript: true })];
        }
    }

    function handleFileSelect(file: EditorFile) {
        setHighlightRange(null);
        setActiveFile(file);
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
            if (templateNode && templateNode.path) {
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
            }
        }
    };

    const handleFileTreeSelect = async (nodes: any[]) => {
        if (nodes.length > 0 && !nodes[0].data.isDirectory) {
            await loadFile(nodes[0].data.path);
        }
    };

    function closeFile(fileId: string) {
        const fileIndex = openedFiles.findIndex((f) => f.id === fileId);
        if (fileIndex === -1) {
            return;
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
            } else {
                setActiveFile(null);
            }
        }

        // Clears highlight range when closing a file
        setHighlightRange(null);
    }

    function closeAllFiles() {
        setOpenedFiles([]);
        setActiveFile(null);
        setHighlightRange(null);
        setIsDirty(false);
    }

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
                                            ref={treeRef as React.RefObject<TreeApi<FileNode>>}
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
                            {activeFile && (
                                <CodeMirror
                                    value={activeFile.content}
                                    height="100%"
                                    theme={theme === Theme.Dark ? 'dark' : 'light'}
                                    extensions={[
                                        ...getBasicSetup(theme === Theme.Dark),
                                        ...getExtensions(activeFile.language),
                                    ]}
                                    onChange={(value) => {
                                        if (activeFile) {
                                            if (highlightRange) {
                                                setHighlightRange(null);
                                            }

                                            // Check if content has actually changed
                                            const hasChanged = value !== activeFile.content;

                                            const updatedFiles = openedFiles.map(
                                                (file: EditorFile) =>
                                                    file.id === activeFile.id
                                                        ? {
                                                              ...file,
                                                              content: value,
                                                              isDirty: hasChanged,
                                                          }
                                                        : file,
                                            );

                                            setOpenedFiles(updatedFiles);

                                            const updatedActiveFile = {
                                                ...activeFile,
                                                content: value,
                                                isDirty: hasChanged,
                                            };
                                            setActiveFile(updatedActiveFile);

                                            setIsDirty(hasChanged);
                                        }
                                    }}
                                    className="h-full overflow-hidden"
                                    onCreateEditor={(editor) => {
                                        editorViewRef.current = editor;

                                        editor.dom.addEventListener('mousedown', () => {
                                            if (highlightRange) {
                                                setHighlightRange(null);
                                            }
                                        });
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
