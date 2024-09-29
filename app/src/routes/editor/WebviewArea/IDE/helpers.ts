import { StateEffect, StateField } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { EditorView } from 'codemirror';

// Define a custom state effect for setting highlights
export const setHighlightEffect = StateEffect.define<{ from: number; to: number } | null>();

// Define a state field to store and manage the highlight decoration
export const highlightField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(highlights, tr) {
        highlights = highlights.map(tr.changes);
        for (const e of tr.effects) {
            if (e.is(setHighlightEffect)) {
                highlights = Decoration.none;
                if (e.value) {
                    highlights = highlights.update({
                        add: [highlightDecoration.range(e.value.from, e.value.to)],
                    });
                }
            }
        }
        return highlights;
    },
    provide: (f) => EditorView.decorations.from(f),
});

// Define the highlight decoration
export const highlightDecoration = Decoration.mark({ class: 'highlightedCodeText' });
