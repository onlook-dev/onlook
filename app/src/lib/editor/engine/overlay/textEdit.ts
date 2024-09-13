import { baseKeymap } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { RectDimensions } from './rect';
import { EditorAttributes } from '/common/constants';

export class EditTextInput {
    element: HTMLElement;
    private editorView: EditorView;

    constructor() {
        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.style.pointerEvents = 'auto';
        this.element.style.zIndex = '999';
        this.element.style.overflow = 'visible';
        this.element.setAttribute(EditorAttributes.DATA_ONLOOK_IGNORE, 'true');
        this.element.setAttribute('id', EditorAttributes.ONLOOK_RECT_ID);

        this.editorView = this.initProseMirror();
    }

    render(
        { width, height, top, left }: RectDimensions,
        content: string = '',
        styles: Record<string, string> = {},
    ) {
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
        this.element.style.top = `${top}px`;
        this.element.style.left = `${left}px`;
        this.applyStylesToEditor(styles);
        this.editorView.dom.style.height = '100%';
        this.setValue(content);
    }

    private initProseMirror() {
        const schema = new Schema({
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

        const state = EditorState.create({
            schema,
            plugins: [
                history(),
                keymap({ 'Mod-z': undo, 'Mod-shift-z': redo }),
                keymap(baseKeymap),
            ],
        });

        const view = new EditorView(this.element, {
            state,
            editable: () => true,
            dispatchTransaction: (transaction) => {
                const newState = view.state.apply(transaction);
                view.updateState(newState);
            },
            attributes: {
                style: 'height: 100%; padding: 0; margin: 0; box-sizing: border-box; overflow: hidden;',
            },
        });

        return view;
    }

    private applyStylesToEditor(styles: Record<string, string>) {
        const { state, dispatch } = this.editorView;
        const { tr } = state;

        tr.addMark(0, state.doc.content.size, state.schema.marks.style.create({ style: styles }));

        // Apply container styles
        Object.assign(this.editorView.dom.style, {
            fontFamily: styles.fontFamily,
            fontSize: styles.fontSize,
            fontWeight: styles.fontWeight,
            fontStyle: styles.fontStyle,
            lineHeight: styles.lineHeight,
            color: styles.color,
            textAlign: styles.textAlign,
            textDecoration: styles.textDecoration,
            letterSpacing: styles.letterSpacing,
            wordSpacing: styles.wordSpacing,
        });

        dispatch(tr);
    }

    getValue(): string {
        return this.editorView.state.doc.textContent;
    }

    setValue(content: string) {
        const { state, dispatch } = this.editorView;
        const { tr, schema } = state;

        // Create a new document with a single paragraph
        const paragraph = schema.node('paragraph', null, content ? [schema.text(content)] : []);
        const newDoc = schema.node('doc', null, [paragraph]);

        // Replace the entire document content
        tr.replaceWith(0, state.doc.content.size, newDoc.content);

        dispatch(tr);
    }
}
