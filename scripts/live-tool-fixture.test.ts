import { describe, expect, it } from 'bun:test';
import { studioToolDefinitions, type StudioToolSinks } from '../apps/studio/src/main/agent-host/studio-tools.js';
import { appServerToolRunner } from '../apps/studio/src/main/agent-host/appserver/tools.js';
import { recordingSinks, toolsPrompt } from '../tests/live/tool-fixture.js';
import { checkScratch } from './check-scratch.js';

const ARTIFACT_CASES: [Parameters<StudioToolSinks['onArtifact']>[0], string][] = [
  ['create', 'create_artifact'],
  ['read', 'read_artifact'],
  ['set', 'set_artifact'],
  ['import', 'import_artifact'],
  ['place', 'place_artifact'],
  ['fork', 'fork_artifact'],
];

function argumentsFor(name: string): Record<string, unknown> {
  const prefix = `- ${name} `;
  const line = toolsPrompt([name]).split('\n').find((entry) => entry.startsWith(prefix));
  if (line === undefined) throw new Error(`No prompt line for '${name}'`);
  return JSON.parse(line.slice(prefix.length));
}

describe('the live tool fixture without a live session', () => {
  it('supplies schema-valid arguments for every registered tool before dispatch', () => {
    const ledger = recordingSinks();
    for (const definition of studioToolDefinitions(ledger.sinks)) {
      const input = argumentsFor(definition.name);
      const fields: Record<string, { safeParse(value: unknown): { success: boolean } }> = definition.inputSchema;
      for (const [name, schema] of Object.entries(fields)) {
        expect(schema.safeParse(input[name]).success, `${definition.name}.${name}`).toBe(true);
      }
      for (const name of Object.keys(input)) {
        expect(Object.hasOwn(fields, name), `${definition.name}.${name} is declared`).toBe(true);
      }
    }
    expect(ledger.calls).toEqual([]);
  });

  it('routes every registered tool fixture to exactly its named sink', async () => {
    const ledger = recordingSinks();
    const names = studioToolDefinitions(ledger.sinks).map((definition) => definition.name);
    const runner = appServerToolRunner(ledger.sinks);
    expect(toolsPrompt(names)).toContain('Remember the codeword ZEPHYR-7742.');
    for (const name of names) {
      const before = ledger.calls.length;
      const result = await runner(name, argumentsFor(name));
      expect(ledger.calls.slice(before).map((call) => call.slice(0, call.indexOf('(')))).toEqual([name]);
      expect(result.contentItems.length).toBeGreaterThan(0);
      if (!['server_running', 'frame_working', 'suggest_next_tasks', 'list_frames', 'list_pages', 'rename_project', 'waiting_on'].includes(name)) {
        expect(result.success).toBe(false);
        expect(result.contentItems).toEqual([{
          type: 'inputText',
          text: expect.stringContaining('harness check: recorded, nothing performed'),
        }]);
      }
    }
    const reached = ledger.calls.map((call) => call.slice(0, call.indexOf('(')));
    expect(reached.toSorted()).toEqual(names.toSorted());
  });

  it.each(ARTIFACT_CASES)('records the artifact %s verb under %s', async (verb, name) => {
    const ledger = recordingSinks();
    const input = argumentsFor(name);
    const result = await appServerToolRunner(ledger.sinks)(name, input);
    expect(result.success).toBe(false);
    expect(ledger.calls).toEqual([`${name}(${JSON.stringify(input)})`]);
    ledger.calls.length = 0;
    await ledger.sinks.onArtifact(verb, input);
    expect(ledger.calls).toEqual([`${name}(${JSON.stringify(input)})`]);
  });

  it('rejects unknown tools instead of silently supplying empty arguments', () => {
    expect(() => toolsPrompt(['list_frames', 'unregistered_tool'])).toThrow("No live tool argument fixture for 'unregistered_tool'");
    expect(() => toolsPrompt(['toString'])).toThrow("No live tool argument fixture for 'toString'");
  });

  it('keeps list handlers empty and records their tool identities', async () => {
    const ledger = recordingSinks();
    expect(await ledger.sinks.onListFrames({ pageId: 'p1' })).toEqual([]);
    expect(await ledger.sinks.onListPages()).toEqual([]);
    expect(ledger.calls).toEqual(['list_frames({"pageId":"p1"})', 'list_pages()']);
  });

  it('registers the shared fixture as a live-tier library', () => {
    expect(checkScratch({ files: ['tests/live/tool-fixture.ts'] }).violations).toEqual([]);
  });
});
