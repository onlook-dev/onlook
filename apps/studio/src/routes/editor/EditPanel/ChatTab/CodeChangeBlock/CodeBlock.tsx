import { useTheme } from '@/components/ThemeProvider';
import { shikiToMonaco } from '@shikijs/monaco/index.mjs';
import clsx from 'clsx';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { createHighlighter } from 'shiki';
import { VARIANTS } from './variants';

export const CodeBlock = ({ code, variant }: { code: string; variant?: 'minimal' | 'normal' }) => {
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const { theme } = useTheme();
    const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
    const setting = VARIANTS[variant || 'normal'];

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

    async function initMonaco() {
        if (editorContainer.current) {
            await initHighlighter();
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

    return <div ref={editorContainer} className={clsx('w-full h-full')} />;
};
