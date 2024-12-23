import { baseKeymap } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { Schema } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { Plugin } from 'prosemirror-state';

// Export the schema configuration
export const schema = new Schema({
    nodes: {
        doc: {
            content: 'paragraph+',
        },
        paragraph: {
            content: 'text*',
            toDOM() {
                return ['p', 0];
            },
        },
        text: {
            inline: true,
        },
    },
});

// Export utility function for applying styles
export const applyStylesToEditor = (
    editor: HTMLElement | EditorView,
    styles: Record<string, string>,
    isComponent?: boolean,
) => {
    const element = editor instanceof EditorView ? editor.dom : editor;
    Object.entries(styles).forEach(([key, value]) => {
        if (key === 'font-family' && isComponent) {
            return;
        }
        element.style[key as any] = value;
    });
};

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
