import { useEditorEngine } from '@/components/Context';
import { javascript, typescriptLanguage } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import CodeMirror from '@uiw/react-codemirror';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { highlightField, setHighlightEffect } from './helpers';
import './index.css';
import { TemplateNode } from '/common/models/element/templateNode';

export const CodeEditor = observer(() => {
    const editorEngine = useEditorEngine();
    const [code, setCode] = useState('');
    const [path, setPath] = useState<string | null>(null);
    const editorRef = useRef<EditorView | null>(null);

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
        editorEngine.code.getCodeFile(templateNode).then((newCode: string | null) => {
            if (!newCode) {
                console.error('No code found.');
                return;
            }
            setPath(templateNode.path);
            setCode(newCode);
            highlightAndScrollToCode(templateNode);
        });
    }, [editorEngine.elements.selected]);

    const highlightAndScrollToCode = (templateNode: TemplateNode) => {
        if (!editorRef.current) {
            return;
        }

        const startLine = templateNode.startTag.start.line - 1; // CodeMirror is 0-indexed
        const endLine = templateNode.endTag?.end.line || templateNode.startTag.end.line - 1;

        const startPos = editorRef.current.state.doc.line(startLine + 1).from;
        const endPos = editorRef.current.state.doc.line(endLine).to;

        // Set new highlight
        editorRef.current.dispatch({
            effects: setHighlightEffect.of({ from: startPos, to: endPos }),
        });

        // Scroll to the start line
        editorRef.current.dispatch({
            effects: EditorView.scrollIntoView(startPos, { y: 'start', yMargin: 50 }),
        });
    };

    const onChange = (value: string) => {
        setCode(value);
    };

    return (
        <div className="w-full h-[700px] mt-20">
            <div className="my-2 border rounded-lg p-2 bg-bg text-sm">{path || ''}</div>
            <CodeMirror
                value={code}
                height="100%"
                theme={vscodeDark}
                onChange={onChange}
                className="w-full h-full"
                extensions={[javascript({ jsx: true }), typescriptLanguage, highlightField]}
                onCreateEditor={(view) => {
                    editorRef.current = view;
                }}
            />
        </div>
    );
});
