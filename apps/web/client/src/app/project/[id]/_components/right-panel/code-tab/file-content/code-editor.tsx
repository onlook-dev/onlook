import { EditorView } from '@codemirror/view';
import { convertToBase64, getMimeType } from '@onlook/utility/src/file';
import CodeMirror from '@uiw/react-codemirror';
import { observer } from 'mobx-react-lite';
import { type RefObject, useEffect } from 'react';
import type { CodeNavigationTarget } from '../hooks/use-code-navigation';
import type { BinaryEditorFile, EditorFile } from '../shared/types';
import { clearElementHighlight, getBasicSetup, getExtensions, highlightElementRange, scrollToLineColumn } from './code-mirror-config';

interface CodeEditorProps {
    file: EditorFile;
    isActive: boolean;
    navigationTarget: CodeNavigationTarget | null;
    editorViewsRef: RefObject<Map<string, EditorView>>;
    onSaveFile: () => Promise<void>;
    onUpdateFileContent: (fileId: string, content: string) => void;
}

export const CodeEditor = observer(({
    file,
    isActive,
    navigationTarget,
    editorViewsRef,
    onSaveFile,
    onUpdateFileContent,
}: CodeEditorProps) => {
    const getFileUrl = (file: BinaryEditorFile) => {
        const mime = getMimeType(file.path.toLowerCase());
        const base64 = convertToBase64(new Uint8Array(file.content));
        return `data:${mime};base64,${base64}`;
    };

    const onCreateEditor = (editor: EditorView) => {
        editorViewsRef.current?.set(file.path, editor);
        
        if (navigationTarget && isActive) {
            handleNavigation(editor, navigationTarget);
        }
    }

    useEffect(() => {
        if (!navigationTarget || !isActive || file.type !== 'text') return;

        const editor = editorViewsRef.current?.get(file.path);
        if (!editor) return;

        handleNavigation(editor, navigationTarget);
    }, [navigationTarget, isActive, file.path, file.type, editorViewsRef]);

    const handleNavigation = (editor: EditorView, target: CodeNavigationTarget) => {
        const { range } = target;
        
        try {
            editor.dispatch({
                effects: clearElementHighlight()
            });

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
});