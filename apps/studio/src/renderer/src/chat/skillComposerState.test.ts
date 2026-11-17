import { describe, expect, test } from 'bun:test';
import { skillMenuQuery, skillQueryStart, unknownSkillCommand } from './skillComposerState.js';

describe('skill composer boundaries', () => {
  test('a slash word at the end of the draft opens the menu, wherever it starts', () => {
    expect(skillMenuQuery('/')).toBe('');
    expect(skillMenuQuery('/Brand:apply')).toBe('brand:apply');
    expect(skillMenuQuery('use /brand')).toBe('brand');
    expect(skillMenuQuery(' /')).toBe('');
    for (const text of ['plain text', 'word/name', 'assets/logo.svg', '/assets/logo.svg', '/brand arguments']) expect(skillMenuQuery(text)).toBeUndefined();
  });
  test('a chosen skill takes the place of the slash word, and only that', () => {
    expect(skillQueryStart('make it pop /bra')).toBe(12);
    expect(skillQueryStart('/bra')).toBe(0);
    expect(skillQueryStart('see a/b /')).toBe(8);
    expect(skillQueryStart('plain text')).toBeUndefined();
  });
  test('unknown initial commands are notices, not paths or ordinary prose', () => {
    const skills = [{ agent: 'claude' as const, name: 'brand', description: 'Apply the brand' }];
    expect(unknownSkillCommand('/brand args', 'claude', skills, true)).toBe(false);
    expect(unknownSkillCommand('/brand args', 'codex', skills, true)).toBe(true);
    expect(unknownSkillCommand('/missing', 'claude', skills, true)).toBe(true);
    for (const text of ['/', '/assets/logo.svg', 'use /missing', 'src/path']) expect(unknownSkillCommand(text, 'claude', skills, true)).toBe(false);
  });
  test('nothing is unknown before a catalog has been heard', () => {
    expect(unknownSkillCommand('/brand args', 'claude', [], false)).toBe(false);
    expect(unknownSkillCommand('/brand args', 'claude', [], true)).toBe(true);
  });
});
