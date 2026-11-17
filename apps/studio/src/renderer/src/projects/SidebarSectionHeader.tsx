import { HStack } from '@astryxdesign/core/HStack';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { useState } from 'react';
import { ChevronDownIcon } from '../icons/glyphs.js';

/* The label is deliberately not a heading element: these label a list of
   controls in a panel, not document sections. */

/* A style rather than a `color` prop: `color="secondary"` is a step too bright
   and `Icon color="tertiary"` is a silent alias for secondary at core 0.1.9. */
const TERTIARY_INK = { color: 'var(--color-text-disabled)' } as const;
/* Halfway between disabled (#606060) and gray (#929292). */
const HEADER_INK = {
  color: 'color-mix(in srgb, var(--color-text-disabled), var(--color-text-gray))',
} as const;

const ACTION = {
  appearance: 'none',
  border: 'none',
  margin: 0,
  font: 'inherit',
  background: 'transparent',
  cursor: 'pointer',
  flex: '0 0 auto',
  borderRadius: 'var(--radius-element)',
} as const;

const ACTION_HOVERED = { background: 'var(--color-overlay-pressed)' } as const;

const ACTION_INK_HOVERED = { color: 'var(--color-icon-primary)' } as const;

/* Deliberately a touch over the `⋯`'s `sm` one row below, so the folder does not
   look shrunken beside three dots. */
const ACTION_GLYPH = { width: '18px', height: '18px' } as const;

/* Hidden by visibility, not by unmounting (which reflows the header under the
   pointer) and not by opacity alone (which leaves them in the tab order). */
const REVEALED = { visibility: 'visible', opacity: 1 } as const;

const CONCEALED = { visibility: 'hidden', opacity: 0 } as const;

const CARET = {
  display: 'flex',
  flex: '0 0 auto',
  transition: 'transform var(--duration-fast, 120ms) ease',
} as const;

const CARET_COLLAPSED = { ...CARET, transform: 'rotate(-90deg)' } as const;

const DISCLOSURE = {
  appearance: 'none',
  border: 'none',
  margin: 0,
  padding: 0,
  font: 'inherit',
  background: 'transparent',
  cursor: 'pointer',
  minWidth: 0,
} as const;

export interface SidebarSectionHeaderProps {
  label: string;
  actionIcon?: IconType;
  actionLabel?: string;
  onAction?: () => void;
  /** Draws the chevron only; the caller hides the section's rows. */
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarSectionHeader({
  label,
  actionIcon,
  actionLabel,
  onAction,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarSectionHeaderProps): React.JSX.Element {
  const [isActionHovered, setIsActionHovered] = useState(false);

  /* A collapsed section shows its chevron unhovered: it is the only thing
     saying the rows are hidden rather than absent, and the pointer has left. */
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const conceal = isHeaderHovered || isCollapsed ? REVEALED : CONCEALED;

  return (
    <HStack
      vAlign="center"
      justify="between"
      padding={0.5}
      onPointerEnter={() => setIsHeaderHovered(true)}
      onPointerLeave={() => {
        setIsHeaderHovered(false);
        setIsActionHovered(false);
      }}
      data-testid="sidebar-section-header"
    >
      <Stack
        as={onToggleCollapse ? 'button' : 'div'}
        direction="horizontal"
        vAlign="center"
        gap={1.5}
        {...(onToggleCollapse
          ? { onClick: onToggleCollapse, 'aria-expanded': !isCollapsed }
          : {})}
        style={DISCLOSURE}
      >
        <Text size="base" weight="normal" style={HEADER_INK}>
          {label}
        </Text>
        {onToggleCollapse ? (
          <Stack
            data-testid="sidebar-section-caret"
            style={{ ...(isCollapsed ? CARET_COLLAPSED : CARET), ...conceal }}
          >
            <Icon icon={ChevronDownIcon} size="md" style={TERTIARY_INK} />
          </Stack>
        ) : null}
      </Stack>
      {actionIcon && actionLabel ? (
        <Tooltip content={actionLabel} placement="above">
        <Stack
          as="button"
          aria-label={actionLabel}
          data-testid="sidebar-section-action"
          onClick={onAction}
          onPointerEnter={() => setIsActionHovered(true)}
          onPointerLeave={() => setIsActionHovered(false)}
          align="center"
          justify="center"
          padding={1}
          style={{
            ...ACTION,
            ...(isActionHovered ? ACTION_HOVERED : undefined),
          }}
        >
          <Icon
            icon={actionIcon}
            size="sm"
            style={{
              ...ACTION_GLYPH,
              ...(isActionHovered ? ACTION_INK_HOVERED : TERTIARY_INK),
            }}
          />
        </Stack>
        </Tooltip>
      ) : null}
    </HStack>
  );
}
