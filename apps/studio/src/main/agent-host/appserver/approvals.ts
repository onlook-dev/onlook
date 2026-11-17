import { randomUUID } from 'node:crypto';
import type { Question, QuestionAnswers } from '@studio/events';
import { obj, str } from '../coerce.js';

const SERVER_REQUEST_METHODS = [
  'item/fileChange/requestApproval',
  'item/commandExecution/requestApproval',
  'item/permissions/requestApproval',
  'item/tool/requestUserInput',
  'item/tool/call',
  'mcpServer/elicitation/request',
  'account/chatgptAuthTokens/refresh',
  'attestation/generate',
  'applyPatchApproval',
  'execCommandApproval',
] as const;

export type ServerRequestMethod = (typeof SERVER_REQUEST_METHODS)[number];

interface RawQuestionOption {
  readonly label: string;
  readonly description: string;
}

export interface RawQuestion {
  readonly id: string;
  readonly header: string;
  readonly question: string;
  readonly isOther?: boolean;
  readonly isSecret?: boolean;
  readonly options?: readonly RawQuestionOption[] | null;
}

export interface PendingQuestion {
  readonly requestId: string | number;
  readonly itemId: string;
  readonly questions: readonly RawQuestion[];
}

export type FileChangeDecision = 'accept' | 'acceptForSession' | 'decline' | 'cancel';
export type CommandDecision = FileChangeDecision | 'acceptWithExecpolicyAmendment' | 'applyNetworkPolicyAmendment';

export interface ProposedChange {
  path: string;
  kind: string;
  diff: string;
}

export interface PendingApproval {
  readonly requestId: string | number;
  readonly method: ServerRequestMethod;
  readonly itemId: string;
  readonly changes: ProposedChange[];
  readonly command?: string;
  readonly cwd?: string;
  readonly reason?: string;
  readonly mcp?: { server: string; tool: string; arguments: unknown };
}

export interface HostToolCall {
  readonly requestId: string | number;
  /** The `dynamicToolCall` item id, which is also the transcript row id. */
  readonly callId: string;
  readonly tool: string;
  readonly namespace?: string;
  readonly args: unknown;
}

export interface ApprovalHandlers {
  isHostServer?: (serverName: string) => boolean;
  onHostTool?: (call: HostToolCall) => void;
  onApproval: (pending: PendingApproval) => void;
  onQuestion?: (ask: PendingQuestion) => void;
  respond: (id: string | number, result: unknown) => void;
  respondError: (id: string | number, message: string) => void;
}

/** `item/fileChange/requestApproval` carries no diff; it came on the `fileChange` item and is joined here by `itemId`. */
export class ChangeRegistry {
  private readonly byItemId = new Map<string, ProposedChange[]>();

  observe(frame: Record<string, unknown>): void {
    const method = str(frame['method']);
    if (method !== 'item/started' && method !== 'item/completed') return;
    const item = obj(obj(frame['params'])?.['item']);
    if (item === undefined || str(item['type']) !== 'fileChange') return;
    const id = str(item['id']);
    const changes = item['changes'];
    if (id === undefined || !Array.isArray(changes)) return;
    this.byItemId.set(
      id,
      changes.flatMap((change) => {
        const record = obj(change);
        const path = str(record?.['path']);
        if (record === undefined || path === undefined) return [];
        return [{ path, kind: str(record['kind']) ?? 'unknown', diff: str(record['diff']) ?? '' }];
      }),
    );
  }

  get(itemId: string): ProposedChange[] {
    return this.byItemId.get(itemId) ?? [];
  }

  clear(): void {
    this.byItemId.clear();
  }
}

export function dispatchServerRequest(
  method: string,
  id: string | number,
  params: unknown,
  registry: ChangeRegistry,
  handlers: ApprovalHandlers,
): boolean {
  const record = obj(params) ?? {};
  const itemId = str(record['itemId']) ?? '';

  switch (method) {
    case 'item/fileChange/requestApproval': {
      handlers.onApproval({
        requestId: id,
        method,
        itemId,
        changes: registry.get(itemId),
        reason: str(record['reason']),
      });
      return true;
    }

    case 'item/commandExecution/requestApproval': {
      handlers.onApproval({
        requestId: id,
        method,
        itemId,
        changes: [],
        command: str(record['command']),
        cwd: str(record['cwd']),
        reason: str(record['reason']),
      });
      return true;
    }

    case 'item/permissions/requestApproval': {
      handlers.onApproval({ requestId: id, method, itemId, changes: [], reason: str(record['reason']) });
      return true;
    }

    case 'item/tool/requestUserInput': {
      if (handlers.onQuestion === undefined) {
        handlers.respondError(id, 'Onlook does not implement tool user-input requests yet');
        return true;
      }
      const raw = record['questions'];
      handlers.onQuestion({
        requestId: id,
        itemId,
        questions: Array.isArray(raw) ? (raw as RawQuestion[]) : [],
      });
      return true;
    }
    case 'item/tool/call': {
      const tool = str(record['tool']);
      if (tool === undefined || handlers.onHostTool === undefined) {
        handlers.respondError(id, 'Onlook declares no host tools on this path');
        return true;
      }
      handlers.onHostTool({
        requestId: id,
        callId: str(record['callId']) ?? '',
        tool,
        namespace: str(record['namespace']),
        args: record['arguments'],
      });
      return true;
    }

    case 'mcpServer/elicitation/request': {
      const serverName = str(record['serverName']);
      const ours = serverName !== undefined && handlers.isHostServer?.(serverName) === true;
      if (ours) {
        handlers.respond(id, { action: 'accept', content: null });
        return true;
      }
      const metadata = obj(record['_meta']);
      const schema = obj(record['requestedSchema']);
      const properties = obj(schema?.['properties']);
      const message = str(record['message']);
      if (
        !serverName || !message?.trim() || record['mode'] !== 'form' ||
        metadata?.['codex_approval_kind'] !== 'mcp_tool_call' ||
        schema?.['type'] !== 'object' || properties === undefined || Object.keys(properties).length !== 0 ||
        (schema['required'] !== undefined && (!Array.isArray(schema['required']) || schema['required'].length !== 0))
      ) {
        handlers.respondError(id, 'Onlook does not support this connector input request');
        return true;
      }
      handlers.onApproval({
        requestId: id,
        method,
        itemId: `mcp-approval:${randomUUID()}`,
        changes: [],
        reason: message,
        mcp: {
          server: str(metadata['connector_name']) ?? serverName,
          tool: str(metadata['tool_name']) ?? str(metadata['tool_title']) ?? serverName,
          arguments: metadata['tool_params'] ?? {},
        },
      });
      return true;
    }
    case 'account/chatgptAuthTokens/refresh':
      handlers.respondError(id, 'Onlook does not broker auth tokens; codex owns its own login');
      return true;
    case 'attestation/generate':
      handlers.respondError(id, 'Onlook does not implement attestation');
      return true;
    case 'applyPatchApproval':
    case 'execCommandApproval':
      handlers.respondError(id, 'Onlook answers the v2 approval methods, not the legacy pair');
      return true;

    default:
      return false;
  }
}

export function decisionResult(decision: FileChangeDecision | CommandDecision, method?: ServerRequestMethod): unknown {
  if (method === 'mcpServer/elicitation/request') {
    return { action: decision === 'accept' ? 'accept' : decision === 'cancel' ? 'cancel' : 'decline', content: null };
  }
  return { decision };
}

export function toStudioQuestions(raw: readonly RawQuestion[]): Question[] {
  return raw.flatMap((q) => {
    const options = (q.options ?? []).filter(
      (o): o is RawQuestionOption => Boolean(o.label) && Boolean(o.description),
    );
    if (options.length < 2) return [];
    return [{ question: q.question, header: q.header, options }];
  });
}

/** codex keys answers by `RawQuestion.id`; `QuestionAnswers` is keyed by the question text. */
export function questionResult(
  idByText: ReadonlyMap<string, string>,
  answers: QuestionAnswers,
): unknown {
  const out: Record<string, { answers: string[] }> = {};
  for (const [text, label] of Object.entries(answers)) {
    const id = idByText.get(text);
    if (id !== undefined) out[id] = { answers: [label] };
  }
  return { answers: out };
}
