import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { leaks, scrub, shapes } from '../tests/live/recording.js';

function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value !== null && typeof value === 'object') return Object.values(value).flatMap(strings);
  return [];
}

describe('live recording privacy', () => {
  it('redacts Claude setup catalogs in every checked-in stream', () => {
    for (const directory of [new URL('../tests/apparatus/recordings/', import.meta.url), new URL('../tests/live/recordings/claude/', import.meta.url)]) {
      const files = readdirSync(directory).filter((name) => name.endsWith('.jsonl'));
      expect(files.length).toBeGreaterThan(0);
      for (const file of files) {
        const rows = readFileSync(new URL(file, directory), 'utf8').trim().split('\n').map((line) => JSON.parse(line));
        const values: string[] = [];
        for (const row of rows) {
          const catalogs = row.type === 'system' && row.subtype === 'init'
            ? ['skills', 'agents', 'plugins', 'slash_commands', 'terminal_slash_commands'].map((key) => row[key])
            : row.type === 'system' && row.subtype === 'commands_changed' ? [row.commands] : [];
          values.push(...catalogs.flatMap(strings));
        }
        expect(values.length).toBeGreaterThan(0);
        for (const value of values) expect(value).toMatch(/^skill-value-\d+$/);
      }
    }
  });

  it('redacts Claude setup catalogs and changed commands without losing protocol shape', () => {
    const metadata = { name: 'fixture-workflow', description: 'Fictional team workflow', aliases: ['fixture:workflow'], enabled: true };
    const input = { tools: [
      { type: 'system', subtype: 'init', skills: ['fixture-workflow'], agents: ['fixture-agent'], plugins: [{ name: 'fixture-plugin', path: '/fictional/plugin' }], slash_commands: ['fixture-workflow'], terminal_slash_commands: ['fixture-workflow'], mcp_servers: [] },
      { type: 'system', subtype: 'commands_changed', commands: [metadata] },
    ] };
    const output = scrub('claude', input);
    const parsed = output.tools!.map((line) => JSON.parse(line));
    expect(output.tools!.join('\n')).not.toContain('fixture-workflow');
    expect(output.tools!.join('\n')).not.toContain('Fictional team workflow');
    expect(output.tools!.join('\n')).not.toContain('/fictional/plugin');
    expect(parsed[0].skills[0]).toBe(parsed[0].slash_commands[0]);
    expect(parsed[0].skills[0]).toBe(parsed[1].commands[0].name);
    expect(parsed[1].commands[0].enabled).toBe(true);
    expect(shapes('claude', { tools: parsed })).toBe(shapes('claude', input));
  });

  it('redacts encoded project keys and SDK scratchpad references without losing path identity', () => {
    const encoded = tmpdir().replace(/\/$/, '').replace(/[^a-zA-Z0-9]/g, '-');
    const scratchpad = `/private/tmp/claude-501/${encoded}/session/scratchpad`;
    const input = {
      tools: [
        { type: 'system', subtype: 'init', mcp_servers: [], scratchpad_path: scratchpad, memory_paths: { auto: `${homedir()}/projects/${encoded}/memory/` } },
        { type: 'assistant', message: { content: [{ type: 'tool_use', input: { file_path: `${scratchpad}/note.txt` } }] } },
        { type: 'user', tool_use_result: { filePath: `${scratchpad}/note.txt` }, detail: `Wrote ${scratchpad}/note.txt` },
      ],
    };
    expect(leaks(JSON.stringify(input))).toContain('an encoded machine path');
    expect(leaks(JSON.stringify(input))).toContain('the SDK scratchpad path');
    const output = scrub('claude', input);
    const parsed = output.tools!.map((line) => JSON.parse(line));
    expect(parsed[0].scratchpad_path).toBe('<scratchpad-1>');
    expect(parsed[1].message.content[0].input.file_path).toBe('<scratchpad-1>/note.txt');
    expect(parsed[2].tool_use_result.filePath).toBe('<scratchpad-1>/note.txt');
    expect(parsed[2].detail).toBe('Wrote <scratchpad-1>/note.txt');
    expect(leaks(output.tools!.join('\n'))).toEqual([]);
    expect(shapes('claude', { tools: parsed })).toBe(shapes('claude', input));
  });

  it('redacts personal skill metadata while preserving protocol shape and shared identities', () => {
    const personalSkill = {
      name: 'private-team-standup', description: 'Internal colleague workflow', path: '/personal/skills/standup/SKILL.md',
      scope: 'user', enabled: true, pluginId: null,
      interface: { displayName: 'Private standup', defaultPrompt: 'Run private-team-standup', iconSmall: null, brandColor: null },
    };
    const input = { tools: [{ id: 1, result: { data: [{ cwd: '<tmp>/project', skills: [personalSkill], errors: [] }] } }] };
    const output = scrub('codex', input);
    const parsed = output.tools!.map((line) => JSON.parse(line));
    const metadata = parsed[0].result.data[0].skills[0];
    expect(metadata).toEqual({
      name: 'skill-value-1', description: 'skill-value-2', path: 'skill-value-3', scope: 'user', enabled: true, pluginId: null,
      interface: { displayName: 'skill-value-4', defaultPrompt: 'skill-value-5', iconSmall: null, brandColor: null },
    });
    expect(output.tools!.join('\n')).not.toContain('private-team-standup');
    expect(shapes('codex', { tools: parsed })).toBe(shapes('codex', input));
    const repeated = scrub('codex', { ...input, resume: input.tools });
    expect(JSON.parse(repeated.resume![0]!).result.data[0].skills).toEqual([metadata]);
  });
});
