import { EditorView } from '@codemirror/view';
import { type RefObject, useEffect, useState } from 'react';
import type { EditorFile } from '../shared/types';
import { CodeEditor } from './code-editor';
import { UnsavedChangesDialog } from './unsaved-changes-dialog';
import { hashContent } from '@/services/sync-engine/sync-engine';

// Check if file content differs from original
async function isDirty(file: EditorFile): Promise<boolean> {
    if (file.type === 'binary') {
        return false; // Binary files are never considered dirty
    }
    
    if (file.type === 'text') {
        const textFile = file as import('../shared/types').TextEditorFile;
        const currentHash = await hashContent(textFile.content);
        return currentHash !== textFile.originalHash;
    }
    
    return false;
}
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
    const [activeFileIsDirty, setActiveFileIsDirty] = useState(false);

    // Compute dirty status for active file
    useEffect(() => {
        if (activeFile) {
            isDirty(activeFile).then(setActiveFileIsDirty);
        } else {
            setActiveFileIsDirty(false);
        }
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