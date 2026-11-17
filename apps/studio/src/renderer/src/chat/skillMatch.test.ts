import { describe, expect, test } from 'bun:test';
import type { AgentSkill } from '@studio/events';
import { matchSkills, promoteTypedSkill, resolveSkillMenuKey, type SkillMenuKeyState, type SkillMenuVerdict } from './skillMatch.js';

const claude = (name: string): AgentSkill => ({ name, description: `Run ${name}`, agent: 'claude' });

const catalog: readonly AgentSkill[] = [
  claude('brand-audit'),
  claude('brand-guidelines'),
  claude('button-states'),
  claude('accessibility-sweep'),
  claude('color-contrast'),
  claude('design-tokens'),
  claude('responsive-check'),
  claude('layout-grid'),
  { name: 'codex-only', description: 'Only on the other agent', agent: 'codex' },
];

const named = (query: string, agent: AgentSkill['agent'] = 'claude'): string[] =>
  matchSkills(query, agent, catalog).map((match) => match.skill.name);

describe('matchSkills', () => {
  test('a query narrows to the names carrying its characters in order', () => {
    expect(named('br')).toEqual(['brand-audit', 'brand-guidelines']);
  });

  test('characters match as a subsequence, not only as a substring', () => {
    expect(named('bg')).toEqual(['brand-guidelines']);
  });

  test('the matched characters are marked and the rest is not', () => {
    const [first] = matchSkills('br', 'claude', catalog);
    expect(first?.parts).toEqual([
      { text: 'br', isMatch: true },
      { text: 'and-audit', isMatch: false },
    ]);
  });

  test('a contiguous match outranks the same characters scattered through a name', () => {
    expect(named('bu')).toEqual(['button-states', 'brand-audit', 'brand-guidelines']);
  });

  test('an earlier match outranks a later one when both are contiguous', () => {
    expect(named('c')).toEqual(['color-contrast', 'accessibility-sweep', 'responsive-check']);
  });

  test('an empty query returns the whole catalog in order with nothing marked', () => {
    expect(named('')).toEqual([
      'brand-audit',
      'brand-guidelines',
      'button-states',
      'accessibility-sweep',
      'color-contrast',
      'design-tokens',
      'responsive-check',
      'layout-grid',
    ]);
    expect(matchSkills('', 'claude', catalog)[0]?.parts).toEqual([{ text: 'brand-audit', isMatch: false }]);
  });

  test('a query matching nothing returns an empty list', () => {
    expect(named('zzz')).toEqual([]);
  });

  test('a skill belonging to the other agent never appears', () => {
    expect(named('codex')).toEqual([]);
    expect(named('')).not.toContain('codex-only');
    expect(named('codex', 'codex')).toEqual(['codex-only']);
  });
});

describe('promoteTypedSkill', () => {
  test('a full name followed by a space becomes the skill and its arguments', () => {
    expect(promoteTypedSkill('/brand-audit make it bolder', 'claude', catalog)).toEqual({
      skill: catalog[0],
      text: 'make it bolder',
    });
  });

  test('a name with no following space is still being typed', () => {
    expect(promoteTypedSkill('/brand-audit', 'claude', catalog)).toBeUndefined();
  });

  test('a name no skill owns does not promote', () => {
    expect(promoteTypedSkill('/brand-auditx make it bolder', 'claude', catalog)).toBeUndefined();
  });

  test('a name belonging to the other agent does not promote', () => {
    expect(promoteTypedSkill('/codex-only go', 'claude', catalog)).toBeUndefined();
  });

  test('a trailing space promotes with no arguments yet', () => {
    expect(promoteTypedSkill('/brand-audit ', 'claude', catalog)?.text).toBe('');
  });
});

const key = (over: Partial<SkillMenuKeyState> = {}): SkillMenuKeyState => ({
  key: 'a',
  shiftKey: false,
  isComposing: false,
  keyCode: 65,
  isOpen: false,
  highlighted: false,
  ...over,
});

describe('resolveSkillMenuKey', () => {
  test('Escape closes only while the popover is open', () => {
    expect(resolveSkillMenuKey(key({ key: 'Escape', isOpen: true }))).toEqual({ verdict: 'close', consume: true });
    expect(resolveSkillMenuKey(key({ key: 'Escape' }))).toEqual({ verdict: 'ignore', consume: false });
  });

  test('the arrows move the highlight only while open, so recall still works when closed', () => {
    expect(resolveSkillMenuKey(key({ key: 'ArrowUp', isOpen: true }))).toEqual({ verdict: 'move-up', consume: true });
    expect(resolveSkillMenuKey(key({ key: 'ArrowDown', isOpen: true }))).toEqual({ verdict: 'move-down', consume: true });
    expect(resolveSkillMenuKey(key({ key: 'ArrowUp' }))).toEqual({ verdict: 'ignore', consume: false });
  });

  test('Enter and Tab choose only with a row highlighted, so an empty list still sends', () => {
    expect(resolveSkillMenuKey(key({ key: 'Enter', isOpen: true, highlighted: true }))).toEqual({ verdict: 'choose', consume: true });
    expect(resolveSkillMenuKey(key({ key: 'Tab', isOpen: true, highlighted: true }))).toEqual({ verdict: 'choose', consume: true });
    expect(resolveSkillMenuKey(key({ key: 'Enter', isOpen: true }))).toEqual({ verdict: 'ignore', consume: false });
    expect(resolveSkillMenuKey(key({ key: 'Tab', isOpen: true }))).toEqual({ verdict: 'ignore', consume: false });
    expect(resolveSkillMenuKey(key({ key: 'Enter', highlighted: true }))).toEqual({ verdict: 'ignore', consume: false });
  });

  test('Shift+Enter is a newline, never a choice', () => {
    expect(resolveSkillMenuKey(key({ key: 'Enter', shiftKey: true, isOpen: true, highlighted: true }))).toEqual({ verdict: 'ignore', consume: false });
  });

  test("Backspace is never the menu's: the inline token is an atom the editable deletes itself", () => {
    expect(resolveSkillMenuKey(key({ key: 'Backspace' }))).toEqual({ verdict: 'ignore', consume: false });
    expect(resolveSkillMenuKey(key({ key: 'Backspace', isOpen: true, highlighted: true }))).toEqual({ verdict: 'ignore', consume: false });
  });

  test('an IME keystroke is never consumed', () => {
    for (const over of [{ isComposing: true }, { keyCode: 229 }]) {
      expect(resolveSkillMenuKey(key({ key: 'Escape', isOpen: true, ...over }))).toEqual({ verdict: 'ignore', consume: false });
      expect(resolveSkillMenuKey(key({ key: 'Enter', isOpen: true, highlighted: true, ...over }))).toEqual({ verdict: 'ignore', consume: false });
    }
  });

  test('the verdict set over an exhaustive walk is exactly the documented one', () => {
    const seen = new Set<SkillMenuVerdict>();
    const flags = [false, true];
    for (const k of ['Escape', 'ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Backspace', 'a']) {
      for (const shiftKey of flags) {
        for (const isOpen of flags) {
          for (const highlighted of flags) {
            seen.add(resolveSkillMenuKey(key({ key: k, shiftKey, isOpen, highlighted })).verdict);
          }
        }
      }
    }
    expect([...seen].sort()).toEqual(['choose', 'close', 'ignore', 'move-down', 'move-up']);
  });
});
