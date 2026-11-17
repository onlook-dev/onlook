import type { LayerPlacement } from '@astryxdesign/core/Layer';
import type { HelpAction } from '@studio/events';

import { MenuRow } from '../menu/composerMenuRow.js';
import { t } from '@studio/i18n';
import { openReport } from '../report/store.js';
import { openTipsOnKeys } from '../tips/store.js';
import { openTour } from '../tour/store.js';
import { helpMenuItems, ONLOOK_DOCS_URL } from './helpMenu.js';
import { useRailMenu, type RailMenu } from './useRailMenu.js';

/** `menu` is the Windows app menu's Help, which main forwards to the active tab (ONL-3127). */
export function chooseHelp(action: HelpAction, entryPoint: 'rail' | 'menu' = 'rail'): void {
  if (action === 'docs') window.open(ONLOOK_DOCS_URL, '_blank', 'noopener');
  else if (action === 'reportIssue') openReport(entryPoint, 'bug');
  else if (action === 'requestFeature') openReport(entryPoint, 'feature');
  else if (action === 'tour') openTour('help');
  else openTipsOnKeys('help');
}

/** Help's menu, which the rail's foot and the canvas's floating control both open. */
export function useHelpMenu(placement: LayerPlacement): RailMenu & { rows: React.ReactNode } {
  const menu = useRailMenu({ label: t('rail.help'), testId: 'help-menu', placement });
  return {
    ...menu,
    rows: helpMenuItems().map((item) => (
      <MenuRow
        key={item.action}
        label={t(item.label)}
        isSelected={false}
        testId="help-menu-item"
        value={item.action}
        onClick={() => {
          menu.hide();
          chooseHelp(item.action);
        }}
      />
    )),
  };
}
