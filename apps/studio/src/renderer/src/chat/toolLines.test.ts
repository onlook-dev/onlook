import { describe, expect, it } from 'bun:test';
import type { ToolCallView } from '@studio/events';
import { BUILT_INS_WITH_LINES, classifyToolCalls, STUDIO_TOOLS_WITH_LINES } from '@studio/chat-ui';
import { STUDIO_MCP_SERVER } from '../../../main/agent-host/tool-names.js';
import { BUILT_IN_KINDS, STUDIO_TOOL_KINDS } from '../../../main/agent-host/turn-tool-kinds.js';
import { toolLineStrings } from './toolLineStrings.js';

const lines = { strings: toolLineStrings(), nameOf: () => undefined };
const REGISTER_ROWS = new Set(['Read', 'Write', 'Edit', 'NotebookEdit', 'Bash', 'Glob', 'Grep', 'WebFetch', 'WebSearch', 'Delete']);

function call(name: string): ToolCallView {
  return { toolCallId: name, name, kind: 'other', title: name, status: 'completed', displayStatus: 'completed', startedAt: 0, input: {} };
}

function said(name: string): string {
  const node = classifyToolCalls([call(name)], lines)[0];
  if (node === undefined) return '';
  return node.kind === 'row' ? (node.sentence ?? '') : '';
}

describe('every tool Studio can call has a plain line in Project Chat (ONL-2960)', () => {
  it('writes a line, or leaves one out on purpose, for every Studio tool main registers', () => {
    expect(Object.keys(STUDIO_TOOL_KINDS).filter((leaf) => !STUDIO_TOOLS_WITH_LINES.has(leaf))).toEqual([]);
  });

  it('covers every built-in tool the turn counts, by the register’s rows or a line of its own', () => {
    const uncovered = Object.keys(BUILT_IN_KINDS).filter((name) => !REGISTER_ROWS.has(name) && !BUILT_INS_WITH_LINES.has(name) && said(name) === '');
    expect(uncovered).toEqual([]);
  });

  it('never shows a tool’s own name, an unfilled slot or snake_case', () => {
    const names = [...Object.keys(STUDIO_TOOL_KINDS).map((leaf) => `mcp__${STUDIO_MCP_SERVER}__${leaf}`), ...Object.keys(BUILT_IN_KINDS)];
    const leaks = names.flatMap((name) => {
      const text = said(name);
      const leaf = name.split('__').pop() ?? name;
      return new RegExp(`\\b${leaf}\\b`).test(text) || /[{}_]/.test(text) ? [`${name}: ${text}`] : [];
    });
    expect(leaks).toEqual([]);
  });
});
