import { useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { CloseIcon } from '../icons/glyphs.js';

export function RemovableGlyphButton({
  label,
  restingGlyph,
  onActivate,
  testId,
}: {
  label: string;
  restingGlyph: React.ComponentProps<typeof Icon>['icon'];
  onActivate: () => void;
  testId: string;
}): React.JSX.Element {
  const [isRemoveActive, setRemoveActive] = useState(false);

  return (
    <IconButton
      label={label}
      icon={
        <Icon
          icon={isRemoveActive ? CloseIcon : restingGlyph}
          size="xsm"
          color="inherit"
        />
      }
      variant="ghost"
      size="sm"
      // No focus on press: in the inline bubble it would leave the editable, and the canvas clipboard seat stops yielding to it (ONL-2549).
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onActivate}
      onMouseEnter={() => setRemoveActive(true)}
      onMouseLeave={() => setRemoveActive(false)}
      onFocus={() => setRemoveActive(true)}
      onBlur={() => setRemoveActive(false)}
      style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)', minWidth: 'var(--spacing-4)', padding: 0 }}
      data-testid={testId}
    />
  );
}
