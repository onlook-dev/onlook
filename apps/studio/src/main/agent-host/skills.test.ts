import { describe, expect, it } from 'bun:test';
import { claudeSkills, selectedSkillsAvailable } from './skills.js';

describe('reported skills only', () => {
  it('excludes built-ins and shadowed names, but keeps real descriptions', () => {
    expect(claudeSkills([{ name: 'model', description: 'custom' }, { name: 'model', description: 'built-in', builtin: true }, { name: 'brand:apply', description: 'Use the brand palette' }])).toEqual([{ name: 'brand:apply', description: 'Use the brand palette', agent: 'claude' }]);
  });
  it('checks name, agent and the reported Codex path', () => {
    const skill = { kind: 'skill' as const, name: 'brand', agent: 'codex' as const, description: 'Brand', path: '/home/skills/brand/SKILL.md' };
    expect(selectedSkillsAvailable([skill], [skill])).toBe(true);
    expect(selectedSkillsAvailable([skill], [])).toBe(false);
    expect(selectedSkillsAvailable([{ ...skill, path: '/other/SKILL.md' }], [skill])).toBe(false);
    expect(selectedSkillsAvailable([{ ...skill, agent: 'claude' }], [skill])).toBe(false);
    expect(selectedSkillsAvailable([skill, skill], [skill])).toBe(false);
  });
});
