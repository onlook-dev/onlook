import { describe, expect, test } from 'bun:test';

import { QUESTION_TOOL, toolKind, toolPresentation } from '../reduce.js';
import {
  REMOVE_FRAME_TOOL_NAME,
  REMOVE_FRAMES_TOOL_NAME,
  STUDIO_MCP_SERVER,
  UNDO_CANVAS_TOOL_NAME,
} from '../tool-names.js';
import { appServerToolPresentation } from './presentation.js';

const CWD = '/tmp/workspace';

const claudeRow = (name: string, input: unknown) => ({
  name,
  kind: toolKind(name),
  ...toolPresentation(name, input, CWD),
});

describe('appServerToolPresentation', () => {
  test('a dynamic tool row matches the Claude path for the same verb', () => {
    const fromItem = appServerToolPresentation(
      'dynamicToolCall',
      {
        type: 'dynamicToolCall',
        id: 'item_1',
        tool: 'create_frame',
        arguments: { url: 'http://localhost:3000' },
        status: 'inProgress',
      },
      CWD,
    );

    expect(fromItem).toEqual(
      claudeRow('mcp__studio__create_frame', { url: 'http://localhost:3000' }),
    );
  });

  test('both announce paths for one Studio call present identically, as that Studio tool', () => {
    const calls: [string, Record<string, unknown>][] = [
      [REMOVE_FRAME_TOOL_NAME, { frameId: 'f1' }],
      [REMOVE_FRAMES_TOOL_NAME, { frame_ids: ['f1', 'f2'] }],
      [UNDO_CANVAS_TOOL_NAME, {}],
    ];
    for (const [tool, args] of calls) {
      const fromItem = appServerToolPresentation(
        'dynamicToolCall',
        { type: 'dynamicToolCall', id: 'i', tool, arguments: args },
        CWD,
      );
      const fromRequest = appServerToolPresentation(tool, args, CWD);

      expect(fromRequest).toEqual(fromItem);
      expect(fromRequest.name).toBe(`mcp__${STUDIO_MCP_SERVER}__${tool}`);
    }
  });

  test('a command execution presents as Bash, with the command as its target', () => {
    const row = appServerToolPresentation(
      'commandExecution',
      { type: 'commandExecution', id: 'c1', command: 'bun run dev', cwd: CWD, status: 'inProgress' },
      CWD,
    );

    expect(row.name).toBe('Bash');
    expect(row.kind).toBe('execute');
    expect(row.target).toBe('bun run dev');
  });

  test('file changes map their own kind vocabulary onto the transcript verbs', () => {
    const change = (type: string, path: string) => ({
      type: 'fileChange',
      id: 'f',
      status: 'completed',
      changes: [{ path, kind: { type }, diff: '@@' }],
    });

    const added = appServerToolPresentation('fileChange', change('add', `${CWD}/src/new.ts`), CWD);
    expect(added.name).toBe('Write');
    expect(added.target).toBe('src/new.ts');

    expect(appServerToolPresentation('fileChange', change('update', `${CWD}/a.ts`), CWD).name).toBe(
      'Edit',
    );
    expect(appServerToolPresentation('fileChange', change('delete', `${CWD}/a.ts`), CWD).name).toBe(
      'Delete',
    );
  });

  test('an unmapped item type presents honestly rather than as a lie', () => {
    const row = appServerToolPresentation('webSearch', { type: 'webSearch', id: 'w', query: 'x' }, CWD);

    expect(row.name).toBe('webSearch');
    expect(row.title).toBe('webSearch');
    expect(row.kind).toBe('other');
    expect(row.target).toBeUndefined();

    const toolless = appServerToolPresentation('dynamicToolCall', { type: 'dynamicToolCall' }, CWD);
    expect(toolless.kind).toBe('other');
  });

  test('a third-party MCP call is named by its server and tool, as the Claude path names it', () => {
    const row = appServerToolPresentation(
      'mcpToolCall',
      { type: 'mcpToolCall', id: 'm', server: 'figma', tool: 'get_node', arguments: {} },
      CWD,
    );

    expect(row).toEqual(claudeRow('mcp__figma__get_node', {}));
  });

  test('a structured question matches the Claude AskUserQuestion row (ONL-2215)', () => {
    const input = {
      questions: [
        {
          id: 'layout_preference',
          header: 'Preference',
          question: 'Which option do you prefer?',
          isOther: true,
          isSecret: false,
          options: [
            { label: 'tabs', description: 'Use tabs.' },
            { label: 'windows', description: 'Use windows.' },
          ],
        },
      ],
    };
    const row = appServerToolPresentation(QUESTION_TOOL, input, CWD);

    expect(row).toEqual(claudeRow(QUESTION_TOOL, input));
  });
});
