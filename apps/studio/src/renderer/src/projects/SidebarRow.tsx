import { HStack } from '@astryxdesign/core/HStack';
import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { useState } from 'react';
import { t } from '@studio/i18n';
import { GlyphLoadingCircle, MoreIcon } from '../icons/glyphs.js';
import { RenameField } from '../RenameField.js';

/* The row is a CONTAINER, not a button: it holds two independent controls, and
   a `<button>` inside a `<button>` is invalid. */

const ROW_PAD = 0;
/** Every row of the left column stands this tall, the Add codebase button with them (ONL-3182). */
export const SIDEBAR_ROW_HEIGHT = 28;
const ROW_HEIGHT = SIDEBAR_ROW_HEIGHT;
const CHIP_BOX = 24;

/* The gap at the row's end matches the one it leaves above and below the chip; derived, so retuning either box carries it. */
const CHIP_END_GAP = (ROW_HEIGHT - CHIP_BOX) / 2;

const ROW = {
  minWidth: 0,
  /* The design's three nested radii per row (6 / 8 / 4) are auto-layout residue,
     not two intentions: only the box painting a fill is ever visible. */
  borderRadius: 'var(--radius-element)',
} as const;

/* The lead action's fill: the app's white accent with the ground as ink (ONL-2744). */
const ROW_PRIMARY = { background: 'var(--color-on-dark)', color: 'var(--color-background-body)' } as const;
const ROW_PRIMARY_HOVERED = { ...ROW_PRIMARY, opacity: 0.9 } as const;

const ROW_SELECTED = { background: 'var(--color-background-gray)' } as const;
/* NOT `--color-overlay-hover`: over this view's ground the heavier wash
   composites one value off the selected row, and the two stop being distinct. */
const ROW_HOVERED = { background: 'var(--color-tint-hover)' } as const;

/* Deliberately no `padding: 0` — an inline style beats the class Astryx's
   `padding*` props compile to, so a reset here silently zeroes every padding
   prop below it, with no error and no type complaint (ONL-1908). */
const BARE_CONTROL = {
  appearance: 'none',
  border: 'none',
  margin: 0,
  font: 'inherit',
  background: 'transparent',
  cursor: 'pointer',
} as const;

/* The min-height keeps a chipless row the same height as one with a chip. */
const SELECT = {
  ...BARE_CONTROL,
  minWidth: 0,
  flex: '1 1 auto',
  textAlign: 'left',
  minHeight: `${ROW_HEIGHT}px`,
} as const;

const LABEL = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

/* Keyed by `size` because the label follows that prop: a fixed tier here would
   shift a row on rename entry, the exact thing this constant exists to stop. */
const LABEL_FIELD_FONT = {
  base: { fontSize: 'var(--font-size-base)' },
  lg: { fontSize: 'var(--font-size-lg)' },
} as const;

const CHIP = {
  ...BARE_CONTROL,
  flex: '0 0 auto',
  marginInlineEnd: `${String(CHIP_END_GAP)}px`,
  background: 'transparent',
  borderRadius: 'var(--radius-element)',
} as const;

const CHIP_HOVERED = { background: 'var(--color-overlay-pressed)' } as const;

/* The glyph does not spin itself; the `frame-reload-turn` keyframe is shared. */
const BUSY_GLYPH = {
  display: 'flex',
  flex: '0 0 auto',
  animation: 'frame-reload-turn 900ms linear infinite',
} as const;

export interface SidebarRowProps {
  icon: IconType;
  label: string;
  weight?: 'normal' | 'medium';
  size?: 'base' | 'lg';
  isSelected?: boolean;
  isPrimary?: boolean;
  isBusy?: boolean;
  /** Staging only: the row tracks its own pointer, and `showMenu` with it. */
  isHovered?: boolean;
  showMenu?: boolean;
  onSelect?: () => void;
  onMenu?: (event: React.MouseEvent<HTMLElement>) => void;
  isRenaming?: boolean;
  onRenameCommit?: (name: string) => void;
  onRenameCancel?: () => void;
  onRename?: () => void;
}

export function SidebarRow({
  icon,
  label,
  weight = 'normal',
  size = 'base',
  isSelected = false,
  isPrimary = false,
  isBusy = false,
  isHovered = false,
  showMenu = false,
  onSelect,
  onMenu,
  isRenaming = false,
  onRenameCommit,
  onRenameCancel,
  onRename,
}: SidebarRowProps): React.JSX.Element {
  const [isPointerOver, setIsPointerOver] = useState(false);
  const [isChipPointerOver, setIsChipPointerOver] = useState(false);
  const hovered = isHovered || isPointerOver;

  const fill = isPrimary ? (hovered ? ROW_PRIMARY_HOVERED : ROW_PRIMARY) : isSelected ? ROW_SELECTED : hovered ? ROW_HOVERED : undefined;
  const ink = isPrimary ? 'inherit' : isSelected || hovered ? 'primary' : 'secondary';

  return (
    <HStack
      vAlign="center"
      gap={0.5}
      padding={ROW_PAD}
      style={{ ...ROW, ...fill }}
      onPointerEnter={() => setIsPointerOver(true)}
      onPointerLeave={() => {
        setIsPointerOver(false);
        setIsChipPointerOver(false);
      }}
      data-testid="sidebar-row"
      data-selected={isSelected || undefined}
      data-busy={isBusy || undefined}
    >
      {/* While renaming the label part stops being a button, so placing the
          caret in the field cannot switch the workspace. */}
      <Stack
        as={isRenaming ? 'div' : 'button'}
        direction="horizontal"
        vAlign="center"
        gap={2}
        paddingInline={2}
        onClick={isRenaming || isBusy ? undefined : onSelect}
        onDoubleClick={isRenaming || isBusy ? undefined : onRename}
        style={isRenaming || isBusy ? { ...SELECT, cursor: 'default' } : SELECT}
      >
        {isBusy ? (
          <Stack style={BUSY_GLYPH}>
            <GlyphLoadingCircle size={size === 'lg' ? 20 : 16} />
          </Stack>
        ) : (
          <Icon icon={icon} size={size === 'lg' ? 'md' : 'sm'} color={ink} />
        )}
        {isRenaming ? (
          <RenameField
            initialValue={label}
            label={t('projects.rename.workspaceField')}
            testId="workspace-rename-input"
            style={LABEL_FIELD_FONT[size]}
            {...(onRenameCommit ? { onCommit: onRenameCommit } : {})}
            {...(onRenameCancel ? { onCancel: onRenameCancel } : {})}
          />
        ) : (
          <Text size={size} weight={weight} color={ink} style={LABEL}>
            {label}
          </Text>
        )}
      </Stack>

      {onMenu && (showMenu || hovered) ? (
        <Stack
          as="button"
          aria-label={t('projects.workspace.menu')}
          data-testid="sidebar-row-menu"
          onClick={onMenu}
          onPointerEnter={() => setIsChipPointerOver(true)}
          onPointerLeave={() => setIsChipPointerOver(false)}
          align="center"
          justify="center"
          padding={1}
          style={{ ...CHIP, ...(isChipPointerOver ? CHIP_HOVERED : undefined) }}
        >
          <Icon icon={MoreIcon} size="sm" color={isChipPointerOver ? 'primary' : 'secondary'} />
        </Stack>
      ) : null}
    </HStack>
  );
}
