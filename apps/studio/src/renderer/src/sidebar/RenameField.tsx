import { useState } from 'react';

import { DESIGN_LEADING_12 } from '../panels/rowGeometry.js';

/** Sized to sit exactly where the row's 12px label does. */
const RENAME_INPUT_STYLE: React.CSSProperties = {
  flex: '1 1 0',
  minWidth: 0,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  padding: 0,
  margin: 0,
  color: 'var(--color-text-primary)',
  font: 'inherit',
  fontSize: 'var(--font-size-sm)',
  lineHeight: DESIGN_LEADING_12,
  caretColor: 'var(--color-text-primary)',
};

/** Enter commits the draft, Escape abandons it, and every other key belongs to the caret. */
export function renameFieldAction(key: string): 'commit' | 'cancel' | null {
  if (key === 'Enter') return 'commit';
  if (key === 'Escape') return 'cancel';
  return null;
}

export interface RenameFieldProps {
  label: string;
  name: string;
  testId: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}

/**
 * The panel's inline rename field, shared by the Designs rows and the Pages
 * rows. A NATIVE input because the library's `TextInput` brings its own border,
 * background and 28px control height, taller than the 23px row it sits in.
 *
 * Mounted only while its row is renaming, so `useState(name)` seeds the draft
 * fresh at every edit. Blur ABANDONS rather than commits — committing on blur
 * renames on a stray click elsewhere.
 */
export function RenameField({
  label,
  name,
  testId,
  onCommit,
  onCancel,
}: RenameFieldProps): React.JSX.Element {
  const [draft, setDraft] = useState(name);
  return (
    <input
      aria-label={label}
      value={draft}
      autoFocus
      // The whole name pre-selected: typing replaces, arrows refine.
      onFocus={(event) => {
        event.currentTarget.select();
      }}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onKeyDown={(event) => {
        const action = renameFieldAction(event.key);
        if (action === 'commit') onCommit(draft);
        if (action === 'cancel') onCancel();
      }}
      onBlur={onCancel}
      data-testid={testId}
      style={RENAME_INPUT_STYLE}
    />
  );
}
