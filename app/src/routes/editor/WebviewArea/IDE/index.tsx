import { useEditorEngine } from '@/components/Context';
import { javascript, typescriptLanguage } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import CodeMirror from '@uiw/react-codemirror';
import { observer } from 'mobx-react-lite';
import { useEffect, useRef, useState } from 'react';
import { addLineHighlight, lineHighlightField } from './helpers';
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

        const startLine = templateNode.startTag.start.line;
        const endLine = templateNode.endTag?.end.line || templateNode.startTag.end.line;

        highlightLines(startLine, endLine);
        scrollToLine(startLine);
    };

    const highlightLines = (startLine: number, endLine: number) => {
        if (!editorRef.current || startLine <= 0) {
            return;
        }
        const startPos = editorRef.current.state.doc.line(startLine).from;
        const endPos = editorRef.current.state.doc.line(endLine).from;
        editorRef.current.dispatch({
            effects: addLineHighlight.of({ from: startPos, to: endPos }),
        });
    };

    const scrollToLine = (startLine: number) => {
        if (!editorRef.current || startLine <= 0) {
            return;
        }
        const startPos = editorRef.current.state.doc.line(startLine).from;
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
                extensions={[javascript({ jsx: true }), typescriptLanguage, lineHighlightField]}
                onCreateEditor={(view) => {
                    editorRef.current = view;
                }}
            />
        </div>
    );
});
