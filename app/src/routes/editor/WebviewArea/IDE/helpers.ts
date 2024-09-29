import { HighlightStyle } from '@codemirror/language';
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import { EditorView } from 'codemirror';

export const HIGHLIGHT_STYLE = HighlightStyle.define([
    { tag: t.comment, color: '#6a9955' },
    { tag: t.string, color: '#ce9178' },
    { tag: [t.number, t.bool, t.null], color: '#b5cea8' },
    { tag: t.keyword, color: '#569cd6' },
    { tag: t.propertyName, color: '#9cdcfe' },
    { tag: t.function(t.variableName), color: '#dcdcaa' },
    { tag: t.tagName, color: '#569cd6' },
    { tag: t.attributeName, color: '#9cdcfe' },
    { tag: t.angleBracket, color: '#808080' },
]);

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
