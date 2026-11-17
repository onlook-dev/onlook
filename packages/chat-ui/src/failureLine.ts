import { isServiceFailure, type ToolCallView, type TranscriptItem } from '@studio/events';
import { fill } from './fill.js';
import { failureRow, type ErrorItem, type FailAction, type FailureContext, type FailureRowView } from './failureRow.js';
import type { ChatStrings } from './strings.js';

export type NoticeAction = Extract<FailAction, { kind: 'switch-agent' | 'open-billing' }>;

export type FailureLineAction = Exclude<FailAction, { kind: 'retry-at' }> | { kind: 'continue' };

export interface FailureLineView {
  lead: string;
  /** The whole story, on hover. */
  detail?: string;
  /** In drawing order; empty once a later turn has started (ONL-2973). */
  actions: FailureLineAction[];
}

export type FailureLine =
  | { kind: 'line'; row: FailureRowView; line: FailureLineView }
  /** `actions` are the notice's own, at most one; `line` is what stays in the chat beside it. */
  | { kind: 'notice'; row: FailureRowView; body?: string; line: FailureLineView; actions: NoticeAction[] }
  | { kind: 'none' };

export interface FailedTurnFacts {
  /** A completed edit, delete or move in the failed turn, and the file the last one touched when it named one. */
  landed?: { file?: string };
  /** Nothing has happened in the conversation since: the line's action still means something (ONL-2973). */
  isLatest: boolean;
}

const CHANGES: readonly ToolCallView['kind'][] = ['edit', 'delete', 'move'];
const NOTICE_CAUSES: readonly FailureRowView['cause'][] = ['limit-reset', 'limit-weekly', 'limit-unknown', 'billing'];

function baseName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path;
}

export function failedTurnFacts(items: readonly TranscriptItem[], errorIndex: number): FailedTurnFacts {
  let start = errorIndex;
  while (start > 0 && items[start - 1]?.kind !== 'user') start -= 1;
  const calls = items.slice(start, errorIndex).flatMap((item) => (item.kind === 'tools' ? item.calls : []));
  const landed = [...calls].reverse().find((call) => CHANGES.includes(call.kind) && call.status === 'completed');
  const isLatest = !items.slice(errorIndex + 1).some((item) => item.kind === 'user' || item.kind === 'tools' || item.kind === 'assistant-text' || item.kind === 'error');
  return {
    ...(landed === undefined ? {} : { landed: landed.target ? { file: baseName(landed.target) } : {} }),
    isLatest,
  };
}

function sentence(text: string): string {
  return /[.!?…]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`;
}

/** The row's body with each action's sentence kept only while that action is offered (ONL-2973). */
function detailFor(row: FailureRowView, offers: { retry: boolean; switch: boolean }): string | undefined {
  if (row.short !== undefined) {
    const { reason, provider, switch: other } = row.short;
    return [reason, ...(provider === undefined ? [] : [provider]), ...(offers.switch && other !== undefined ? [other] : [])].join(' ');
  }
  if (row.parts === undefined) return row.body;
  const { reason, retry, switch: other } = row.parts;
  return [reason, ...(offers.retry && retry !== undefined ? [retry] : []), ...(offers.switch && other !== undefined ? [other] : [])].join(' ');
}

function isNoticeAction(action: FailAction): action is NoticeAction {
  return action.kind === 'switch-agent' || action.kind === 'open-billing';
}

type LineStrings = Pick<ChatStrings, 'errorTitle' | 'errorCutOffTitle' | 'errorReason' | 'failure'>;

function serviceLine(item: ErrorItem, facts: FailedTurnFacts, strings: LineStrings): { lead: string; detail: string; action?: FailureLineAction } {
  const copy = strings.failure.line;
  const status = item.apiErrorStatus;
  const overloaded = status === 529;
  if (facts.landed !== undefined) {
    const file = facts.landed.file;
    const why = status === undefined ? copy.part : fill(overloaded ? copy.partOverloaded : copy.partStatus, { status });
    const landed = file === undefined ? copy.landedChange : fill(copy.landedFile, { file });
    return {
      lead: status === undefined ? copy.stopped : fill(copy.stoppedStatus, { status }),
      detail: [why, landed, ...(facts.isLatest ? [copy.continueHint] : [])].join(' '),
      ...(facts.isLatest ? { action: { kind: 'continue' } as const } : {}),
    };
  }
  const why = status === undefined ? copy.lost : fill(overloaded ? copy.lostOverloaded : copy.lostStatus, { status });
  const canRetry = facts.isLatest && item.retry !== undefined;
  return {
    lead: status === undefined ? copy.service : fill(overloaded ? copy.overloaded : copy.serviceStatus, { status }),
    detail: canRetry ? `${why} ${copy.retryHint}` : why,
    ...(canRetry && item.retry !== undefined ? { action: { kind: 'retry', prompt: item.retry } as const } : {}),
  };
}

/** A failed turn's reading: a line where it happened, a notice when the input itself can't be used (ONL-2973). */
export function failureLine(item: ErrorItem, ctx: FailureContext, facts: FailedTurnFacts, strings: LineStrings): FailureLine {
  const row = failureRow(item, ctx, strings);
  if (row === undefined) return { kind: 'none' };
  if (NOTICE_CAUSES.includes(row.cause)) {
    const actions = facts.isLatest ? row.actions.filter(isNoticeAction).slice(0, 1) : [];
    const action = actions[0];
    const detail = detailFor(row, { retry: false, switch: action?.kind === 'switch-agent' });
    const body = row.short === undefined ? row.body : [row.short.reason, ...(row.short.switch === undefined ? [] : [row.short.switch])].join(' ');
    return {
      kind: 'notice',
      row,
      ...(body === undefined ? {} : { body }),
      actions,
      line: {
        lead: fill(strings.failure.line.stoppedHere, { reason: row.title }),
        ...(detail === undefined ? {} : { detail }),
        actions: facts.isLatest ? row.actions.filter((each): each is Exclude<FailAction, { kind: 'retry-at' }> => each.kind !== 'retry-at') : [],
      },
    };
  }
  const alternative = facts.isLatest ? row.actions.filter((action) => action.kind === 'switch-agent') : [];
  if (isServiceFailure(item.code, item.apiErrorStatus)) {
    const { action, ...service } = serviceLine(item, facts, strings);
    return { kind: 'line', row, line: { ...service, actions: [...alternative, ...(action === undefined ? [] : [action])] } };
  }
  const retry = facts.isLatest ? row.actions.filter((action) => action.kind === 'retry') : [];
  const lead = row.title === strings.errorCutOffTitle ? strings.failure.line.cutOff : sentence(row.title);
  const detail = detailFor(row, { retry: retry.length > 0, switch: alternative.length > 0 });
  return {
    kind: 'line',
    row,
    line: {
      lead,
      ...(detail === undefined ? {} : { detail }),
      actions: [...alternative, ...retry],
    },
  };
}
