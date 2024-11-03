import { Schema } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

import { colors } from '@onlook/ui/tokens';

export const schema = new Schema({
    nodes: {
        doc: { content: 'paragraph+' },
        paragraph: {
            content: 'text*',
            toDOM: () => ['p', { style: 'margin: 0; padding: 0;' }, 0],
        },
        text: { inline: true },
    },
    marks: {
        style: {
            attrs: { style: { default: null } },
            parseDOM: [
                {
                    tag: 'span[style]',
                    getAttrs: (node) => ({
                        style: (node as HTMLElement).getAttribute('style'),
                    }),
                },
            ],
            toDOM: (mark) => ['span', { style: mark.attrs.style }, 0],
        },
    },
});

export function applyStylesToEditor(
    editorView: EditorView,
    styles: Record<string, string>,
    isComponent = false,
) {
    const { state, dispatch } = editorView;
    const { tr } = state;
    tr.addMark(0, state.doc.content.size, state.schema.marks.style.create({ style: styles }));

    // Apply container styles
    Object.assign(editorView.dom.style, {
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        fontStyle: styles.fontStyle,
        lineHeight: styles.lineHeight,
        color: styles.color,
        textAlign: styles.textAlign,
        textDecoration: styles.textDecoration,
        letterSpacing: styles.letterSpacing,
        wordSpacing: styles.wordSpacing,
        alignItems: styles.alignItems,
        justifyContent: styles.justifyContent,
        layout: styles.layout,
        display: styles.display,
        borderRadius: '0px',
        outline: `2px solid ${isComponent ? colors.purple[500] : colors.red[500]}`,
        wordBreak: 'break-word',
    });
    editorView.dom.style.height = '100%';
    dispatch(tr);
}
