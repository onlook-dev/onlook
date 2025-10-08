import { EditorView, ViewUpdate } from '@codemirror/view';
import { convertToBase64, getMimeType } from '@onlook/utility/src/file';
import CodeMirror from '@uiw/react-codemirror';
import { type RefObject, useEffect, useMemo } from 'react';
import type { CodeNavigationTarget } from '@onlook/models';
import type { BinaryEditorFile, EditorFile } from '../shared/types';
import { getBasicSetup, getExtensions, highlightElementRange, scrollToLineColumn } from './code-mirror-config';

interface CodeEditorProps {
    file: EditorFile;
    isActive: boolean;
    navigationTarget: CodeNavigationTarget | null;
    editorViewsRef: RefObject<Map<string, EditorView>>;
    onSaveFile: () => Promise<void>;
    onUpdateFileContent: (fileId: string, content: string) => void;
    onSelectionChange?: (selection: { from: number; to: number; text: string } | null) => void;
}

export const CodeEditor = ({
    file,
    isActive,
    navigationTarget,
    editorViewsRef,
    onSaveFile,
    onUpdateFileContent,
    onSelectionChange,
}: CodeEditorProps) => {
    const getFileUrl = (file: BinaryEditorFile) => {
        const mime = getMimeType(file.path.toLowerCase());
        const base64 = convertToBase64(new Uint8Array(file.content));
        return `data:${mime};base64,${base64}`;
    };

    const selectionExtension = useMemo(() => {
        if (!onSelectionChange) return [];

        return [
            EditorView.updateListener.of((update: ViewUpdate) => {
                if (update.selectionSet) {
                    const selection = update.state.selection.main;
                    const selectedText = update.state.sliceDoc(selection.from, selection.to);

                    if (selection.from !== selection.to) {
                        onSelectionChange({
                            from: selection.from,
                            to: selection.to,
                            text: selectedText
                        });
                    } else {
                        onSelectionChange(null);
                    }
                }
            })
        ];
    }, [onSelectionChange]);

    const onCreateEditor = (editor: EditorView) => {
        editorViewsRef.current?.set(file.path, editor);

        if (navigationTarget && isActive) {
            // Delay navigation to ensure document is fully loaded
            setTimeout(() => {
                handleNavigation(editor, navigationTarget);
            }, 100);
        }
    }

    useEffect(() => {
        if (!navigationTarget || !isActive || file.type !== 'text') return;

        const editor = editorViewsRef.current?.get(file.path);
        if (!editor) return;

        handleNavigation(editor, navigationTarget);
    }, [navigationTarget, isActive, file.originalHash, file.type, file.path, editorViewsRef.current]);

    const handleNavigation = (editor: EditorView, target: CodeNavigationTarget) => {
        const { range } = target;
        try {
            scrollToLineColumn(editor, range.start.line, range.start.column);
            editor.dispatch({
                effects: highlightElementRange(
                    range.start.line,
                    range.start.column,
                    range.end.line,
                    range.end.column
                )
            });
        } catch (error) {
            console.error('[CodeEditor] Navigation error:', error);
        }
    };

    return (
        <div
            className="h-full"
            style={{
                display: isActive ? 'block' : 'none',
            }}
        >
            {file.type === 'binary' && (
                <img
                    src={getFileUrl(file as BinaryEditorFile)}
                    alt={file.path}
                    className="w-full h-full object-contain p-5"
                />
            )}
            {file.type === 'text' && typeof file.content === 'string' && (
                <CodeMirror
                    key={file.path}
                    value={file.content}
                    height="100%"
                    theme="dark"
                    extensions={[
                        ...getBasicSetup(onSaveFile),
                        ...getExtensions(file.path.split('.').pop() || ''),
                        ...selectionExtension,
                    ]}
                    onChange={(value) => {
                        onUpdateFileContent(file.path, value);
                    }}
                    className="h-full overflow-hidden"
                    onCreateEditor={onCreateEditor}
                />
            )}
        </div>
    );
};