import { isColorEmpty } from '@onlook/utility';
import { baseKeymap } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Schema } from 'prosemirror-model';
import { Plugin, EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { adaptValueToCanvas } from '../utils';
import { ensureFontLoaded } from '@/hooks/use-font-loader';

export const schema = new Schema({
    nodes: {
        doc: { content: 'paragraph+' },
        paragraph: {
            content: '(text | hard_break)*',
            toDOM: () => ['p', { style: 'margin: 0; padding: 0;' }, 0],
        },
        text: { inline: true },
        hard_break: {
            inline: true,
            group: 'inline',
            selectable: false,
            toDOM: () => ['br'],
        },
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
    const styleMark = state.schema.marks?.style;
    if (!styleMark) {
        console.error('No style mark found');
        return;
    }

    const tr = state.tr.addMark(0, state.doc.content.size, styleMark.create({ style: styles }));
    const fontSize = adaptValueToCanvas(parseFloat(styles.fontSize ?? ''));
    const lineHeight = adaptValueToCanvas(parseFloat(styles.lineHeight ?? ''));
    const fontFamily = ensureFontLoaded(styles.fontFamily ?? '');

    Object.assign(editorView.dom.style, {
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeight}px`,
        fontWeight: styles.fontWeight,
        fontStyle: styles.fontStyle,
        color: isColorEmpty(styles.color ?? '') ? 'inherit' : styles.color,
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
        height: '100%',
        fontFamily,
        padding: styles.padding,
    });
    dispatch(tr);
}

const createLineBreakHandler = () => (state: EditorState, dispatch?: (tr: any) => void) => {
    if (dispatch) {
        const hardBreakNode = state.schema.nodes.hard_break;
        if (hardBreakNode) {
            dispatch(state.tr.replaceSelectionWith(hardBreakNode.create()));
        }
    }
    return true;
};

const createEnterHandler = (onExit: () => void) => (state: EditorState) => {
    onExit();
    return true;
};

export const createEditorPlugins = (onEscape?: () => void, onEnter?: () => void): Plugin[] => [
    history(),
    keymap({
        'Mod-z': undo,
        'Mod-shift-z': redo,
        Escape: () => {
            onEscape?.();
            return !!onEscape;
        },
        Enter: onEnter ? createEnterHandler(onEnter) : () => false,
        'Shift-Enter': createLineBreakHandler(),
    }),
    keymap(baseKeymap),
];