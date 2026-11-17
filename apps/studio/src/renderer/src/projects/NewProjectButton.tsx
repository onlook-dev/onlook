import { Button } from '@astryxdesign/core/Button';
import { ButtonGroup } from '@astryxdesign/core/ButtonGroup';
import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Icon } from '@astryxdesign/core/Icon';
import { t } from '@studio/i18n';
import { ChevronDownIcon, PlusLargeIcon } from '../icons/glyphs.js';
import { MENU_SURFACE } from '../menu/surface.js';

/* The accent re-pointed on the element rather than a custom variant: `Button`'s
   variant map is hardcoded, so an unknown name gets no states at all. */
const WHITE_FILL = {
  '--color-accent': 'var(--color-background-inverted)',
  borderColor: 'transparent',
} as React.CSSProperties;

/** One button with a faint seam, like the git pill's: the group's own border would split it in two (ONL-2593). */
const MENU_SEAM = {
  ...WHITE_FILL,
  backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.22), rgba(0, 0, 0, 0.22))',
  backgroundRepeat: 'no-repeat',
  // Drawn from the border's edge, not inside the transparent border, so it meets New Project's hover with no gap.
  backgroundOrigin: 'border-box',
  backgroundPosition: 'left center',
  backgroundSize: '1px 55%',
} as React.CSSProperties;

export interface NewProjectButtonProps {
  onPress?: () => void;
  /** The menu's one entry. Absent, no menu trigger. */
  onImportExisting?: () => void;
}

// Both arms or neither: hiding one left the other as a lone end-cap that reads as a broken control (ONL-2522).
export function NewProjectButton({
  onPress,
  onImportExisting,
}: NewProjectButtonProps): React.JSX.Element {
  const create = (
    <Button
      variant="primary"
      size="md"
      label={t('projects.newProject')}
      icon={<Icon icon={PlusLargeIcon} size="sm" />}
      onClick={onPress}
      style={WHITE_FILL}
      data-testid="new-project"
    />
  );

  if (onImportExisting === undefined) return create;

  return (
    <ButtonGroup label={t('projects.newProject.group')} size="md">
      {create}
      <DropdownMenu
        hasChevron={false}
        placement="below"
        menuWidth={240}
        style={MENU_SURFACE}
        data-testid="new-project-menu"
        button={{
          label: t('projects.newProject.menu'),
          variant: 'primary',
          size: 'md',
          isIconOnly: true,
          style: MENU_SEAM,
          icon: <Icon icon={ChevronDownIcon} size="sm" />,
        }}
      >
        <DropdownMenuItem label={t('projects.menu.importExisting')} onClick={onImportExisting} />
      </DropdownMenu>
    </ButtonGroup>
  );
}
