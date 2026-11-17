import { StateEffect, StateField } from '@codemirror/state';
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view';
import { TINT_CLASS } from './codeTheme.js';

export const revealSourceRange = StateEffect.define<number>();

export const sourceRange = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update: (ranges, transaction) => {
    const revealed = transaction.effects.find(effect => effect.is(revealSourceRange));
    if (revealed !== undefined) {
      const position = Math.max(0, Math.min(revealed.value, transaction.newDoc.length));
      return Decoration.set([Decoration.line({ class: TINT_CLASS }).range(transaction.newDoc.lineAt(position).from)]);
    }
    if (transaction.selection !== undefined || transaction.isUserEvent('input') || transaction.isUserEvent('delete') || transaction.isUserEvent('undo') || transaction.isUserEvent('redo')) return Decoration.none;
    return ranges.map(transaction.changes);
  },
  provide: field => EditorView.decorations.from(field),
});
