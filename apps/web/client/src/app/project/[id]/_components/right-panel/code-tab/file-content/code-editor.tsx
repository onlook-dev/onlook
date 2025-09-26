import { useEditorEngine } from '@/components/store/editor';
import type { EditorFile } from '@/components/store/editor/ide';
import { EditorView } from '@codemirror/view';
import { getMimeType } from '@onlook/utility/src/file';
import CodeMirror from '@uiw/react-codemirror';
import { observer } from 'mobx-react-lite';
import type { RefObject } from 'react';
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

    const getFileUrl = (file: EditorFile) => {
        const mime = getMimeType(file.filename.toLowerCase());
        return `data:${mime};base64,${file.content}`;
    };

    return (
        <div
            className="h-full"
            style={{
                display: isActive ? 'block' : 'none',
            }}
        >
            {file.isBinary ? (
                <img
                    src={getFileUrl(file)}
                    alt={file.filename}
                    className="w-full h-full object-contain p-5"
                />
            ) : (
                <CodeMirror
                    key={file.id}
                    value={file.content}
                    height="100%"
                    theme="dark"
                    extensions={[
                        ...getBasicSetup(onSaveFile),
                        ...getExtensions(file.language),
                    ]}
                    onChange={(value) => {
                        if (ide.highlightRange) {
                            ide.setHighlightRange(null);
                        }
                        onUpdateFileContent(file.id, value);
                    }}
                    className="h-full overflow-hidden"
                    onCreateEditor={(editor) => {
                        editorViewsRef.current.set(file.id, editor);

                        editor.dom.addEventListener('mousedown', () => {
                            if (ide.highlightRange) {
                                ide.setHighlightRange(null);
                            }
                        });

                        // If this file is the active file and we have a highlight range,
                        // trigger the highlight effect again
                        if (
                            ide.activeFile &&
                            ide.activeFile.id === file.id &&
                            ide.highlightRange
                        ) {
                            setTimeout(() => {
                                if (ide.highlightRange) {
                                    ide.setHighlightRange(ide.highlightRange);
                                }
                            }, 300);
                        }
                    }}
                />
            )}
        </div>
    );
});