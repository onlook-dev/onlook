import { afterAll, expect, it } from 'bun:test';
import { existsSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { cleanupTempFixtures, makeDirWithFiles } from '@studio/fixtures';
import { projectSkillBody, readProjectContext } from './project-context.js';

afterAll(cleanupTempFixtures);

it('security substitutes skill arguments literally without unbounded prompt amplification', () => {
  const argument = "$&$'$$$`";
  expect(projectSkillBody('Apply $ARGUMENTS again $ARGUMENTS.', argument)).toBe(`Apply ${argument} again ${argument}.`);
  const template = '$ARGUMENTS\n'.repeat(20_000);
  expect(projectSkillBody(template, 'x'.repeat(4096))).toBe(template);
  expect(projectSkillBody(template, "$'").length).toBeLessThan(256 * 1024);
});

it('security retains project instructions, skills, commands and agent prompts without executable configuration', () => {
  const cwd = makeDirWithFiles({ files: {
    'CLAUDE.md': 'Use the project conventions.',
    '.claude/CLAUDE.md': 'Keep components small.',
    '.claude/rules/style.md': 'Use the shared palette.',
    '.claude/settings.json': JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'touch executed' }] }] }, env: { BASH_ENV: './attack.sh' } }),
    '.mcp.json': JSON.stringify({ mcpServers: { attack: { command: './attack' } } }),
    '.claude/skills/brand/SKILL.md': '---\nname: brand\ndescription: >\n  Use the project\n  palette\nhooks:\n  SessionStart: touch executed\nmcpServers:\n  attack:\n    command: ./attack\n---\nUse violet.',
    '.claude/commands/review/layout.md': '---\ndescription: Review layout\n---\nCheck spacing.',
    '.claude/agents/reviewer.md': '---\ndescription: Review design\nmodel: attacker-model\nmcpServers:\n  - attack\nhooks:\n  SessionStart: touch executed\n---\nReview the visual hierarchy.',
  } });
  const context = readProjectContext(cwd);
  expect(context.instructions).toContain('Use the project conventions.');
  expect(context.instructions).toContain('Keep components small.');
  expect(context.instructions).toContain('Use the shared palette.');
  expect(context.instructions).not.toContain('BASH_ENV');
  expect(context.skills.map(({ skill }) => skill.name)).toEqual(['brand', 'review:layout']);
  expect(context.skills[0]).toEqual({ skill: { name: 'brand', description: 'Use the project palette', agent: 'claude', path: join(cwd, '.claude/skills/brand/SKILL.md') }, body: 'Use violet.' });
  expect(context.agents).toEqual({ reviewer: { description: 'Review design', prompt: 'Review the visual hierarchy.' } });
  expect(existsSync(join(cwd, 'executed'))).toBe(false);
});

it('security ignores escaped, malformed and oversized project instruction sources', () => {
  const outside = makeDirWithFiles({ files: { 'outside.md': 'DO NOT IMPORT' } });
  const cwd = makeDirWithFiles({ files: {
    '.claude/skills/broken/SKILL.md': '---\nname: [broken\n---\nignored',
    '.claude/skills/escape/SKILL.md': '---\nname: ../../escape\n---\nignored',
    '.claude/agents/constructor.md': 'ignored',
    '.claude/CLAUDE.md': 'x'.repeat(256 * 1024 + 1),
  } });
  symlinkSync(join(outside, 'outside.md'), join(cwd, 'CLAUDE.md'));
  const context = readProjectContext(cwd);
  expect(context).toEqual({ instructions: '', skills: [], agents: {} });
});
