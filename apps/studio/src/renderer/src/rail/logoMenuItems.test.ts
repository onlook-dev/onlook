import { describe, expect, it } from 'bun:test';
import { APP_COMMANDS, APP_COMMAND_ORDER, type AppCommand } from '@studio/events';
import { en } from '@studio/i18n/strings';
import { logoMenuGroups } from './logoMenuItems.js';

const ALL = APP_COMMAND_ORDER;
const APP_MENU_ONLY: readonly AppCommand[] = ['about', 'full-screen', 'task-manager'];
const LOGO = ALL.filter((command) => !APP_MENU_ONLY.includes(command));

function commandsIn(groups: ReturnType<typeof logoMenuGroups>): AppCommand[] {
  return groups.flatMap((group) => group.items.map((item) => item.command));
}

describe('what the logo menu offers', () => {
  it('draws every command the host reports, once each, but the app menu\'s own About, Full Screen and Task Manager', () => {
    expect(commandsIn(logoMenuGroups(ALL)).sort()).toEqual(LOGO.sort());
  });

  it('leaves out Reset Studio when the host does not report it', () => {
    const without = ALL.filter((command) => command !== 'reset-studio');
    expect(commandsIn(logoMenuGroups(without))).not.toContain('reset-studio');
    expect(commandsIn(logoMenuGroups(without)).sort()).toEqual(LOGO.filter((command) => command !== 'reset-studio').sort());
  });

  it('drops a group with nothing left in it rather than drawing an empty submenu', () => {
    const studioOnly = ALL.filter((command) => APP_COMMANDS[command].group === 'studio');
    expect(logoMenuGroups(studioOnly).map((group) => group.id)).toEqual(['studio']);
  });
});

describe('the order the logo menu draws (ONL-2563)', () => {
  it('opens on Settings and Check for Updates, and ends on Reset and Quit', () => {
    const groups = logoMenuGroups(ALL);
    expect(groups.map((group) => group.id)).toEqual(['studio', 'file', 'edit', 'view', 'exit']);
    expect(groups[0]?.items.map((item) => item.command)).toEqual([
      'settings',
      'check-for-updates',
    ]);
    expect(groups.at(-1)?.items.map((item) => item.command)).toEqual(['reset-studio', 'quit']);
  });

  it('rules off the submenus and the two that end the app, and nothing between the submenus', () => {
    const ruled = logoMenuGroups(ALL)
      .filter((group) => group.hasRuleAbove)
      .map((group) => group.id);
    expect(ruled).toEqual(['file', 'exit']);
  });

  /* A rule at the menu's top edge has nothing above it to separate, so the
     descriptor's flag is not the whole answer. */
  it('draws no rule above the first group it draws, whatever the descriptor says', () => {
    const fileOnly = ALL.filter((command) => APP_COMMANDS[command].group === 'file');
    expect(logoMenuGroups(fileOnly).map((group) => group.hasRuleAbove)).toEqual([false]);
  });

  it('keeps the rule above Quit when the host does not offer Reset Studio', () => {
    const groups = logoMenuGroups(ALL.filter((command) => command !== 'reset-studio'));
    const exit = groups.find((group) => group.id === 'exit');
    expect(exit?.items.map((item) => item.command)).toEqual(['quit']);
    expect(exit?.hasRuleAbove).toBe(true);
  });
});

describe('the accelerators the logo menu shows', () => {
  const keysFor = (command: AppCommand): string | undefined =>
    logoMenuGroups(ALL)
      .flatMap((group) => group.items)
      .find((item) => item.command === command)?.keys;

  it('shows the two the OS menu shows, and leaves the submenu items to it', () => {
    expect(keysFor('settings')).toBe('mod+,');
    expect(keysFor('quit')).toBe('mod+q');
    expect(keysFor('undo')).toBeUndefined();
    expect(keysFor('close-tab')).toBeUndefined();
  });
});

describe('the descriptor the menu and the application menu share', () => {
  /* The union in `@studio/events` is hand-written, because that package cannot
     import the catalog. This is the only thing that holds the two together. */
  it('names a catalog key for every command, never a sentence of its own', () => {
    for (const command of ALL) {
      expect(Object.hasOwn(en, APP_COMMANDS[command].labelKey)).toBe(true);
    }
  });

  it('names a catalog key for every submenu it opens', () => {
    for (const group of logoMenuGroups(ALL)) {
      if (group.labelKey === undefined) continue;
      expect(Object.hasOwn(en, group.labelKey)).toBe(true);
    }
  });
});

describe('the logo menu on Windows (ONL-3127)', () => {
  const items = (style: 'mac' | 'windows') => logoMenuGroups(ALL, style).flatMap((group) => group.items);
  const find = (style: 'mac' | 'windows', command: AppCommand) => items(style).find((item) => item.command === command);

  it('names quitting Exit, with no key beside it', () => {
    expect(find('windows', 'quit')).toEqual({ command: 'quit', label: 'menu.exit' });
  });

  it('drops the chord from the zoom labels, which the OS menu needed', () => {
    expect(find('windows', 'zoom-to-fit')?.label).toBe('menu.app.zoomToFit');
    expect(find('windows', 'zoom-to-selection')?.label).toBe('menu.app.zoomToSelection');
  });

  it('draws the same commands in the same order as on the Mac', () => {
    expect(items('windows').map((item) => item.command)).toEqual(items('mac').map((item) => item.command));
  });

  it('leaves the Mac menu as it was', () => {
    expect(logoMenuGroups(ALL, 'mac')).toEqual(logoMenuGroups(ALL));
    expect(find('mac', 'quit')).toEqual({ command: 'quit', label: 'menu.quit', keys: 'mod+q' });
  });
});
