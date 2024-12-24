import {
    applyStylesToEditor,
    createEditorPlugins,
    schema,
} from '@/lib/editor/engine/overlay/prosemirror/';
import type { RectDimensions } from '@/lib/editor/engine/overlay/rect';
import { EditorAttributes } from '@onlook/models/constants';
import { colors } from '@onlook/ui/tokens';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import React, { useEffect, useRef } from 'react';

interface TextEditorProps {
    rect: RectDimensions;
    content: string;
    styles: Record<string, string>;
    onChange?: (content: string) => void;
    onStop?: () => void;
    isComponent?: boolean;
    isDisabled?: boolean;
}

export const TextEditor: React.FC<TextEditorProps> = ({
    rect,
    content,
    styles,
    onChange,
    onStop,
    isComponent,
    isDisabled = false,
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorViewRef = useRef<EditorView | null>(null);

    // Initialize ProseMirror
    useEffect(() => {
        if (!editorRef.current) {
            return;
        }

        const state = EditorState.create({
            schema,
            plugins: createEditorPlugins(onStop, onStop),
        });

        const view = new EditorView(editorRef.current, {
            state,
            editable: () => !isDisabled,
            dispatchTransaction: (transaction) => {
                const newState = view.state.apply(transaction);
                view.updateState(newState);
                if (onChange && transaction.docChanged) {
                    onChange(view.state.doc.textContent);
                }
            },
            attributes: {
                style: 'height: 100%; padding: 0; margin: 0; box-sizing: border-box; overflow: hidden;',
            },
        });

        editorViewRef.current = view;

        // Set initial content
        const paragraph = schema.node('paragraph', null, content ? [schema.text(content)] : []);
        const newDoc = schema.node('doc', null, [paragraph]);
        const tr = view.state.tr.replaceWith(0, view.state.doc.content.size, newDoc.content);
        view.dispatch(tr);

        // Apply styles
        applyStylesToEditor(view, styles);

        // Focus the editor if not disabled
        if (!isDisabled) {
            view.focus();
        }

        return () => {
            view.destroy();
        };
    }, [content, styles, isComponent, isDisabled]);

    // Handle blur events
    useEffect(() => {
        const handleBlur = (event: FocusEvent) => {
            const editorElement = editorRef.current;
            if (editorElement && !editorElement.contains(event.relatedTarget as Node)) {
                onStop?.();
            }
        };

        const editorElement = editorRef.current;
        if (editorElement) {
            editorElement.addEventListener('blur', handleBlur, true);
            return () => {
                editorElement.removeEventListener('blur', handleBlur, true);
            };
        }
    }, [onStop]);

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
};
