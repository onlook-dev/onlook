import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@onlook/ui/utils';
import { shikiToMonaco } from '@shikijs/monaco/index.mjs';
import * as monaco from 'monaco-editor';
import { memo, useEffect, useRef } from 'react';
import { createHighlighter } from 'shiki';
import { VARIANTS } from './variants';

// Global highlighter instance
let highlighterInstance: any = null;
let highlighterPromise: Promise<void> | null = null;

const initializeHighlighter = async () => {
    if (!highlighterPromise) {
        highlighterPromise = (async () => {
            const LANGS = ['javascript', 'typescript', 'jsx', 'tsx'];

            highlighterInstance = await createHighlighter({
                themes: ['dark-plus', 'light-plus'],
                langs: LANGS,
            });

            LANGS.forEach((lang) => {
                monaco.languages.register({ id: lang });
            });

            // Apply the highlighter to Monaco
            shikiToMonaco(highlighterInstance, monaco);
        })();
    }
    return highlighterPromise;
};

// Pre-tokenize the code before setting it in the editor
const getTokenizedCode = async (code: string, theme: 'light' | 'dark' | 'system') => {
    if (!highlighterInstance) {
        await initializeHighlighter();
    }

    const tokens = await highlighterInstance.codeToThemedTokens(
        code,
        'typescript',
        theme === 'light' ? 'light-plus' : 'dark-plus',
        { includeExplanation: true },
    );

    return tokens;
};

export const CodeBlock = memo(
    ({ code, variant }: { code: string; variant?: 'minimal' | 'normal' }) => {
        const editorContainer = useRef<HTMLDivElement | null>(null);
        const { theme } = useTheme();
        const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
        const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(
            null,
        );
        const setting = VARIANTS[variant || 'normal'];
        const previousCode = useRef(code);
        const currentModelRef = useRef<monaco.editor.ITextModel | null>(null);

        // Initialize the editor once
        useEffect(() => {
            let mounted = true;

            const setupEditor = async () => {
                if (!editorContainer.current || editor.current) {
                    return;
                }

                await initializeHighlighter();

                if (!mounted) {
                    return;
                }

                // Create a model with pre-tokenized content
                const model = monaco.editor.createModel(
                    code,
                    'typescript',
                    monaco.Uri.parse(`file:///workspace/code-${Math.random()}.ts`),
                );

                currentModelRef.current = model;

                editor.current = monaco.editor.create(editorContainer.current, {
                    model,
                    theme: theme === 'light' ? 'light-plus' : 'dark-plus',
                    automaticLayout: true,
                    overviewRulerBorder: false,
                    overviewRulerLanes: 0,
                    hideCursorInOverviewRuler: true,
                    renderLineHighlight: 'none',
                    contextmenu: false,
                    folding: false,
                    readOnly: true,
                    glyphMargin: false,
                    stickyScroll: { enabled: false },
                    insertSpaces: true,
                    detectIndentation: false,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    guides: {
                        indentation: false,
                        highlightActiveIndentation: false,
                        bracketPairs: false,
                    },
                    ...setting,
                });

                // Apply initial highlighting
                const tokens = await getTokenizedCode(code, theme);
                applyTokensToModel(model, tokens);
            };

            setupEditor();

            return () => {
                mounted = false;
                if (currentModelRef.current) {
                    currentModelRef.current.dispose();
                }
                if (editor.current) {
                    editor.current.dispose();
                    editor.current = null;
                }
            };
        }, []);

        // Handle theme changes
        useEffect(() => {
            if (editor.current) {
                editor.current.updateOptions({
                    theme: theme === 'light' ? 'light-plus' : 'dark-plus',
                });

                // Re-tokenize with new theme
                if (currentModelRef.current) {
                    getTokenizedCode(currentModelRef.current.getValue(), theme).then((tokens) => {
                        if (currentModelRef.current) {
                            applyTokensToModel(currentModelRef.current, tokens);
                        }
                    });
                }
            }
        }, [theme]);

        // Handle code updates with pre-tokenization
        useEffect(() => {
            const updateContent = async () => {
                if (editor.current && code !== previousCode.current && currentModelRef.current) {
                    const position = editor.current.getPosition();
                    const scrollTop = editor.current.getScrollTop();

                    // Pre-tokenize the new content
                    const tokens = await getTokenizedCode(code, theme);

                    // Update model and apply tokens in a single operation
                    currentModelRef.current.pushEditOperations(
                        [],
                        [
                            {
                                range: currentModelRef.current.getFullModelRange(),
                                text: code,
                            },
                        ],
                        () => null,
                    );

                    applyTokensToModel(currentModelRef.current, tokens);

                    // Restore cursor and scroll position
                    if (position) {
                        editor.current.setPosition(position);
                    }
                    editor.current.setScrollTop(scrollTop);

                    previousCode.current = code;
                }
            };

            updateContent();
        }, [code, theme]);

        // Helper function to apply tokens to the model
        const applyTokensToModel = (model: monaco.editor.ITextModel, tokens: any[]) => {
            const decorations = tokens.flatMap((line, lineIndex) =>
                line.map((token: any) => ({
                    range: new monaco.Range(
                        lineIndex + 1,
                        token.startIndex + 1,
                        lineIndex + 1,
                        token.endIndex + 1,
                    ),
                    options: {
                        inlineClassName: `mtk${token.color}`,
                    },
                })),
            );

            if (decorationsCollection.current) {
                decorationsCollection.current.set(decorations);
            }
        };

        return <div ref={editorContainer} className={cn('w-full h-full')} />;
    },
);

CodeBlock.displayName = 'CodeBlock';
