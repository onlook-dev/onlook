import { useEditorEngine } from '@/components/Context';
import { javascript } from '@codemirror/lang-javascript';
import { syntaxHighlighting } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView, basicSetup } from 'codemirror';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { HIGHLIGHT_STYLE, highlightField, setHighlightEffect } from './helpers';
import './index.css';
import { TemplateNode } from '/common/models/element/templateNode';

export const CodeEditor = observer(() => {
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const editorView = useRef<EditorView | null>(null);
    const editorEngine = useEditorEngine();
    const [path, setPath] = useState<string | null>(null);

    useEffect(() => {
        if (editorContainer.current) {
            const state = EditorState.create({
                doc: '',
                extensions: [
                    basicSetup,
                    javascript({ jsx: true }),
                    syntaxHighlighting(HIGHLIGHT_STYLE),
                    highlightField,
                    EditorView.theme({
                        '&': { height: '100%' },
                        '.cm-scroller': { overflow: 'auto', backgroundColor: 'transparent' },
                        '.cm-content': { fontSize: '18px', backgroundColor: 'transparent' },
                        '.highlightedCodeText': { backgroundColor: 'rgba(255, 255, 255, 0.1)' },
                        '.cm-gutters': { backgroundColor: 'transparent' },
                    }),
                ],
            });

            editorView.current = new EditorView({
                state,
                parent: editorContainer.current,
            });
        }

        return () => {
            if (editorView.current) {
                editorView.current.destroy();
            }
        };
    }, []);

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
            if (editorView.current) {
                setPath(templateNode.path);
                editorView.current.dispatch({
                    changes: { from: 0, to: editorView.current.state.doc.length, insert: code },
                });
                highlightAndScrollToCode(templateNode);
            }
        });
    }, [editorEngine.elements.selected]);

    const highlightAndScrollToCode = (templateNode: TemplateNode) => {
        if (!editorView.current) {
            return;
        }

        const startLine = templateNode.startTag.start.line - 1; // CodeMirror uses 0-based line numbers
        const endLine = templateNode.endTag
            ? templateNode.endTag.end.line - 1
            : templateNode.startTag.end.line - 1;

        const startPos = editorView.current.state.doc.line(startLine + 1).from;
        const endPos = editorView.current.state.doc.line(endLine + 1).to;

        editorView.current.dispatch({
            effects: [
                setHighlightEffect.of({ from: startPos, to: endPos }),
                EditorView.scrollIntoView(startPos, { y: 'center' }),
            ],
        });

        setTimeout(() => {
            if (editorView.current) {
                editorView.current.dispatch({
                    effects: EditorView.scrollIntoView(startPos, { y: 'center' }),
                });
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
