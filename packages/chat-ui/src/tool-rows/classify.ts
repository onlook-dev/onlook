/** Verbs come from `name` before `kind` — the register is finer than the reducer's buckets — and the `kind` fallback is what keeps an unnamed MCP tool from rendering as a blank (ONL-1939). */
import { RENAME_PROJECT_TOOL, type Question, type QuestionAnswers, type ToolCallView } from '@studio/events';
import { fill, withoutSlot } from '../fill.js';
import { toolLineFor, type CanvasNameOf, type ToolLineId, type ToolLineStrings } from './lines.js';
import type { ToolRowDetail, ToolRowStatus } from './types.js';

/** Every line from `lines.ts`, and the canvas names it fills in. */
export interface ToolLineContext {
  strings: ToolLineStrings;
  nameOf: CanvasNameOf;
}

export interface ToolVerbPair {
  running: string;
  done: string;
}

export interface ToolVerbStrings {
  read: ToolVerbPair;
  write: ToolVerbPair;
  edit: ToolVerbPair;
  search: ToolVerbPair;
  find: ToolVerbPair;
  run: ToolVerbPair;
  fetch: ToolVerbPair;
  searchWeb: ToolVerbPair;
  use: ToolVerbPair;
  /** `rename_project` before its result lands; the result text is the row once it has (ONL-2181). */
  rename: ToolVerbPair;
}

export type ToolVerbId = keyof ToolVerbStrings;

export type ToolRowNode =
  | {
      kind: 'row';
      key: string;
      verb: ToolVerbId;
      target?: string;
      status: ToolRowStatus;
      detail?: ToolRowDetail;
      /** Already-resolved prose that REPLACES `<verb>`; a target still follows it. */
      sentence?: string;
      /** The `lines.ts` id the sentence came from, published in place of `verb`. */
      line?: ToolLineId;
      /** The sentence split around the frame it names, so the name can take the person to that frame. */
      frameLink?: ToolRowFrameLink;
      /** The sentence split around the value it quotes, so a cut row can shorten the value and keep the words around it. */
      held?: SentenceSplit;
    }
  | { kind: 'file'; key: string; verb: ToolVerbId; fileName: string; status: ToolRowStatus }
  | {
      kind: 'grouped-files';
      key: string;
      verb: ToolVerbId;
      fileNames: string[];
      overflow: number;
      status: ToolRowStatus;
    }
  | {
      kind: 'grouped-commands';
      key: string;
      verb: ToolVerbId;
      items: Array<{ description?: string; command: string }>;
      status: ToolRowStatus;
    }
  | { kind: 'answered'; key: string; questions: Question[]; answers: QuestionAnswers }
  | { kind: 'dismissed'; key: string; questions: Question[] };

export interface SentenceSplit {
  before: string;
  value: string;
  after: string;
}

/** The call's own words a line quotes, longest first to shorten; `{target}` is the row's own slot. */
const QUOTED_SLOTS = ['what', 'name', 'text', 'file', 'url'] as const;

export interface ToolRowFrameLink {
  frameId: string;
  before: string;
  name: string;
  after: string;
}

const GROUP_FILE_CAP = 3;

const TARGET_MAX = 60;

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function baseName(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function input(call: ToolCallView, key: string): string | undefined {
  const bag = call.input as Record<string, unknown> | undefined;
  const value = bag?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function filePath(call: ToolCallView): string | undefined {
  return input(call, 'file_path') ?? input(call, 'path') ?? call.target;
}

export function rowStatus(call: ToolCallView): ToolRowStatus {
  switch (call.displayStatus) {
    case 'pending':
    case 'in_progress':
    case 'awaiting_approval':
      return 'running';
    case 'failed':
    case 'denied':
      return 'error';
    case 'canceled':
      return 'canceled';
    default:
      return 'completed';
  }
}

export function groupStatus(calls: ToolCallView[]): ToolRowStatus {
  const statuses = calls.map(rowStatus);
  if (statuses.includes('running')) return 'running';
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('canceled')) return 'canceled';
  return 'completed';
}

function split(template: string, slot: string, params: Record<string, string>): SentenceSplit | undefined {
  const value = params[slot];
  const token = `{${slot}}`;
  const at = template.indexOf(token);
  if (value === undefined || value === '' || at < 0) return undefined;
  return { before: fill(template.slice(0, at), params), value, after: fill(template.slice(at + token.length), params) };
}

function said(lines: ToolLineContext, id: ToolLineId, status: ToolRowStatus, params: Record<string, string> = {}, frameId?: string): Pick<Extract<ToolRowNode, { kind: 'row' }>, 'sentence' | 'line' | 'frameLink' | 'held'> {
  const pair = lines.strings[id];
  const template = status === 'running' ? pair.running : pair.done;
  const sentence = fill(template, params);
  const named = split(template, 'name', params);
  if (frameId !== undefined && named !== undefined) {
    return { sentence, line: id, frameLink: { frameId, before: named.before, name: named.value, after: named.after } };
  }
  const held = QUOTED_SLOTS.map((slot) => split(template, slot, params)).find((part) => part !== undefined);
  return held === undefined ? { sentence, line: id } : { sentence, line: id, held };
}

/** A call parked on its card, or one whose work has its own surface, draws no row. */
function isQuietRow(call: ToolCallView, lines: ToolLineContext): boolean {
  return isPending(call) || toolLineFor(call, lines.nameOf)?.kind === 'hidden';
}

/** A sentence keeps `{target}` only while a target is there to fill it. */
function classifyOne(call: ToolCallView, lines: ToolLineContext): ToolRowNode | null {
  const node = classifyCall(call, lines);
  if (node?.kind !== 'row' || node.sentence === undefined || (node.target !== undefined && node.target !== '')) return node;
  return { ...node, sentence: withoutSlot(node.sentence, 'target') };
}

function classifyCall(call: ToolCallView, lines: ToolLineContext): ToolRowNode | null {
  const key = call.toolCallId;
  const status = rowStatus(call);

  // `TodoWrite` is never a row: the agent's own scratchpad is not news, and a run of them buries the work between them.
  if (call.name === 'TodoWrite') return null;
  if (isQuietRow(call, lines)) return null;

  if (call.name === 'Write' || call.name === 'Edit' || call.name === 'MultiEdit' || call.name === 'NotebookEdit') {
    return {
      kind: 'file',
      key,
      verb: call.name === 'Write' ? 'write' : 'edit',
      fileName: baseName(input(call, 'notebook_path') ?? filePath(call) ?? call.title),
      status,
    };
  }

  const written = toolLineFor(call, lines.nameOf);
  if (written?.kind === 'line') {
    return {
      kind: 'row',
      key,
      verb: 'use',
      ...said(lines, written.id, status, written.params, written.frameId),
      ...(written.target === undefined ? {} : { target: written.target }),
      status,
      ...(call.result ? { detail: { kind: 'raw' as const, text: call.result } } : {}),
    };
  }
  if (call.name === 'Delete') {
    const path = filePath(call);
    return { kind: 'row', key, verb: 'use', ...said(lines, 'deleteFile', status), ...(path ? { target: baseName(path) } : {}), status };
  }

  if (call.name === 'Read' || call.name === 'NotebookRead') {
    const path = filePath(call);
    return {
      kind: 'row',
      key,
      verb: 'read',
      target: baseName(path ?? call.title),
      status,
      ...(path ? { detail: { kind: 'file' as const, path, ...lineCount(call) } } : {}),
    };
  }

  if (call.name === 'Bash' || call.name === 'PowerShell') {
    const command = input(call, 'command') ?? call.target ?? '';
    const description = input(call, 'description');
    return {
      kind: 'row',
      key,
      verb: 'run',
      target: description ?? truncate(command, TARGET_MAX),
      status,
      ...(command ? { detail: { kind: 'shell' as const, command } } : {}),
    };
  }

  if (call.name === 'Grep' || call.name === 'Glob') {
    const pattern = input(call, 'pattern') ?? call.target ?? '';
    return {
      kind: 'row',
      key,
      verb: call.name === 'Grep' ? 'search' : 'find',
      ...said(lines, call.name === 'Grep' ? 'searchCode' : 'findFiles', status),
      target: truncate(pattern, TARGET_MAX),
      status,
      ...(pattern
        ? {
            detail: {
              kind: 'search' as const,
              pattern,
              ...(call.result ? { matches: call.result } : {}),
            },
          }
        : {}),
    };
  }

  if (call.name === 'WebFetch' || call.name === 'WebSearch') {
    const target = input(call, 'url') ?? input(call, 'query') ?? call.target ?? '';
    return {
      kind: 'row',
      key,
      verb: call.name === 'WebFetch' ? 'fetch' : 'searchWeb',
      ...said(lines, call.name === 'WebFetch' ? 'fetch' : 'searchWeb', status),
      target: truncate(target, TARGET_MAX),
      status,
      ...(call.result ? { detail: { kind: 'raw' as const, text: call.result } } : {}),
    };
  }

  // The row is the tool's own result, written by the sink that did or did not do it, so it never claims a rename that did not happen (ONL-2181).
  if (call.name === RENAME_PROJECT_TOOL) {
    return {
      kind: 'row',
      key,
      verb: 'rename',
      status,
      ...(call.result ? { sentence: call.result } : {}),
    };
  }

  return { kind: 'row', key, verb: 'use', ...said(lines, 'other', status), status, ...(call.result ? { detail: { kind: 'raw' as const, text: call.result } } : {}) };
}

function lineCount(call: ToolCallView): { lineCount?: number } {
  if (!call.result) return {};
  return { lineCount: call.result.split('\n').length };
}

/** A call parked on a permission prompt is never grouped away: the approval box refers to a specific call, and folding it into "Explored 3 commands" asks the user to approve something with no visible row (ONL-1809). */
function isPending(call: ToolCallView): boolean {
  return call.displayStatus === 'awaiting_approval';
}

export function classifyToolCalls(calls: ToolCallView[], lines: ToolLineContext): ToolRowNode[] {
  const out: ToolRowNode[] = [];
  let run: ToolCallView[] = [];
  let runVerb: 'explore' | 'read' | 'edit' | null = null;

  const flush = () => {
    if (run.length === 0) return;
    const members = run;
    const verb = runVerb;
    run = [];
    runVerb = null;

    if (members.length === 1) {
      const node = members[0] && classifyOne(members[0], lines);
      if (node) out.push(node);
      return;
    }
    const first = members[0];
    if (!first) return;

    if (verb === 'explore') {
      out.push({
        kind: 'grouped-commands',
        key: first.toolCallId,
        verb: 'run',
        items: members.map((c) => {
          const description = input(c, 'description');
          return {
            ...(description ? { description } : {}),
            command: input(c, 'command') ?? c.target ?? '',
          };
        }),
        status: groupStatus(members),
      });
      return;
    }

    const names = members.map((c) => baseName(filePath(c) ?? c.title));
    out.push({
      kind: 'grouped-files',
      key: first.toolCallId,
      verb:
        verb === 'read' ? 'read' : members.every((c) => c.name === 'Write') ? 'write' : 'edit',
      fileNames: names.slice(0, GROUP_FILE_CAP),
      overflow: Math.max(0, names.length - GROUP_FILE_CAP),
      status: groupStatus(members),
    });
  };

  for (const call of calls) {
    if (call.answeredQuestions !== undefined || call.dismissedQuestions !== undefined) {
      flush();
      out.push(call.answeredQuestions !== undefined
        ? { kind: 'answered', key: call.toolCallId, ...call.answeredQuestions }
        : { kind: 'dismissed', key: call.toolCallId, questions: call.dismissedQuestions ?? [] });
      continue;
    }
    if (call.name === 'TodoWrite' || isQuietRow(call, lines)) continue;

    const kindOfRun =
      call.name === 'Bash'
        ? ('explore' as const)
        : call.name === 'Read'
          ? ('read' as const)
          : call.name === 'Write' || call.name === 'Edit' || call.name === 'MultiEdit'
            ? ('edit' as const)
            : null;

    if (kindOfRun === null || isPending(call)) {
      flush();
      const node = classifyOne(call, lines);
      if (node) out.push(node);
      continue;
    }
    if (runVerb !== null && runVerb !== kindOfRun) flush();
    runVerb = kindOfRun;
    run.push(call);
  }
  flush();

  return coalesceReadIntoEdit(out);
}

function coalesceReadIntoEdit(nodes: ToolRowNode[]): ToolRowNode[] {
  const out: ToolRowNode[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    if (!node) continue;
    const next = nodes[i + 1];
    if (
      node.kind === 'row' &&
      node.verb === 'read' &&
      next?.kind === 'file' &&
      next.fileName === node.target
    ) {
      out.push(next);
      i += 1;
      continue;
    }
    out.push(node);
  }
  return out;
}
