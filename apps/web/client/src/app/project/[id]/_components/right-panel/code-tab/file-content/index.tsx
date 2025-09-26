import { useEditorEngine } from '@/components/store/editor';
import type { EditorFile } from '@/components/store/editor/ide';
import { EditorView } from '@codemirror/view';
import { observer } from 'mobx-react-lite';
import { useRef } from 'react';
import { CodeEditor } from './code-editor';
import { UnsavedChangesDialog } from './unsaved-changes-dialog';

interface CodeEditorAreaProps {
    editorViewsRef: React.MutableRefObject<Map<string, EditorView>>;
    onSaveFile: () => Promise<void>;
    onUpdateFileContent: (fileId: string, content: string) => void;
    onDiscardChanges: (fileId: string) => Promise<void>;
    onGetFileUrl: (file: EditorFile) => string;
}

export const CodeEditorArea = observer(({
    editorViewsRef,
    onSaveFile,
    onUpdateFileContent,
    onDiscardChanges,
    onGetFileUrl
}: CodeEditorAreaProps) => {
    const editorEngine = useEditorEngine();
    const ide = editorEngine.ide;
    const editorContainer = useRef<HTMLDivElement | null>(null);

    return (
        <div className="flex-1 relative overflow-hidden">
            {ide.isLoading && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                    <div className="flex flex-col items-center">
                        <div className="animate-spin h-8 w-8 border-2 border-foreground-hover rounded-full border-t-transparent"></div>
                        <span className="mt-2 text-sm">Loading file...</span>
                    </div>
                </div>
            )}

            <div ref={editorContainer} className="h-full">
                {/* Empty state when no file is selected */}
                {ide.openedFiles.length === 0 || !ide.activeFile ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-center text-muted-foreground text-base">
                            Open a file or select an element on the page.
                        </div>
                    </div>
                ) : (
                    ide.openedFiles.map((file) => (
                        <CodeEditor
                            key={file.id}
                            file={file}
                            isActive={ide.activeFile?.id === file.id}
                            editorViewsRef={editorViewsRef}
                            onSaveFile={onSaveFile}
                            onUpdateFileContent={onUpdateFileContent}
                            onGetFileUrl={onGetFileUrl}
                        />
                    ))
                )}
            </div>

            {/* Unsaved Changes Dialog */}
            {ide.activeFile?.isDirty && ide.showUnsavedDialog && (
                <UnsavedChangesDialog
                    onSave={onSaveFile}
                    onDiscard={() => onDiscardChanges(ide.activeFile!.id)}
                    onCancel={() => {
                        ide.showUnsavedDialog = false;
                        ide.pendingCloseAll = false;
                    }}
                />
            )}
        </div>
    );
});