import { EditorView, ViewUpdate } from '@codemirror/view';
import { convertToBase64, getMimeType } from '@onlook/utility/src/file';
import CodeMirror from '@uiw/react-codemirror';
import { type RefObject, useEffect, useMemo, useState } from 'react';
import type { CodeNavigationTarget } from '@onlook/models';
import type { BinaryEditorFile, EditorFile } from '../shared/types';
import { getBasicSetup, getExtensions, highlightElementRange, scrollToLineColumn } from './code-mirror-config';
import { FloatingAddToChatButton } from './floating-add-to-chat-button';
import { keymap } from '@codemirror/view';

interface CodeEditorProps {
    file: EditorFile;
    isActive: boolean;
    navigationTarget: CodeNavigationTarget | null;
    editorViewsRef: RefObject<Map<string, EditorView>>;
    onSaveFile: () => Promise<void>;
    onUpdateFileContent: (fileId: string, content: string) => void;
    onSelectionChange?: (selection: { from: number; to: number; text: string } | null) => void;
    onAddSelectionToChat?: (selection: { from: number; to: number; text: string }) => void;
    onFocusChatInput?: () => void;
}

export const CodeEditor = ({
    file,
    isActive,
    navigationTarget,
    editorViewsRef,
    onSaveFile,
    onUpdateFileContent,
    onSelectionChange,
    onAddSelectionToChat,
    onFocusChatInput,
}: CodeEditorProps) => {
    const [currentSelection, setCurrentSelection] = useState<{ from: number; to: number; text: string } | null>(null);
    const [selectionAddedToChat, setSelectionAddedToChat] = useState(false);
    const [showButton, setShowButton] = useState(false);

    const getFileUrl = (file: BinaryEditorFile) => {
        const mime = getMimeType(file.path.toLowerCase());
        const base64 = convertToBase64(new Uint8Array(file.content));
        return `data:${mime};base64,${base64}`;
    };

    const selectionExtension = useMemo(() => {
        return [
            EditorView.updateListener.of((update: ViewUpdate) => {
                if (update.selectionSet) {
                    const selection = update.state.selection.main;
                    const selectedText = update.state.sliceDoc(selection.from, selection.to);

                    if (selection.from !== selection.to) {
                        const selectionData = {
                            from: selection.from,
                            to: selection.to,
                            text: selectedText
                        };
                        setCurrentSelection(selectionData);
                        setSelectionAddedToChat(false); // Reset the flag for new selection
                        setShowButton(false); // Hide button during selection
                        onSelectionChange?.(selectionData);
                    } else {
                        setCurrentSelection(null);
                        setSelectionAddedToChat(false); // Reset when selection is cleared
                        setShowButton(false); // Hide button when no selection
                        onSelectionChange?.(null);
                    }
                }
            }),
            // Add mousedown listener to hide button when starting selection
            EditorView.domEventHandlers({
                mousedown: () => {
                    setShowButton(false);
                    return false;
                },
                mouseup: () => {
                    // Show button after mouse release if there's a selection
                    setTimeout(() => {
                        setShowButton(true);
                    }, 0);
                    return false;
                }
            }),
            // Add CMD+L keyboard shortcut
            keymap.of([
                {
                    key: 'Mod-l',
                    run: (view) => {
                        const selection = view.state.selection.main;
                        if (selection.from !== selection.to) {
                            const selectedText = view.state.sliceDoc(selection.from, selection.to);
                            const selectionData = {
                                from: selection.from,
                                to: selection.to,
                                text: selectedText
                            };
                            onAddSelectionToChat?.(selectionData);
                            setSelectionAddedToChat(true); // Mark as added to chat
                            onFocusChatInput?.(); // Focus chat input
                            return true;
                        }
                        return false;
                    }
                }
            ])
        ];
    }, [onSelectionChange, onAddSelectionToChat]);

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

    const handleAddToChat = (selection: { from: number; to: number; text: string }) => {
        onAddSelectionToChat?.(selection);
        setSelectionAddedToChat(true); // Mark as added to chat
        onFocusChatInput?.(); // Focus chat input
    };

    return (
        <div
            className="h-full relative"
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
                <>
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
                    {currentSelection && showButton && onAddSelectionToChat && editorViewsRef.current?.get(file.path) && !selectionAddedToChat && (
                        <FloatingAddToChatButton
                            editor={editorViewsRef.current.get(file.path)!}
                            selection={currentSelection}
                            onAddToChat={() => handleAddToChat(currentSelection)}
                        />
                    )}
                </>
            )}
        </div>
    );
};