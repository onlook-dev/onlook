import { Divider } from '@astryxdesign/core/Divider';
import { DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { Kbd } from '@astryxdesign/core/Kbd';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { t } from '@studio/i18n';
import { MENU_DIVIDER } from '../menu/surface.js';

// On the label node: `Item`'s label span has its own colour rule, which wins over a colour set on the item.
const DESTRUCTIVE = { color: 'var(--color-error)' } as const;

export interface ProjectMenuProps {
  onRename?: () => void;
  onDuplicate?: () => void;
  copyLimitReached?: boolean | null;
  isCopyLimitTooltipOpen?: boolean;
  onReveal?: () => void;
  onArchive?: () => void;
  onRemove?: () => void;
  isArchived?: boolean;
  isMissing?: boolean;
}

export function ProjectMenuItems({
  onRename,
  onDuplicate,
  copyLimitReached = false,
  isCopyLimitTooltipOpen,
  onReveal,
  onArchive,
  onRemove,
  isArchived = false,
  isMissing = false,
}: ProjectMenuProps): React.JSX.Element {
  return (
    <>
      <DropdownMenuItem
        label={t('projects.menu.rename')}
        endContent={<Kbd keys="Enter" />}
        onClick={onRename}
      />
      {copyLimitReached ? (
        <Tooltip content={t('projects.menu.copyLimit')} placement="end" isOpen={isCopyLimitTooltipOpen}>
          <span title={t('projects.menu.copyLimit')} style={{ display: 'block' }}>
            <DropdownMenuItem label={t('projects.menu.duplicate')} onClick={onDuplicate} isDisabled />
          </span>
        </Tooltip>
      ) : (
        <DropdownMenuItem
          label={t('projects.menu.duplicate')}
          onClick={onDuplicate}
          isDisabled={isMissing || copyLimitReached === null}
        />
      )}
      <Divider isFullBleed style={MENU_DIVIDER} />
      <DropdownMenuItem
        label={t('projects.menu.reveal')}
        onClick={onReveal}
        isDisabled={isMissing}
      />
      <Divider isFullBleed style={MENU_DIVIDER} />
      <DropdownMenuItem
        label={t(isArchived ? 'projects.menu.restore' : 'projects.menu.archive')}
        onClick={onArchive}
      />
      {/* Live on a missing card: a project whose folder is gone is the one most in need of it. */}
      <DropdownMenuItem
        label={<Text style={DESTRUCTIVE}>{t('projects.menu.remove')}</Text>}
        onClick={onRemove}
      />
    </>
  );
}

export interface WorkspaceMenuProps {
  onNewProject?: () => void;
  onRename?: () => void;
  onArchive?: () => void;
  onRemove?: () => void;
  isArchived?: boolean;
}

export function WorkspaceMenuItems({
  onNewProject,
  onRename,
  onArchive,
  onRemove,
  isArchived = false,
}: WorkspaceMenuProps): React.JSX.Element {
  return (
    <>
      <DropdownMenuItem label={t('projects.newProject')} onClick={onNewProject} />
      <DropdownMenuItem label={t('projects.menu.renameWorkspace')} onClick={onRename} />
      <Divider isFullBleed style={MENU_DIVIDER} />
      <DropdownMenuItem
        label={t(isArchived ? 'projects.menu.restore' : 'projects.menu.archive')}
        onClick={onArchive}
      />
      <DropdownMenuItem
        label={<Text style={DESTRUCTIVE}>{t('projects.menu.removeWorkspace')}</Text>}
        onClick={onRemove}
      />
    </>
  );
}
