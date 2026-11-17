import { Icon, type IconType } from '@astryxdesign/core/Icon';
import { Item } from '@astryxdesign/core/Item';
import { CheckIcon, ForwardIcon } from '../icons/glyphs.js';
import { MenuKeyHint } from './surface.js';

export const MENU_ITEM_STYLE = { minWidth: 160 } as const;

/** Astryx's radius is a StyleX class, so naming the token is the only way these match the controls beside them. */
export const COMPOSER_TRIGGER_STYLE = {
  paddingInline: 'var(--spacing-2)',
  paddingBlock: 'var(--spacing-1)',
  borderRadius: 'var(--radius-element)',
  fontSize: 'var(--text-supporting-size)',
  fontWeight: 500,
  lineHeight: 'normal',
  minHeight: 0,
  minWidth: 0,
} as const;

export function MenuHeading({ label }: { label: string }): React.JSX.Element {
  return (
    <div
      // A `menuitem` role here puts a stop the user cannot activate on the arrow-key walk.
      role="presentation"
      style={{
        paddingInline: 'var(--spacing-2)',
        paddingBlockStart: 'var(--spacing-2)',
        paddingBlockEnd: 'var(--spacing-1)',
        color: 'var(--color-text-gray)',
        fontSize: 'var(--text-supporting-size)',
      }}
    >
      {label}
    </div>
  );
}

export function MenuRow({
  label,
  icon,
  isSelected,
  hasPopout,
  keys,
  onClick,
  style = MENU_ITEM_STYLE,
  testId,
  value,
  isDisabled = false,
}: {
  label: string;
  icon?: IconType;
  isSelected: boolean;
  hasPopout?: boolean;
  /** The row's accelerator, already in glyphs. */
  keys?: string;
  onClick: () => void;
  style?: React.CSSProperties;
  testId?: string;
  value?: string;
  isDisabled?: boolean;
}): React.JSX.Element {
  return (
    <Item
      as="div"
      role="menuitem"
      tabIndex={-1}
      label={label}
      isDisabled={isDisabled}
      {...(icon === undefined ? {} : { startContent: <Icon icon={icon} size="sm" color="inherit" /> })}
      // `Item`'s own `isSelected` paints the sidebar's selected pair; selection rides `data-selected`.
      className="composer-menu-item"
      data-testid={testId}
      data-value={value}
      data-selected={isSelected ? 'true' : undefined}
      aria-haspopup={hasPopout ? 'menu' : undefined}
      onClick={onClick}
      endContent={
        <>
          {keys !== undefined && <MenuKeyHint keys={keys} />}
          {isSelected && <Icon icon={CheckIcon} size="sm" color="inherit" />}
          {hasPopout && <Icon icon={ForwardIcon} size="sm" color="inherit" />}
        </>
      }
      style={style}
    />
  );
}
