import { useEditorEngine } from '@/components/store/editor';
import { EditorView } from '@codemirror/view';
import { getMimeType } from '@onlook/utility/src/file';
import CodeMirror from '@uiw/react-codemirror';
import { observer } from 'mobx-react-lite';
import type { RefObject } from 'react';
import type { BinaryEditorFile, EditorFile, TextEditorFile } from '../shared/types';
import { getBasicSetup, getExtensions } from './code-mirror-config';

interface CodeEditorProps {
    file: EditorFile;
    isActive: boolean;
    editorViewsRef: RefObject<Map<string, EditorView>>;
    onSaveFile: () => Promise<void>;
    onUpdateFileContent: (fileId: string, content: string) => void;
}

export const CodeEditor = observer(({
    file,
    isActive,
    editorViewsRef,
    onSaveFile,
    onUpdateFileContent,
}: CodeEditorProps) => {
    const editorEngine = useEditorEngine();
    const ide = editorEngine.ide;

    const getFileUrl = (file: BinaryEditorFile) => {
        const mime = getMimeType(file.path.toLowerCase());
        // Convert Uint8Array to base64 string
        const base64 = btoa(String.fromCharCode(...new Uint8Array(file.content)));
        return `data:${mime};base64,${base64}`;
    };

    const onCreateEditor = (editor: EditorView) => {
        editorViewsRef.current.set(file.path, editor);
        editor.dom.addEventListener('mousedown', () => {
            if (ide.highlightRange) {
                ide.setHighlightRange(null);
            }
        });
        // If this file is the active file and we have a highlight range,
        // trigger the highlight effect again
        if (
            ide.activeFile &&
            ide.activeFile.path === file.path &&
            ide.highlightRange
        ) {
            setTimeout(() => {
                if (ide.highlightRange) {
                    ide.setHighlightRange(ide.highlightRange);
                }
            }, 300);
        }
    }

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
            {file.type === 'text' && (
                <CodeMirror
                    key={file.path}
                    value={(file as TextEditorFile).content}
                    height="100%"
                    theme="dark"
                    extensions={[
                        ...getBasicSetup(onSaveFile),
                        ...getExtensions(file.path.split('.').pop() || ''),
                    ]}
                    onChange={(value) => {
                        if (ide.highlightRange) {
                            ide.setHighlightRange(null);
                        }
                        onUpdateFileContent(file.path, value);
                    }}
                    className="h-full overflow-hidden"
                    onCreateEditor={onCreateEditor}
                />
            )}
        </div>
    );
});