import { useTheme } from '@/components/ThemeProvider';
import { shikiToMonaco } from '@shikijs/monaco/index.mjs';
import { cn } from '@onlook/ui/utils';
import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { createHighlighter } from 'shiki';
import { VARIANTS } from './variants';

interface CodeDiffProps {
    originalCode: string;
    modifiedCode: string;
    language?: string;
    showLineNumbers?: boolean;
    variant?: 'minimal' | 'normal';
}

export const CodeDiff = ({ originalCode, modifiedCode, variant }: CodeDiffProps) => {
    const { theme } = useTheme();
    const diffContainer = useRef<HTMLDivElement | null>(null);
    const diffEditor = useRef<monaco.editor.IStandaloneDiffEditor | null>(null);
    const setting = VARIANTS[variant || 'normal'];

    useEffect(() => {
        initMonaco();
        return () => {
            if (diffEditor.current) {
                diffEditor.current.dispose();
            }
        };
    }, []);

    useEffect(() => {
        if (diffEditor.current) {
            updateDiffContent(originalCode, modifiedCode);
        }
    }, [originalCode, modifiedCode]);

    useEffect(() => {
        if (diffEditor.current) {
            diffEditor.current.updateOptions({
                // @ts-expect-error - Option exists
                theme: theme === 'light' ? 'light-plus' : 'dark-plus',
            });
        }
    }, [theme]);

    async function initMonaco() {
        if (diffContainer.current) {
            await initHighlighter();

            diffEditor.current = monaco.editor.createDiffEditor(diffContainer.current, {
                theme: theme === 'light' ? 'light-plus' : 'dark-plus',
                automaticLayout: true,
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
                stickyScroll: { enabled: false },
                glyphMargin: false,
                renderSideBySide: true,
                originalEditable: false,
                diffWordWrap: 'on',
                guides: {
                    indentation: false,
                    highlightActiveIndentation: false,
                    bracketPairs: false,
                },
                ...setting,
            });

            updateDiffContent(originalCode, modifiedCode);
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

    function updateDiffContent(original: string, modified: string) {
        if (!diffEditor.current) {
            console.error('Diff editor not initialized.');
            return;
        }

        const originalModel = monaco.editor.createModel(original, 'javascript');
        const modifiedModel = monaco.editor.createModel(modified, 'javascript');

        diffEditor.current.setModel({
            original: originalModel,
            modified: modifiedModel,
        });
    }

    return <div ref={diffContainer} className={cn('w-full h-full overflow-hidden')} />;
};
