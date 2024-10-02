import { useEditorEngine } from '@/components/Context';
import { shikiToMonaco } from '@shikijs/monaco/index.mjs';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import * as monaco from 'monaco-editor';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createHighlighter } from 'shiki';
import './index.css';
import { MainChannels } from '/common/constants';
import { CodeDiff } from '/common/models/code';
import { TemplateNode } from '/common/models/element/templateNode';

export const CodeEditor = observer(() => {
    const editorContainer = useRef<HTMLDivElement | null>(null);
    const editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const editorEngine = useEditorEngine();
    const decorationsCollection = useRef<monaco.editor.IEditorDecorationsCollection | null>(null);
    const [filePath, setFilePath] = useState<string | null>(null);
    const [hasChange, setHasChange] = useState<boolean>(false);

    useEffect(() => {
        try {
            initMonaco();
        } catch (e) {
            console.error('Error initializing Monaco', e);
        }
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
                fontSize: 18,
            });
            decorationsCollection.current = editor.current.createDecorationsCollection();
            editor.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () =>
                saveCode(),
            );
            editor.current.onDidChangeModelContent(() => {
                setHasChange(true);
            });
            console.log('Monaco initialized');
        }
    }

    const saveCode = useCallback(async () => {
        if (!filePath) {
            console.error('Cannot save: No file path set');
            return;
        }

        if (!editor.current) {
            console.error('Cannot save: No editor instance');
            return;
        }

        const code = editor.current.getValue();
        const codeDiffs: CodeDiff[] = [{ path: filePath, original: '', generated: code }];
        const res = await window.api.invoke(MainChannels.WRITE_CODE_BLOCKS, codeDiffs);
        if (res) {
            setHasChange(false);
        }
    }, [filePath]);

    useEffect(() => {
        if (editor.current) {
            editor.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, saveCode);

            const disposable = editor.current.onDidChangeModelContent(() => {
                if (filePath) {
                    setHasChange(true);
                }
            });

            return () => {
                disposable.dispose();
            };
        }
    }, [filePath, saveCode]);

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

    useEffect(() => {
        getSelectedCode();
    }, [editorEngine.elements.selected]);

    async function getSelectedCode() {
        if (!editorEngine.elements.selected.length) {
            return;
        }
        if (!editor.current) {
            console.error('Editor not initialized.');
            return;
        }

        const selectedEl = editorEngine.elements.selected[0];
        const instance = editorEngine.ast.getInstance(selectedEl.selector);
        const root = editorEngine.ast.getRoot(selectedEl.selector);
        const templateNode = instance || root;

        if (!templateNode) {
            console.error('No template node found.');
            return;
        }

        setFilePath(templateNode.path);
        if (templateNode.path !== filePath) {
            const code = await editorEngine.code.getCodeFile(templateNode);
            if (!code) {
                console.error('No code returned for path.', templateNode.path);
                return;
            }
            console.log('Set file path', templateNode.path);
            editor.current.setValue(code);
            setHasChange(false);
        }
        highlightAndScrollToCode(templateNode);
    }

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
        editor.current.revealLineInCenter(startLine, monaco.editor.ScrollType.Smooth);

        setTimeout(() => {
            if (editor.current) {
                editor.current.revealLineInCenter(startLine, monaco.editor.ScrollType.Smooth);
            }
        }, 100);
    };

    return (
        <div className="w-full h-[700px] mt-20">
            <div className="my-2 border rounded-lg p-2 bg-bg text-sm flex flex-row items-center">
                <p>{filePath || ''}</p>
                {hasChange && <div className="ml-auto bg-red rounded-full h-3 w-3"></div>}
            </div>
            <div ref={editorContainer} className={clsx('w-full h-full')} />
        </div>
    );
});
