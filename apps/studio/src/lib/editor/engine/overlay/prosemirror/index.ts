import { isColorEmpty } from '@onlook/utility';
import { baseKeymap } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Schema } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { adaptValueToCanvas } from '../utils';

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

export function applyStylesToEditor(editorView: EditorView, styles: Record<string, string>) {
    const { state, dispatch } = editorView;
    const { tr } = state;
    tr.addMark(0, state.doc.content.size, state.schema.marks.style.create({ style: styles }));

    // Apply container styles
    const fontSize = adaptValueToCanvas(parseFloat(styles.fontSize));
    const lineHeight = adaptValueToCanvas(parseFloat(styles.lineHeight));

    Object.assign(editorView.dom.style, {
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeight}px`,
        fontWeight: styles.fontWeight,
        fontStyle: styles.fontStyle,
        color: isColorEmpty(styles.color) ? 'inherit' : styles.color,
        textAlign: styles.textAlign,
        textDecoration: styles.textDecoration,
        letterSpacing: styles.letterSpacing,
        wordSpacing: styles.wordSpacing,
        alignItems: styles.alignItems,
        justifyContent: styles.justifyContent,
        layout: styles.layout,
        display: styles.display,
        backgroundColor: styles.backgroundColor,
        wordBreak: 'break-word',
        overflow: 'visible',
    });
    editorView.dom.style.height = '100%';
    dispatch(tr);
}

// Export common plugins configuration
export const createEditorPlugins = (onEscape?: () => void, onEnter?: () => void): Plugin[] => [
    history(),
    keymap({
        'Mod-z': undo,
        'Mod-shift-z': redo,
        Escape: () => {
            if (onEscape) {
                onEscape();
                return true;
            }
            return false;
        },
        Enter: () => {
            if (onEnter) {
                onEnter();
                return true;
            }
            return false;
        },
    }),
    keymap(baseKeymap),
];
