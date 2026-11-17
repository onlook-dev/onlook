import { ContextMenu } from '@astryxdesign/core/ContextMenu';
import { DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';

import { t } from '@studio/i18n';
import { MENU_SURFACE } from '../menu/surface.js';

export interface PageRowMenuProps {
  /** False on the last page, which a project keeps (ONL-2488). */
  canDelete: boolean;
  onRename: () => void;
  onDelete: () => void;
  /** The right-click target. */
  children: React.ReactNode;
}

/** Opens on a divider row too: the only route back from a mistyped `---` (ONL-2488). */
export function PageRowMenu({
  canDelete,
  onRename,
  onDelete,
  children,
}: PageRowMenuProps): React.JSX.Element {
  return (
    <ContextMenu
      label={t('sidebar.pages.menu.label')}
      menuContent={
        <>
          <DropdownMenuItem label={t('sidebar.pages.menu.rename')} onClick={onRename} />
          {canDelete ? (
            <DropdownMenuItem label={t('sidebar.pages.menu.delete')} onClick={onDelete} />
          ) : null}
        </>
      }
      menuWidth={200}
      style={MENU_SURFACE}
      data-testid="sidebar-page-menu"
    >
      {children}
    </ContextMenu>
  );
}
