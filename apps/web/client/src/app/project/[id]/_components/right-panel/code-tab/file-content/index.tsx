import { EditorView } from '@codemirror/view';
import { type RefObject, useMemo } from 'react';
import type { CodeNavigationTarget } from '../hooks/use-code-navigation';
import type { EditorFile } from '../shared/types';
import { isDirty } from '../shared/utils';
import { CodeEditor } from './code-editor';
import { UnsavedChangesDialog } from './unsaved-changes-dialog';

interface CodeEditorAreaProps {
    openedFiles: EditorFile[];
    activeFile: EditorFile | null;
    showUnsavedDialog: boolean;
    navigationTarget: CodeNavigationTarget | null;
    editorViewsRef: RefObject<Map<string, EditorView>>;
    onSaveFile: () => Promise<void>;
    onUpdateFileContent: (fileId: string, content: string) => void;
    onDiscardChanges: (fileId: string) => void;
    onCancelUnsaved: () => void;
}

export const CodeEditorArea = ({
    openedFiles,
    activeFile,
    showUnsavedDialog,
    navigationTarget,
    editorViewsRef,
    onSaveFile,
    onUpdateFileContent,
    onDiscardChanges,
    onCancelUnsaved,
}: CodeEditorAreaProps) => {
    const activeFileIsDirty = useMemo(() => {
        if (!activeFile) return false;
        return isDirty(activeFile);
    }, [activeFile]);

    return (
        <div className="flex-1 relative overflow-hidden">
            <div className="h-full">
                {openedFiles.length === 0 || !activeFile ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                        <div className="text-center text-muted-foreground text-base">
                            Open a file or select an element on the page.
                        </div>
                    </div>
                ) : (
                    // Codemirror keeps track of editor history
                    // having one for each opened file will make a better experience despite the overhead
                    openedFiles.map((file) => (
                        <CodeEditor
                            key={file.path}
                            file={file}
                            isActive={activeFile?.path === file.path}
                            navigationTarget={navigationTarget && navigationTarget.filePath === file.path ? navigationTarget : null}
                            editorViewsRef={editorViewsRef}
                            onSaveFile={onSaveFile}
                            onUpdateFileContent={onUpdateFileContent}
                        />
                    ))
                )}
            </div>
            {activeFileIsDirty && showUnsavedDialog && (
                <UnsavedChangesDialog
                    onSave={onSaveFile}
                    onDiscard={() => onDiscardChanges(activeFile?.path || '')}
                    onCancel={() => { onCancelUnsaved(); }}
                />
            )}
        </div>
    );
};