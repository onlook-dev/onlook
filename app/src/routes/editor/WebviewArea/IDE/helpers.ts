import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import './index.css';

export const addLineHighlight = StateEffect.define<{ from: number; to: number }>();
export const lineHighlightField = StateField.define({
    create() {
        return Decoration.none;
    },
    update(lines, tr) {
        lines = lines.map(tr.changes);
        for (const e of tr.effects) {
            if (e.is(addLineHighlight)) {
                const { from, to } = e.value;
                const decorations = [];
                for (let pos = from; pos <= to; ) {
                    const line = tr.state.doc.lineAt(pos);
                    decorations.push(lineHighlightMark.range(line.from));
                    pos = line.to + 1;
                }
                lines = Decoration.set(decorations, true);
            }
        }
        return lines;
    },
    provide: (f) => EditorView.decorations.from(f),
});

export const lineHighlightMark = Decoration.line({
    attributes: { style: 'background-color: hsl(344 100% 53%/ 0.20)' },
});
