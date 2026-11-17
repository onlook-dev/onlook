import type { ToolKind } from '@studio/events';

import { filledStr as str } from '../coerce.js';
import { QUESTION_TOOL, toolKind, toolPresentation } from '../reduce.js';
import { STUDIO_MCP_SERVER, STUDIO_TOOL_NAMES, STUDIO_TOOLS } from '../tool-names.js';

const DYNAMIC_TOOL_ITEM = 'dynamicToolCall';
const FILE_CHANGE_ITEM = 'fileChange';
const COMMAND_ITEM = 'commandExecution';
const MCP_TOOL_ITEM = 'mcpToolCall';

// From the records, not `appServerToolNames()`: that needs live sinks and this module stays pure.
const CODEX_ROW_TOOLS: ReadonlySet<string> = new Set(STUDIO_TOOL_NAMES.filter((name) => STUDIO_TOOLS[name].codexRow));

export interface ToolPresentation {
  /** A name `classify.ts` recognises. */
  name: string;
  kind: ToolKind;
  title: string;
  target?: string;
  changedTargets?: string[];
}

function field(input: unknown, key: string): string | undefined {
  return str((input as Record<string, unknown> | undefined)?.[key]);
}

const EDIT_ROW = { name: 'Edit', kind: 'edit' as ToolKind, title: 'Edit' };
const FILE_CHANGE_ROWS: Readonly<Record<string, { name: string; kind: ToolKind; title: string }>> = {
  add: { name: 'Write', kind: 'edit', title: 'Write' },
  update: EDIT_ROW,
  delete: { name: 'Delete', kind: 'delete', title: 'Delete' },
};

function firstChange(item: unknown): Record<string, unknown> | undefined {
  const changes = (item as Record<string, unknown> | undefined)?.['changes'];
  if (!Array.isArray(changes)) return undefined;
  const first: unknown = changes[0];
  return typeof first === 'object' && first !== null ? (first as Record<string, unknown>) : undefined;
}

function changedPaths(item: unknown): string[] {
  const changes = (item as Record<string, unknown> | undefined)?.['changes'];
  if (!Array.isArray(changes)) return [];
  return changes.flatMap((change: unknown) => {
    const path = typeof change === 'object' && change !== null ? str((change as Record<string, unknown>)['path']) : undefined;
    return path === undefined ? [] : [path];
  });
}

export function appServerToolPresentation(name: string, input: unknown, cwd: string): ToolPresentation {
  if (name === QUESTION_TOOL) {
    return { name, kind: toolKind(name), ...toolPresentation(name, input, cwd) };
  }

  // One call is announced under both the wire type (`translate.ts`) and the tool name (`session.ts`), in codex's order.
  const dynamicTool =
    name === DYNAMIC_TOOL_ITEM ? field(input, 'tool') : CODEX_ROW_TOOLS.has(name) ? name : undefined;

  if (dynamicTool !== undefined) {
    const claudeName = `mcp__${STUDIO_MCP_SERVER}__${dynamicTool}`;
    const presented = toolPresentation(claudeName, toolArguments(input), cwd);
    return { name: claudeName, kind: toolKind(claudeName), ...presented };
  }

  if (name === DYNAMIC_TOOL_ITEM) {
    return { name: DYNAMIC_TOOL_ITEM, kind: 'other', title: 'Tool' };
  }

  if (name === COMMAND_ITEM) {
    // `classify.ts` keys the grouped-commands treatment off the literal `Bash`.
    const command = field(input, 'command');
    return { name: 'Bash', kind: 'execute', title: 'Bash', ...(command ? { target: command } : {}) };
  }

  if (name === FILE_CHANGE_ITEM) {
    const change = firstChange(input);
    const type = str((change?.['kind'] as Record<string, unknown> | undefined)?.['type']);
    const row = FILE_CHANGE_ROWS[type ?? 'update'] ?? EDIT_ROW;
    const path = str(change?.['path']);
    const changedTargets = changedPaths(input).map((changed) => relative(changed, cwd));
    return {
      ...row,
      ...(path ? { target: relative(path, cwd) } : {}),
      ...(changedTargets.length > 0 ? { changedTargets } : {}),
    };
  }

  if (name === MCP_TOOL_ITEM) {
    const server = field(input, 'server');
    const tool = field(input, 'tool');
    if (server !== undefined && tool !== undefined) {
      return {
        name: `mcp__${server}__${tool}`,
        kind: toolKind(`mcp__${server}__${tool}`),
        title: server,
        target: tool.replace(/_/g, ' '),
      };
    }
  }

  // An unmapped type keeps its own name so a codex bump's new type stays distinguishable.
  return { name, kind: 'other', title: name };
}

function toolArguments(input: unknown): unknown {
  const bag = input as Record<string, unknown> | undefined;
  return bag?.['arguments'] ?? bag?.['args'] ?? input ?? {};
}

function relative(path: string, cwd: string): string {
  return path.startsWith(`${cwd}/`) ? path.slice(cwd.length + 1) : path;
}

export const APPSERVER_PRESENTATION = {
  present(name: string, input: unknown, cwd: string) {
    return appServerToolPresentation(name, input, cwd);
  },
  resultLanguage(kind: ToolKind): string {
    if (kind === 'execute') return 'shell';
    if (kind === 'other') return 'json';
    return 'plaintext';
  },
  // Zeros would render as "changed nothing"; a unified diff has no before/after to count.
  diffStats(): { additions?: number; deletions?: number } {
    return {};
  },
};
