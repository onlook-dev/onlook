import { TAB_SHORTCUTS, type TabCommand, type TabSummary } from '@studio/events';
import type { Input } from 'electron';
import { isMac } from '../env/platform.js';

export function tabCommandForInput(
  input: Pick<Input, 'type' | 'key' | 'meta' | 'control' | 'alt' | 'shift' | 'isAutoRepeat'>,
  mac = isMac(),
): TabCommand | null {
  if (input.type !== 'keyDown' || input.isAutoRepeat || input.alt) return null;
  const key = input.key.toLowerCase();
  const shift = input.shift ? 'shift+' : '';
  const combo = key === 'tab' && input.control && !input.meta
    ? `ctrl+${shift}tab`
    : (mac ? input.meta && !input.control : input.control && !input.meta)
      ? `mod+${shift}${key}`
      : undefined;
  return TAB_SHORTCUTS.find((shortcut) => shortcut.keys === combo)?.command ?? null;
}

export function tabTarget(
  tabs: readonly Pick<TabSummary, 'id' | 'purpose'>[],
  activeId: string | undefined,
  command: Extract<TabCommand, { kind: 'jump' | 'cycle' }>,
): string | undefined {
  const projects = tabs.filter((tab) => tab.purpose === 'project');
  const index = command.kind === 'jump'
    ? command.number - 1
    : (projects.findIndex((tab) => tab.id === activeId) + 1) % projects.length;
  return projects[index]?.id;
}
