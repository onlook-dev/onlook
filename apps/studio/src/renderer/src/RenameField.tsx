import { useState } from 'react';

/* A native input, not Astryx `TextInput`: the surrounding name slot IS the field
   container, and the library control paints a second bordered field inside it. */

const FIELD: React.CSSProperties = {
  width: '100%',
  minWidth: 0,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  padding: 0,
  margin: 0,
  fontFamily: 'var(--font-family-body)',
  fontWeight: 'var(--font-weight-normal)',
  color: 'var(--color-text-primary)',
  caretColor: 'var(--color-text-primary)',
};

export interface RenameFieldProps {
  initialValue: string;
  label: string;
  testId: string;
  style?: React.CSSProperties;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  /** Fires only for a non-empty trimmed name committed with Enter. */
  onCommit?: (name: string) => void;
  /** Escape, blur, or an empty commit — the edit closes with no write. */
  onCancel?: () => void;
}

export function RenameField({
  initialValue,
  label,
  testId,
  style,
  onKeyDown,
  onCommit,
  onCancel,
}: RenameFieldProps): React.JSX.Element {
  const [draft, setDraft] = useState(initialValue);

  return (
    <input
      aria-label={label}
      value={draft}
      autoFocus
      onFocus={(event) => {
        event.currentTarget.select();
      }}
      style={style ? { ...FIELD, ...style } : FIELD}
      data-testid={testId}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === 'Enter') {
          const name = draft.trim();
          if (name.length > 0) onCommit?.(name);
          else onCancel?.();
        }
        if (event.key === 'Escape') onCancel?.();
      }}
      onBlur={() => {
        onCancel?.();
      }}
      // The slot sits inside click targets that open things — placing the caret
      // must not activate an ancestor.
      onClick={(event) => {
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    />
  );
}
