import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@onlook/ui/utils';
import { shikiToMonaco } from '@shikijs/monaco/index.mjs';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { createHighlighter } from 'shiki';
import { VARIANTS } from './variants';

export const CodeBlock = ({
    className,
    code,
    variant,
}: {
    className?: string;
    code: string;
    variant?: 'minimal' | 'normal';
    disableColor?: boolean;
}) => {
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const { theme } = useTheme();
    const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
    const setting = VARIANTS[variant || 'normal'];
    const LINE_HEIGHT = 20;

    useEffect(() => {
        initMonaco();
        return () => {
            if (editor.current) {
                editor.current.dispose();
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

    const getEditorHeight = (code: string) => {
        const lineCount = code.split('\n').length;
        return lineCount * LINE_HEIGHT + 25;
    };

    async function initMonaco() {
        if (editorContainer.current) {
            await initHighlighter();
            if (editorContainer.current?.style) {
                const height = getEditorHeight(code);
                editorContainer.current.style.height = `${height}px`;
            }

            editor.current = monaco.editor.create(editorContainer.current, {
                value: '',
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
                scrollBeyondLastLine: false,
                minimap: { enabled: false },
                lineHeight: LINE_HEIGHT,
                ...setting,
            });
            decorationsCollection.current = editor.current.createDecorationsCollection();
            if (code) {
                updateCodeValue(code);
            }
        }
    }

    async function initHighlighter() {
        const LANGS = ['javascript', 'typescript', 'jsx', 'tsx'];

        const highlighter = await createHighlighter({
            themes: ['dark-plus', 'light-plus'],
            langs: LANGS,
        });

        LANGS.forEach((lang) => {
            monaco.languages.register({ id: lang });
        });

        shikiToMonaco(highlighter, monaco);
    }

    function updateCodeValue(code: string) {
        if (!editor.current) {
            console.error('Editor not initialized.');
            return;
        }
        editor.current.setValue(code);
    }

    return <div ref={editorContainer} className={cn('flex w-full', className)} />;
};
