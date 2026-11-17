import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

/** The mock's number. */
const LINE_HEIGHT = 20;

const HIGHLIGHT = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.operatorKeyword, tags.modifier, tags.moduleKeyword], color: 'var(--studio-syntax-keyword)' },
  { tag: [tags.typeName, tags.className, tags.tagName, tags.namespace, tags.definition(tags.typeName)], color: 'var(--studio-syntax-type)' },
  { tag: [tags.string, tags.special(tags.string), tags.regexp], color: 'var(--studio-syntax-string)' },
  { tag: [tags.number, tags.bool, tags.color, tags.unit], color: 'var(--studio-syntax-number)' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName), tags.macroName], color: 'var(--studio-syntax-call)' },
  { tag: [tags.comment, tags.lineComment, tags.blockComment, tags.docComment], color: 'var(--studio-syntax-comment)', fontStyle: 'italic', opacity: '0.7' },
  { tag: tags.heading, color: 'var(--studio-syntax-type)', fontWeight: '600' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: [tags.link, tags.url], color: 'var(--studio-syntax-call)', textDecoration: 'underline', textUnderlineOffset: '2px' },
  { tag: tags.monospace, color: 'var(--studio-syntax-string)' },
  { tag: tags.processingInstruction, color: 'var(--studio-syntax-comment)' },
  { tag: [tags.propertyName, tags.attributeName, tags.labelName], color: 'var(--studio-syntax-type)' },
  { tag: tags.atom, color: 'var(--studio-syntax-number)' },
]);

/** The line a mapping points at. A background and an INSET bar, not a border, so an edit inside it does not reflow the row. */
export const TINT_CLASS = 'cm-studio-tint';
/** The same line's number in the gutter, which takes the accent with it. */
export const TINT_GUTTER_CLASS = 'cm-studio-tint-gutter';

const THEME = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: 'var(--studio-syntax-plain)',
      fontSize: 'var(--text-supporting-size)',
      height: '100%',
    },
    '.cm-content': {
      fontFamily: 'var(--font-family-code)',
      lineHeight: `${String(LINE_HEIGHT)}px`,
      paddingBlock: 'var(--spacing-2)',
      caretColor: 'var(--color-text-primary)',
    },
    '.cm-scroller': { fontFamily: 'var(--font-family-code)', lineHeight: `${String(LINE_HEIGHT)}px`, overflow: 'auto' },
    '.cm-gutters': {
      backgroundColor: 'var(--color-background-surface)',
      color: 'var(--color-text-gray)',
      border: 'none',
      paddingInlineStart: 'var(--spacing-2)',
    },
    '.cm-activeLine': { backgroundColor: 'var(--color-overlay-hover)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--color-text-secondary)' },
    // The design's own treatment: the row washed, with a 2px accent bar down its leading edge.
    [`.${TINT_CLASS}`]: {
      backgroundColor: 'var(--studio-syntax-tint)',
      boxShadow: 'inset 2px 0 0 var(--color-accent)',
    },
    [`.${TINT_GUTTER_CLASS}`]: { color: 'var(--color-text-accent)', opacity: 1 },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--studio-syntax-tint)',
    },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--color-text-primary)' },
  },
  { dark: true },
);

export function studioCodeTheme(): Extension {
  return [THEME, syntaxHighlighting(HIGHLIGHT)];
}
