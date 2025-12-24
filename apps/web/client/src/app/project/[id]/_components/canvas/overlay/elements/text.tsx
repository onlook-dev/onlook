import { useEditorEngine } from '@/components/store/editor';
import {
    applyStylesToEditor,
    createEditorPlugins,
    schema,
} from '@/components/store/editor/overlay/prosemirror';
import { EditorAttributes } from '@onlook/constants';
import { colors } from '@onlook/ui/tokens';
import { observer } from 'mobx-react-lite';
import { EditorState, Selection, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { useEffect, useRef } from 'react';

const contentHelpers = {
    // Convert content with newlines to ProseMirror nodes
    createNodesFromContent: (content: string) => {
        if (!content) return [];

        const lines = content.split('\n');
        const nodes = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i] || i === 0) {
                nodes.push(schema.text(lines[i] || ''));
            }
            if (i < lines.length - 1) {
                const hardBreakNode = schema.nodes.hard_break;
                if (hardBreakNode) {
                    nodes.push(hardBreakNode.create());
                }
            }
        }
        return nodes;
    },

    // Convert ProseMirror document to text with newlines
    extractContentWithNewlines: (view: EditorView) => {
        let content = '';
        view.state.doc.descendants((node) => {
            if (node.type.name === 'text' && node.text) {
                content += node.text || '';
            } else if (node.type.name === 'hard_break') {
                content += '\n';
            }
        });
        return content;
    }
};

export const TextEditor = observer(() => {
    const editorEngine = useEditorEngine();
    const overlayState = editorEngine.overlay.state;
    const isDisabled = false;
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);
    const onChangeRef = useRef<((content: string) => void) | undefined>(undefined);
    const onStopRef = useRef<(() => void) | undefined>(undefined);
    if (!overlayState.textEditor) {
        return null;
    }
    const { rect, styles, onChange, onStop, isComponent, content } = overlayState.textEditor;

    // Update callback refs
    onChangeRef.current = onChange;
    onStopRef.current = onStop;

    // Initialize ProseMirror (only when component mounts)
    useEffect(() => {
        if (!editorRef.current) {
            return;
        }

        const state = EditorState.create({
            schema,
            plugins: createEditorPlugins(() => onStopRef.current?.(), () => onStopRef.current?.()),
        });

        const view = new EditorView(editorRef.current, {
            state,
            editable: () => !isDisabled,
            dispatchTransaction: (transaction) => {
                const newState = view.state.apply(transaction);
                view.updateState(newState);
                if (onChangeRef.current && transaction.docChanged) {
                    const textContent = contentHelpers.extractContentWithNewlines(view);
                    onChangeRef.current(textContent);
                }
            },
            attributes: {
                style: 'height: 100%; padding: 0; margin: 0; box-sizing: border-box; overflow: hidden;',
            },
        });

        editorViewRef.current = view;

        // Set initial content with proper line break handling
        const nodes = contentHelpers.createNodesFromContent(content);
        const paragraph = schema.node('paragraph', null, nodes);
        const newDoc = schema.node('doc', null, [paragraph]);
        const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, newDoc.content);
        view.dispatch(tr);

        // Apply styles
        applyStylesToEditor(view, styles);

        // Focus the editor if not disabled
        if (!isDisabled) {
            view.focus();
        }

        // Attach blur handler directly to ProseMirror's contenteditable
        const handleBlur = (event: FocusEvent) => {
            if (onStopRef.current && !editorRef.current?.contains(event.relatedTarget as Node)) {
                onStopRef.current();
            }
        };
        view.dom.addEventListener('blur', handleBlur, true);

        return () => {
            view.dom.removeEventListener('blur', handleBlur, true);
            view.destroy();
        };
    }, []); // Only run on mount

    // Update content when it changes (but preserve cursor position and avoid disrupting ongoing edits)
    useEffect(() => {
        const view = editorViewRef.current;
        if (!view) return;

        const currentContent = contentHelpers.extractContentWithNewlines(view);
        if (currentContent !== content) {
            // Only update if the editor doesn't have focus (to avoid disrupting user typing)
            // or if the content change is significant (not just from user typing)
            if (!view.hasFocus() || Math.abs(currentContent.length - content.length) > 1) {
                const selection = view.state.selection;
                const nodes = contentHelpers.createNodesFromContent(content);
                const paragraph = schema.node('paragraph', null, nodes);
                const newDoc = schema.node('doc', null, [paragraph]);
                const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, newDoc.content);

                // Try to preserve cursor position if possible
                const targetPos = Math.min(selection.from, tr.doc.content.size);
                const newSelection = targetPos < tr.doc.content.size
                    ? Selection.near(tr.doc.resolve(targetPos))
                    : Selection.atEnd(tr.doc);
                tr.setSelection(newSelection);

                view.dispatch(tr);
            }
        }
    }, [content]);

    // Update styles when they change
    useEffect(() => {
        const view = editorViewRef.current;
        if (view) {
            applyStylesToEditor(view, styles);
        }
    }, [styles]);

    // Update editor state when disabled state changes
    useEffect(() => {
        const view = editorViewRef.current;
        if (view) {
            view.setProps({ editable: () => !isDisabled });
        }
    }, [isDisabled]);

    return (
        <div
            ref={editorRef}
            style={{
                position: 'absolute',
                width: `${Math.max(rect.width, 10)}px`,
                height: `${Math.max(rect.height, 10)}px`,
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                pointerEvents: isDisabled ? 'none' : 'auto',
                overflow: 'visible',
                transformOrigin: 'top left',
                outline: `2px solid ${isComponent ? colors.purple[500] : colors.red[500]}`,
                outlineOffset: '-1px',
                borderRadius: '1px',
            }}
            data-onlook-ignore={EditorAttributes.DATA_ONLOOK_IGNORE}
            id={EditorAttributes.ONLOOK_RECT_ID}
        />
    );
});