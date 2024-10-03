import { baseKeymap } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { DOMSerializer } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { applyStylesToEditor, schema } from './prosemirror';
import { RectDimensions } from './rect';
import { EditorAttributes } from '/common/constants';

export class EditTextInput {
    element: HTMLElement;
    private editorView: EditorView;
    private onChange: ((content: string) => void) | null = null;
    private onStop: (() => void) | null = null;
    private isDisabled: boolean = false;

    constructor() {
        this.element = document.createElement('div');
        this.element.style.position = 'absolute';
        this.element.style.pointerEvents = 'auto';
        this.element.style.zIndex = '999';
        this.element.style.overflow = 'visible';
        this.element.setAttribute(EditorAttributes.DATA_ONLOOK_IGNORE, 'true');
        this.element.setAttribute('id', EditorAttributes.ONLOOK_RECT_ID);

        this.editorView = this.initProseMirror();
        this.element.addEventListener('blur', this.handleBlur.bind(this), true);
        this.disable();
    }

    render(
        rect: RectDimensions,
        content: string = '',
        styles: Record<string, string> = {},
        onChange?: (content: string) => void,
        onStop?: () => void,
        isComponent?: boolean,
    ) {
        this.updateSize(rect);
        applyStylesToEditor(this.editorView, styles, isComponent);
        this.setValue(content);
        this.onChange = onChange || null;
        this.onStop = onStop || null;
    }

    updateSize({ width, height, top, left }: RectDimensions) {
        this.element.style.display = 'block';
        this.element.style.width = `${Math.max(width, 10)}px`;
        this.element.style.height = `${Math.max(height, 10)}px`;
        this.element.style.top = `${top}px`;
        this.element.style.left = `${left}px`;
    }

    private initProseMirror() {
        const state = EditorState.create({
            schema,
            plugins: [
                history(),
                keymap({
                    'Mod-z': undo,
                    'Mod-shift-z': redo,
                    Escape: () => this.stopEditor(),
                    Enter: () => this.stopEditor(),
                }),
                keymap(baseKeymap),
            ],
        });

        const view = new EditorView(this.element, {
            state,
            editable: () => true,
            dispatchTransaction: (transaction) => {
                const newState = view.state.apply(transaction);
                view.updateState(newState);
                if (this.onChange && transaction.docChanged) {
                    this.onChange(this.getValue());
                }
            },
            attributes: {
                style: 'height: 100%; padding: 0; margin: 0; box-sizing: border-box; overflow: hidden;',
            },
        });

        return view;
    }

    getValue(): string {
        return this.editorView.state.doc.textContent;
    }

    getValueAsHTML(): string {
        const fragment = DOMSerializer.fromSchema(this.editorView.state.schema).serializeFragment(
            this.editorView.state.doc.content,
        );
        const temporaryContainer = document.createElement('div');
        temporaryContainer.appendChild(fragment);

        // Get the HTML of the non-empty children
        return Array.from(temporaryContainer.children)
            .filter((child) => child.textContent?.trim() !== '')
            .map((child) => {
                child.removeAttribute('style');
                return child.outerHTML;
            })
            .join('');
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

    stopEditor(): boolean {
        this.onStop && this.onStop();
        this.disable();
        return true;
    }

    private handleBlur(event: FocusEvent) {
        if (!this.element.contains(event.relatedTarget as Node)) {
            this.stopEditor();
        }
    }

    disable() {
        if (!this.isDisabled) {
            this.isDisabled = true;
            this.editorView.setProps({ editable: () => false });
            this.element.style.pointerEvents = 'none';
        }
    }

    enable() {
        if (this.isDisabled) {
            this.isDisabled = false;
            this.editorView.setProps({ editable: () => true });
            this.element.style.pointerEvents = 'auto';
            this.editorView.focus();
        }
    }
}
