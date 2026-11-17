import {
  APP_COMMANDS,
  APP_COMMAND_GROUPS,
  APP_COMMAND_ORDER,
  type AppCommand,
  type AppCommandEntry,
  type AppCommandGroup,
  type AppCommandGroupDescriptor,
} from '@studio/events';

import type { StringKey } from '@studio/i18n';

export interface LogoMenuItem {
  command: AppCommand;
  label: StringKey;
  /** The accelerator drawn beside the row, in `Kbd` notation. */
  keys?: string;
}

export interface LogoMenuGroup {
  id: AppCommandGroup;
  /** Absent on the group drawn at the menu's top level rather than as a submenu. */
  labelKey?: AppCommandGroupDescriptor['labelKey'];
  /** A rule is drawn above it. False on the first group drawn, whatever the descriptor says: a rule at the menu's top edge has nothing above it to separate. */
  hasRuleAbove: boolean;
  items: LogoMenuItem[];
}

/** `windows` takes the app menu's words, and its keys only where the app menu draws one: Exit has none there. */
export type LogoMenuStyle = 'mac' | 'windows';

/** `available` is main's answer, not a guess here: whether Reset Studio exists is a fact only the host holds (`main/reset/`). */
export function logoMenuGroups(available: readonly AppCommand[], style: LogoMenuStyle = 'mac'): LogoMenuGroup[] {
  const offered = new Set(available);
  const drawn: LogoMenuGroup[] = [];
  for (const group of APP_COMMAND_GROUPS) {
    const items: LogoMenuItem[] = [];
    for (const command of APP_COMMAND_ORDER) {
      // Annotated, not inferred: `as const` keeps each entry's own literal shape, where an absent `keys` is absent from the type rather than optional.
      const entry: AppCommandEntry = APP_COMMANDS[command];
      if (!offered.has(command) || entry.group !== group.id || entry.isAppMenuOnly === true) continue;
      const isWindows = style === 'windows';
      const keys = isWindows && entry.appMenu.keys === undefined ? undefined : entry.keys;
      items.push({
        command,
        label: (isWindows ? (entry.appMenu.labelKey ?? entry.labelKey) : entry.labelKey) satisfies StringKey,
        ...(keys === undefined ? {} : { keys }),
      });
    }
    if (items.length === 0) continue;
    drawn.push({
      id: group.id,
      ...(group.labelKey === undefined ? {} : { labelKey: group.labelKey }),
      hasRuleAbove: group.hasRuleAbove === true && drawn.length > 0,
      items,
    });
  }
  return drawn;
}
