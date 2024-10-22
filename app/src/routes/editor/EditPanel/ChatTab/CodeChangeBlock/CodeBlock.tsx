import { shikiToMonaco } from '@shikijs/monaco/index.mjs';
import clsx from 'clsx';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { createHighlighter } from 'shiki';

export const CodeBlock = ({ code }: { code: string }) => {
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);

    useEffect(() => {
        initMonaco();
        return () => {
            if (editor.current) {
                editor.current.dispose();
            }
        };
    }, []);

    async function initMonaco() {
        if (editorContainer.current) {
            await initHighlighter();
            editor.current = monaco.editor.create(editorContainer.current, {
                value: '',
                language: 'javascript',
                theme: 'dark-plus',
                automaticLayout: true,
                fontSize: 12,
                lineNumbers: 'off',
                minimap: { enabled: false },
                scrollbar: {
                    vertical: 'hidden',
                    horizontal: 'hidden',
                },
                overviewRulerBorder: false,
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
                renderLineHighlight: 'none',
                contextmenu: false,
                folding: false,
                readOnly: true,
                padding: {
                    top: 0,
                    bottom: 0,
                },
                glyphMargin: false,
                stickyScroll: { enabled: false },
                tabSize: 1,
                insertSpaces: true,
                detectIndentation: false,
                guides: {
                    indentation: false,
                    highlightActiveIndentation: false,
                    bracketPairs: false,
                },
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
            themes: ['dark-plus'],
            langs: LANGS,
        });

        LANGS.forEach((lang) => {
            monaco.languages.register({ id: lang });
        });

        shikiToMonaco(highlighter, monaco);
    }

    function updateCodeValue(code: string) {
        console.log('updateCodeValue', code);
        if (!editor.current) {
            console.error('Editor not initialized.');
            return;
        }
        editor.current.setValue(code);
    }

    return <div ref={editorContainer} className={clsx('w-full h-full')} />;
};
