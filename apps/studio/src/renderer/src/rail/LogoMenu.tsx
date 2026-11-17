import { useEffect, useState } from 'react';
import { Divider } from '@astryxdesign/core/Divider';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import type { AppCommand } from '@studio/events';
import { RAIL_CONTROL } from './Rail.js';

import { MenuRow } from '../menu/composerMenuRow.js';
import { t } from '@studio/i18n';
import { OnlookMark } from '../icons/OnlookMark.js';
import { Submenu } from '../menu/Submenu.js';
import { MENU_DIVIDER } from '../menu/surface.js';
import { ignoreRefusal } from '../refusal.js';
import { comboText } from '../shortcuts/combo.js';
import { logoMenuGroups, type LogoMenuGroup, type LogoMenuItem } from './logoMenuItems.js';
import { useRailMenu } from './useRailMenu.js';
import { studio } from '../bridge.js';


/** Main's answer, read once: whether Reset Studio exists is a fact only the host holds. */
function useOfferedCommands(): readonly AppCommand[] {
  const [offered, setOffered] = useState<readonly AppCommand[]>([]);
  useEffect(() => {
    let isActive = true;
    studio()
      .appCommands()
      .then((commands) => {
        if (isActive) setOffered(commands);
      })
      .catch(ignoreRefusal('rail', 'app commands'));
    return () => {
      isActive = false;
    };
  }, []);
  return offered;
}

const keyStyle = (): 'mac' | 'windows' => (studio().windowControls === 'trailing' ? 'windows' : 'mac');

function Row({ item, onChosen }: { item: LogoMenuItem; onChosen: () => void }): React.JSX.Element {
  return (
    <MenuRow
      label={t(item.label)}
      isSelected={false}
      {...(item.keys === undefined ? {} : { keys: comboText(item.keys, keyStyle()) })}
      testId="rail-logo-menu-item"
      value={item.command}
      onClick={() => {
        onChosen();
        studio().runAppCommand({ command: item.command });
      }}
    />
  );
}

function Group({
  group,
  isOpen,
  onChosen,
}: {
  group: LogoMenuGroup;
  isOpen: boolean;
  onChosen: () => void;
}): React.JSX.Element {
  const rule = group.hasRuleAbove ? (
    <Divider isFullBleed style={MENU_DIVIDER} data-testid="rail-logo-menu-rule" />
  ) : null;
  if (group.labelKey === undefined) {
    return (
      <>
        {rule}
        {group.items.map((item) => (
          <Row key={item.command} item={item} onChosen={onChosen} />
        ))}
      </>
    );
  }
  const label = t(group.labelKey);
  return (
    <>
      {rule}
      <Submenu
        label={label}
        isParentOpen={isOpen}
        row={<MenuRow label={label} isSelected={false} hasPopout onClick={() => undefined} />}
      >
        {group.items.map((item) => (
          <Row key={item.command} item={item} onChosen={onChosen} />
        ))}
      </Submenu>
    </>
  );
}

/** The Onlook mark, and the application menu's own commands behind it. Every item asks main to run the dispatch `main/menu/index.ts` uses, so the two cannot drift (ONL-2563). */
/** The selected rail toggle's fill and ink, worn while the menu is open (ONL-2593). */
const OPEN = { background: 'var(--color-background-gray)', color: 'var(--color-icon-primary)' } as const;

export function LogoMenu(): React.JSX.Element {
  const offered = useOfferedCommands();
  const menu = useRailMenu({
    label: t('rail.logoMenu.label'),
    testId: 'rail-logo-menu',
    placement: 'end',
    hasSubmenus: true,
  });

  return (
    <>
      {/* The mock's own control, so the mark wears the hover, press and focus the items beside it do. */}
      <Tooltip content={t('rail.logoMenu.tooltip')} placement="end" isEnabled={!menu.isOpen}>
        <IconButton
          ref={menu.triggerRef}
          variant="ghost"
          size="lg"
          label={t('rail.mark')}
          icon={<OnlookMark />}
          style={menu.isOpen ? { ...RAIL_CONTROL, ...OPEN } : RAIL_CONTROL}
          aria-haspopup="menu"
          aria-expanded={menu.isOpen}
          data-testid="rail-mark"
          onClick={menu.toggle}
          onKeyDown={menu.onTriggerKeyDown}
        />
      </Tooltip>
      {menu.render(
        logoMenuGroups(offered, keyStyle()).map((group) => (
          <Group key={group.id} group={group} isOpen={menu.isOpen} onChosen={menu.hide} />
        )),
      )}
    </>
  );
}
