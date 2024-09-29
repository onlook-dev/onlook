import { useEditorEngine } from '@/components/Context';
import { shikiToMonaco } from '@shikijs/monaco/index.mjs';
import { observer } from 'mobx-react-lite';
import * as monaco from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import { createHighlighter } from 'shiki';
import './index.css';
import { TemplateNode } from '/common/models/element/templateNode';

export const CodeEditor = observer(() => {
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const editorEngine = useEditorEngine();
    const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
    const [path, setPath] = useState<string | null>(null);

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
            const LANGS = ['javascript', 'typescript', 'jsx', 'tsx'];
            const highlighter = await createHighlighter({
                themes: ['dark-plus'],
                langs: LANGS,
            });

            // Register the languageIds first. Only registered languages will be highlighted.
            LANGS.forEach((lang) => {
                monaco.languages.register({ id: lang });
            });

            // Register the themes from Shiki, and provide syntax highlighting for Monaco.
            shikiToMonaco(highlighter, monaco);

            editor.current = monaco.editor.create(editorContainer.current, {
                value: '',
                language: 'javascript',
                theme: 'dark-plus',
                automaticLayout: true,
                fontSize: 18,
            });
            decorationsCollection.current = editor.current.createDecorationsCollection();
        }
    }

    useEffect(() => {
        if (!editorEngine.elements.selected.length) {
            return;
        }

        const selectedEl = editorEngine.elements.selected[0];
        const instance = editorEngine.ast.getInstance(selectedEl.selector);
        const root = editorEngine.ast.getRoot(selectedEl.selector);
        const templateNode = instance || root;
        if (!templateNode) {
            return;
        }
        editorEngine.code.getCodeFile(templateNode).then((code: string | null) => {
            if (!code) {
                console.error('No code found.');
                return;
            }
            if (editor.current) {
                setPath(templateNode.path);
                editor.current.setValue(code);
                highlightAndScrollToCode(templateNode);
            }
        });
    }, [editorEngine.elements.selected]);

    const highlightAndScrollToCode = (templateNode: TemplateNode) => {
        if (!editor.current || !decorationsCollection.current) {
            return;
        }

        const startLine = templateNode.startTag.start.line;
        const endLine = templateNode.endTag
            ? templateNode.endTag.end.line
            : templateNode.startTag.end.line;

        const newDecorations = [
            {
                range: new monaco.Range(startLine, 1, endLine, 1),
                options: {
                    isWholeLine: true,
                    className: 'highlightedCodeLine',
                    inlineClassName: 'highlightedCodeText',
                },
            },
        ];

        decorationsCollection.current.set(newDecorations);
        editor.current.revealLineInCenter(startLine);

        setTimeout(() => {
            if (editor.current) {
                editor.current.revealLineInCenter(startLine);
            }
        }, 100);
    };

    return (
        <div className="w-full h-[700px] mt-20">
            <div className="my-2 border rounded-lg p-2 bg-bg text-sm">{path || ''}</div>
            <div ref={editorContainer} className="w-full h-full" />
        </div>
    );
});
