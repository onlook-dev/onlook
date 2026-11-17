import { describe, expect, it } from 'bun:test';
import { APP_COMMAND_ORDER, type AppCommand } from '@studio/events';

import { en } from '@studio/i18n/strings';
import type { HelpMenuItem } from '../rail/helpMenu.js';
import { appMenuSections, type AppMenuItem, type AppMenuSection, type AppMenuSubmenu } from './appMenuSections.js';

const HELP: readonly HelpMenuItem[] = [
  { action: 'docs', label: 'account.docs' },
  { action: 'shortcuts', label: 'rail.help.shortcuts' },
  { action: 'tour', label: 'rail.help.tour' },
];

const ALL = APP_COMMAND_ORDER;

const commandsOf = (entries: readonly (AppMenuItem | AppMenuSubmenu)[]): AppCommand[] =>
  entries.flatMap((entry) => (entry.kind === 'command' ? [entry.command] : []));

const submenu = (sections: AppMenuSection[], id: 'view' | 'help'): AppMenuSubmenu | undefined =>
  sections.flat().find((entry): entry is AppMenuSubmenu => entry.kind === 'submenu' && entry.id === id);

describe('appMenuSections', () => {
  it('draws every offered command once, top level or under View', () => {
    const sections = appMenuSections(ALL, HELP, true);
    const drawn = [...commandsOf(sections.flat()), ...commandsOf(submenu(sections, 'view')!.groups.flat())];
    expect([...drawn].sort()).toEqual([...ALL].sort());
  });

  it('leaves out what main does not offer, and a section left empty draws no rule', () => {
    const sections = appMenuSections(ALL.filter((command) => command !== 'reset-studio' && command !== 'quit'), HELP, true);
    expect(commandsOf(sections.flat())).not.toContain('reset-studio');
    expect(sections.every((section) => section.length > 0)).toBe(true);
    expect(sections).toHaveLength(4);
  });

  it('spells Exit and the zoom labels without the chord the OS menu carries in them', () => {
    const sections = appMenuSections(ALL, HELP, true);
    const label = (command: AppCommand): string | undefined =>
      [...sections.flat(), ...submenu(sections, 'view')!.groups.flat()].find((entry) => entry.kind === 'command' && entry.command === command)?.label;
    expect(en[label('quit') as keyof typeof en]).toBe('Exit');
    expect(en[label('zoom-to-fit') as keyof typeof en]).not.toContain('Shift');
  });

  it('sets Full Screen apart from the zoom rows under View', () => {
    const view = submenu(appMenuSections(ALL, HELP, true), 'view')!.groups.map(commandsOf);
    expect(view.at(-1)).toEqual(['full-screen']);
    expect(view.flat().filter((command) => command === 'full-screen')).toHaveLength(1);
  });

  it('greys the Help rows that open in the rails when the active tab has none', () => {
    const disabled = (hasRails: boolean): string[] =>
      submenu(appMenuSections(ALL, HELP, hasRails), 'help')!.groups.flat().flatMap((item) => (item.kind === 'help' && item.isDisabled ? [item.action] : []));
    expect(disabled(true)).toEqual([]);
    expect(disabled(false)).toEqual(['shortcuts', 'tour']);
  });
});
