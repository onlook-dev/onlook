import {
  APP_COMMANDS,
  APP_COMMAND_ORDER,
  APP_MENU,
  type AppCommand,
  type AppCommandEntry,
  type HelpAction,
} from '@studio/events';

import type { StringKey } from '@studio/i18n';
import type { HelpMenuItem } from '../rail/helpMenu.js';

export type AppMenuItem =
  | { kind: 'command'; command: AppCommand; label: StringKey; keys?: string }
  | { kind: 'help'; action: HelpAction; label: StringKey; isDisabled: boolean };

export interface AppMenuSubmenu {
  kind: 'submenu';
  id: 'view' | 'help';
  label: StringKey;
  groups: AppMenuItem[][];
}

export type AppMenuSection = (AppMenuItem | AppMenuSubmenu)[];

/** Help rows whose surface lives in the tab's rails; a tab without them has nowhere to open one. */
const NEEDS_RAILS: ReadonlySet<HelpAction> = new Set(['shortcuts', 'tour']);

function commandItem(command: AppCommand): AppMenuItem {
  const entry: AppCommandEntry = APP_COMMANDS[command];
  const keys = entry.appMenu.keys;
  return {
    kind: 'command',
    command,
    label: entry.appMenu.labelKey ?? entry.labelKey,
    ...(keys === undefined ? {} : { keys }),
  };
}

function viewGroups(offered: ReadonlySet<AppCommand>): AppMenuItem[][] {
  const view = APP_COMMAND_ORDER.filter((command) => offered.has(command) && APP_COMMANDS[command].group === 'view');
  return [view.filter((command) => command !== 'full-screen').map(commandItem), view.filter((command) => command === 'full-screen').map(commandItem)];
}

/** `available` is main's answer; `help` the rail's rows; `hasRails` whether the active tab can host the rows that open in its rails. */
export function appMenuSections(
  available: readonly AppCommand[],
  help: readonly HelpMenuItem[],
  hasRails: boolean,
): AppMenuSection[] {
  const offered = new Set(available);
  const sections: AppMenuSection[] = [];
  for (const rows of APP_MENU) {
    const section: AppMenuSection = [];
    for (const row of rows) {
      if (typeof row === 'string') {
        if (offered.has(row)) section.push(commandItem(row));
        continue;
      }
      const groups: AppMenuItem[][] = (row.submenu === 'view'
        ? viewGroups(offered)
        : [help.map((item): AppMenuItem => ({ kind: 'help', action: item.action, label: item.label, isDisabled: !hasRails && NEEDS_RAILS.has(item.action) }))]
      ).filter((group) => group.length > 0);
      if (groups.length > 0) section.push({ kind: 'submenu', id: row.submenu, label: row.submenu === 'view' ? 'menu.view' : 'menu.help', groups });
    }
    if (section.length > 0) sections.push(section);
  }
  return sections;
}
