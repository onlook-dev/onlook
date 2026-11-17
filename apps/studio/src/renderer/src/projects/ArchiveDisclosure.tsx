import { useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { ChevronDownIcon } from '../icons/glyphs.js';

const BUTTON = {
  appearance: 'none',
  border: 'none',
  margin: 0,
  padding: 0,
  font: 'inherit',
  background: 'transparent',
  cursor: 'pointer',
  alignSelf: 'flex-start',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--spacing-1)',
} as const;

const INK = { color: 'var(--color-text-gray)' } as const;

/* Without `flex: 0 0 auto` the glyph shrinks to ~12px of its 20px box beside a
   long label and reads as absent, looking like a colour bug. */
const CARET = {
  display: 'flex',
  flex: '0 0 auto',
  transition: 'transform var(--duration-fast, 120ms) ease',
} as const;

const CARET_OPEN = { ...CARET, transform: 'rotate(180deg)' } as const;

const CARET_HIDDEN = { ...CARET, visibility: 'hidden' } as const;

function caretStyle(isOpen: boolean, isHovered: boolean): React.CSSProperties {
  if (isOpen) return CARET_OPEN;
  return isHovered ? CARET : CARET_HIDDEN;
}

export interface ArchiveDisclosureProps {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function ArchiveDisclosure({
  label,
  isOpen,
  onToggle,
}: ArchiveDisclosureProps): React.JSX.Element {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      aria-expanded={isOpen}
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={BUTTON}
      data-testid="archived-projects-toggle"
    >
      <Text size="base" weight="medium" style={INK}>
        {label}
      </Text>
      {/* The `Stack` wrapper with the ink as `style` is what paints this glyph:
          a raw `<span>` + `color` prop did not, with nothing hiding it. */}
      <Stack style={caretStyle(isOpen, isHovered)}>
        <Icon icon={ChevronDownIcon} size="md" style={INK} />
      </Stack>
    </button>
  );
}
