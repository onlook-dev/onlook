import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@onlook/ui/utils';
import { shikiToMonaco } from '@shikijs/monaco/index.mjs';
import * as monaco from 'monaco-editor';
import { memo, useEffect, useRef } from 'react';
import { createHighlighter } from 'shiki';
import { VARIANTS } from './variants';

let highlighterPromise: Promise<void> | null = null;
const initializeHighlighter = async () => {
    if (!highlighterPromise) {
        highlighterPromise = (async () => {
            const LANGS = ['javascript', 'typescript', 'jsx', 'tsx'];

            const highlighter = await createHighlighter({
                themes: ['dark-plus', 'light-plus'],
                langs: LANGS,
            });

            LANGS.forEach((lang) => {
                monaco.languages.register({ id: lang });
            });

            shikiToMonaco(highlighter, monaco);
        })();
    }
    return highlighterPromise;
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

                editor.current = monaco.editor.create(editorContainer.current, {
                    value: code,
                    language: 'javascript',
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
                    guides: {
                        indentation: false,
                        highlightActiveIndentation: false,
                        bracketPairs: false,
                    },
                    ...setting,
                });

                decorationsCollection.current = editor.current.createDecorationsCollection();
            };

            setupEditor();

            return () => {
                mounted = false;
                if (editor.current) {
                    editor.current.dispose();
                    editor.current = null;
                }
            };
        }, []);

        useEffect(() => {
            if (editor.current) {
                editor.current.updateOptions({
                    theme: theme === 'light' ? 'light-plus' : 'dark-plus',
                });
            }
        }, [theme]);

        useEffect(() => {
            if (editor.current && code !== previousCode.current) {
                const position = editor.current.getPosition();
                const scrollTop = editor.current.getScrollTop();

                const model = editor.current.getModel();
                if (model) {
                    model.setValue(code);
                }

                // Restore cursor position and scroll position
                if (position) {
                    editor.current.setPosition(position);
                }
                editor.current.setScrollTop(scrollTop);

                previousCode.current = code;
            }
        }, [code]);

        return <div ref={editorContainer} className={cn('w-full h-full')} />;
    },
);

CodeBlock.displayName = 'CodeBlock';
