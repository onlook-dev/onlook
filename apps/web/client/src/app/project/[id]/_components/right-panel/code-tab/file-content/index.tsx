import type { EditorFile } from '@/components/store/editor/ide';
import { EditorView } from '@codemirror/view';
import { type RefObject } from 'react';
import { CodeEditor } from './code-editor';
import { UnsavedChangesDialog } from './unsaved-changes-dialog';

interface CodeEditorAreaProps {
    openedFiles: EditorFile[];
    activeFile: EditorFile | null;
    showUnsavedDialog: boolean;
    editorViewsRef: RefObject<Map<string, EditorView>>;
    onSaveFile: () => Promise<void>;
    onUpdateFileContent: (fileId: string, content: string) => void;
    onDiscardChanges: (fileId: string) => Promise<void>;
    onCancelUnsaved: () => void;
}

export const CodeEditorArea = ({
    openedFiles,
    activeFile,
    showUnsavedDialog,
    editorViewsRef,
    onSaveFile,
    onUpdateFileContent,
    onDiscardChanges,
    onCancelUnsaved,
}: CodeEditorAreaProps) => {

    return (
        <div className="flex-1 relative overflow-hidden">
            <div className="h-full">
                {/* Empty state when no file is selected */}
                {openedFiles.length === 0 || !activeFile ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-center text-muted-foreground text-base">
                            Open a file or select an element on the page.
                        </div>
                    </div>
                ) : (
                    openedFiles.map((file) => (
                        <CodeEditor
                            key={file.id}
                            file={file}
                            isActive={activeFile?.id === file.id}
                            editorViewsRef={editorViewsRef}
                            onSaveFile={onSaveFile}
                            onUpdateFileContent={onUpdateFileContent}
                        />
                    ))
                )}
            </div>

            {/* Unsaved Changes Dialog */}
            {activeFile?.isDirty && showUnsavedDialog && (
                <UnsavedChangesDialog
                    onSave={onSaveFile}
                    onDiscard={() => onDiscardChanges(activeFile!.id)}
                    onCancel={onCancelUnsaved}
                />
            )}
        </div>
    );
};