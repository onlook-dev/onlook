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
import { cn } from '@onlook/ui/utils';
import { toast } from '@onlook/ui/use-toast';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';

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

enum TabValue {
    CONSOLE = 'console',
    NETWORK = 'network',
    ELEMENTS = 'elements',
}
interface FileTabProps {
    filename: string;
    isActive?: boolean;
    onClick?: () => void;
}

const FileTab: React.FC<FileTabProps> = ({ filename, isActive = false, onClick }) => {
    return (
        <div className="h-full px-4 relative">
            <div className="absolute right-0 h-[50%] w-[0.5px] bg-foreground/10 top-1/2 -translate-y-1/2"></div>
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
                {isActive && (
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-foreground-hover"></div>
                )}
            </button>
        </div>
    );
};

interface EditorFile {
    id: string;
    filename: string;
    path: string;
    content: string;
    language: string;
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

    // File state
    const [files, setFiles] = useState<EditorFile[]>([]);
    const [activeFile, setActiveFile] = useState<EditorFile | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [highlightRange, setHighlightRange] = useState<CodeRange | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // CodeMirror container and editor ref
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const editorViewRef = useRef<EditorView | null>(null);

    useEffect(() => {
        // Listen for main process events to open files in Onlook
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

    // Track element selection changes
    useEffect(() => {
        // When an element is selected, try to find its source file
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

                    // Get range information for the selected element
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

    // Add highlighting to CodeMirror
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
        ];
    };

    // Update highlighting when highlightRange changes
    useEffect(() => {
        if (!activeFile || !highlightRange || !editorViewRef.current) {
            return;
        }

        // Calculate positions for scrolling
        const lines = activeFile.content.split('\n');

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

        // Create a selection at the highlight position
        editorViewRef.current.dispatch({
            selection: EditorSelection.create([EditorSelection.range(startPos, endPos)]),
        });

        // Scroll to the selection
        editorViewRef.current.dispatch({
            effects: EditorView.scrollIntoView(editorViewRef.current.state.selection.main, {
                y: 'center',
            }),
        });
    }, [highlightRange, activeFile, editorViewRef.current]);

    // Load initial sample files
    useEffect(() => {
        // Initialize with empty files list
        const loadSampleFiles = async () => {
            try {
                // Start with an empty array - files will be loaded when requested
                const sampleFiles: EditorFile[] = [];
                setFiles(sampleFiles);
            } catch (error) {
                console.error('Error initializing files:', error);
            }
        };

        loadSampleFiles();
    }, []);

    async function loadFile(filePath: string) {
        setIsLoading(true);
        try {
            // Check if we already have this file loaded
            const existingFile = files.find((f) => f.path === filePath);
            if (existingFile) {
                setActiveFile(existingFile);
                return;
            }

            const fileContent = await editorEngine.code.getFileContent(filePath, false);

            const fileName = filePath.split('/').pop() || 'unknown.tsx';
            const language = getLanguageFromFileName(fileName);

            const newFile: EditorFile = {
                id: `file-${files.length + 1}`,
                filename: fileName,
                path: filePath,
                content: fileContent || '',
                language,
            };

            // Add to files list and make active
            setFiles([...files, newFile]);
            setActiveFile(newFile);
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
        if (!activeFile || !isDirty) {
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

    return (
        <div className="h-full flex flex-col w-full border-l-[0.5px] border-t-[0.5px] border-b-[0.5px] backdrop-blur shadow rounded-tl-xl">
            {/* Top Bar with Edit Code and Files dropdowns */}
            <div className="flex items-center justify-between h-11 pl-4 pr-2 rounded-tl-xl border-b-[0.5px]">
                <div className="flex items-center space-x-5 h-full">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center text-foreground text-sm hover:text-foreground-hover h-full">
                            <Icons.Sparkles className="mr-1.5 h-4 w-4" />
                            <span className="mr-1">Edit Code</span>
                            <Icons.ChevronDown className="h-3 w-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="-mt-1">
                            <DropdownMenuItem onClick={handleJumpToElement}>
                                <Icons.Check className="mr-2 h-4 w-4" />
                                Jump to code from canvas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={saveFile} disabled={!isDirty}>
                                <Icons.Pencil className="mr-2 h-4 w-4" />
                                Save changes
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center text-foreground text-sm hover:text-foreground-hover h-full">
                            <Icons.Directory className="mr-1.5 h-4 w-4" />
                            <span className="mr-1">Files</span>
                            <Icons.ChevronDown className="h-3 w-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="-mt-1">
                            <div className="h-[300px] w-[250px] overflow-auto p-1">
                                {files.map((file) => (
                                    <DropdownMenuItem
                                        key={file.id}
                                        className={cn(
                                            'flex items-center py-1.5',
                                            activeFile?.id === file.id && 'bg-foreground/10',
                                        )}
                                        onClick={() => handleFileSelect(file)}
                                    >
                                        <Icons.File className="mr-2 h-4 w-4" />
                                        {file.filename}
                                    </DropdownMenuItem>
                                ))}
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <button className="text-foreground hover:text-foreground-hover hover:bg-foreground/5 p-2 rounded flex items-center justify-center">
                    <Icons.CrossS className="h-4 w-4" />
                </button>
            </div>

            {/* Second Bar with file tabs */}
            <div className="flex items-center justify-between h-10 border-b-[0.5px]">
                <div className="flex items-center h-full overflow-x-auto">
                    {files.map((file) => (
                        <FileTab
                            key={file.id}
                            filename={file.filename}
                            isActive={activeFile?.id === file.id}
                            onClick={() => handleFileSelect(file)}
                        />
                    ))}
                </div>

                <div className="border-l-[0.5px] h-full flex items-center p-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger className="text-foreground hover:text-foreground-hover hover:bg-foreground/5 p-1 rounded h-full w-full flex items-center justify-center px-3">
                            <Icons.DotsHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="-mt-1">
                            {files.map((file) => (
                                <DropdownMenuItem
                                    key={file.id}
                                    onClick={() => handleFileSelect(file)}
                                >
                                    {file.filename}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="flex-1 h-full relative">
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
                                    // Update file content in state
                                    setFiles(
                                        files.map((file) =>
                                            file.id === activeFile.id
                                                ? { ...file, content: value }
                                                : file,
                                        ),
                                    );
                                    setActiveFile({ ...activeFile, content: value });
                                    setIsDirty(true);
                                }
                            }}
                            className="h-full"
                            onCreateEditor={(editor) => {
                                // Store the editor instance in our ref
                                editorViewRef.current = editor;
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
});
