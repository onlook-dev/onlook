import type { AgentSnapshot, ProjectCreateState, StudioEvent, ToolStatus } from '@studio/events';
import { until } from './async.js';
import { readTab } from './cdp.js';

type EventOf<K extends StudioEvent['type']> = Extract<StudioEvent, { type: K }>;

export interface AgentToolCall {
  id: string;
  name: string;
  status: ToolStatus;
  input?: unknown;
  result?: string;
  isError?: boolean;
}

const SETTLED_TOOL: readonly ToolStatus[] = ['completed', 'failed', 'denied', 'canceled'];

/** Upserted by id: the SDK sends `update` and `end` for ids with no `start`, and `start` twice. */
export function toolCalls(events: readonly StudioEvent[]): AgentToolCall[] {
  const calls = new Map<string, AgentToolCall>();
  for (const event of events) {
    if (event.type !== 'tool.start' && event.type !== 'tool.update' && event.type !== 'tool.end') continue;
    const call = calls.get(event.toolCallId) ?? { id: event.toolCallId, name: '', status: 'pending' };
    const settled = SETTLED_TOOL.includes(call.status);
    if (event.type === 'tool.start') {
      call.name = event.name;
      if (!settled) call.status = event.status;
    } else if (event.type === 'tool.update' && event.status !== undefined && !settled) {
      call.status = event.status;
    } else if (event.type === 'tool.end') {
      call.status = event.status;
      if (event.result !== undefined) call.result = event.result;
      if (event.isError !== undefined) call.isError = event.isError;
    }
    if (event.type !== 'tool.end' && event.input !== undefined) call.input = event.input;
    calls.set(event.toolCallId, call);
  }
  return [...calls.values()];
}

export interface TabAgent {
  agent: AgentSnapshot;
  setup: ProjectCreateState | null;
}

export async function readTabAgent(port: string | number, tabId: string, sinceSeq?: number): Promise<TabAgent> {
  const request = sinceSeq === undefined ? '{}' : JSON.stringify({ sinceSeq });
  return readTab<TabAgent>(
    port,
    tabId,
    `Promise.all([window.studio.agentSnapshot(${request}), window.studio.tabCreateState()]).then(([agent, setup]) => ({ agent, setup }))`,
  );
}

export function setupSettled(setup: ProjectCreateState | null): boolean {
  if (setup === null) return false;
  switch (setup.kind) {
    case 'live':
    case 'failed':
    case 'refused':
    case 'canceled':
      return true;
    case 'ready':
      return setup.workspace.comfort === 'design';
    default:
      return false;
  }
}

const SETUP_LIMIT_MS = 5 * 60_000;
const TURN_LIMIT_MS = 5 * 60_000;

/** Resolves with where setup ended — `failed` included, so a probe about failure can read it. */
export async function waitForSetup(
  port: string | number,
  tabId: string,
  limitMs = SETUP_LIMIT_MS,
): Promise<ProjectCreateState> {
  const setup = await until(
    () => readTab<ProjectCreateState | null>(port, tabId, 'window.studio.tabCreateState()'),
    setupSettled,
    { what: `tab ${tabId}'s project setup to end`, limitMs },
  );
  return setup as ProjectCreateState;
}

export type TurnVerdict =
  | { kind: 'running' }
  | { kind: 'ended'; ended: EventOf<'turn.ended'> }
  | { kind: 'failed'; reason: string };

const DEAD_CONNECTION = ['unauthenticated', 'cli_missing', 'error'] as const;

/** A failed result's `session.error` can precede the turn's own end, so an error mid-stream is not the end. */
export function turnVerdict(read: Pick<AgentSnapshot, 'events' | 'isStreaming' | 'connection'>): TurnVerdict {
  const ended = read.events.findLast((event): event is EventOf<'turn.ended'> => event.type === 'turn.ended');
  if (ended !== undefined && !read.isStreaming) return { kind: 'ended', ended };
  if (read.isStreaming) return { kind: 'running' };
  const status = read.connection.status;
  if ((DEAD_CONNECTION as readonly string[]).includes(status)) {
    return { kind: 'failed', reason: `the agent connection is ${status}${read.connection.detail ? `: ${read.connection.detail}` : ''}` };
  }
  const error = read.events.findLast((event): event is EventOf<'session.error'> => event.type === 'session.error');
  // `code` carries the reason when the provider sent no prose (ONL-2495).
  if (error !== undefined) {
    return { kind: 'failed', reason: `session.error ${error.code ?? 'unknown'} ${error.message}`.trim() };
  }
  const closed = read.events.findLast((event): event is EventOf<'session.ended'> => event.type === 'session.ended');
  if (closed !== undefined) return { kind: 'failed', reason: `the session ended (${closed.reason}) with no turn ended` };
  return { kind: 'running' };
}

function setupStranded({ agent, setup }: TabAgent): boolean {
  if (agent.isStreaming || setup === null) return false;
  return setup.kind === 'failed' || setup.kind === 'refused' || setup.kind === 'canceled';
}

export interface AgentTurn {
  ended: EventOf<'turn.ended'>;
  events: StudioEvent[];
  tools: AgentToolCall[];
  lastSeq: number;
}

export async function waitForTurn(
  port: string | number,
  tabId: string,
  { after = 0, limitMs = TURN_LIMIT_MS }: { after?: number; limitMs?: number } = {},
): Promise<AgentTurn> {
  const read = await until(
    () => readTabAgent(port, tabId, after),
    (state) => turnVerdict(state.agent).kind !== 'running' || setupStranded(state),
    {
      what: `tab ${tabId}'s agent to end a turn after seq ${String(after)}`,
      limitMs,
      describe: (state) =>
        `streaming ${String(state.agent.isStreaming)}, ${String(state.agent.events.length)} events, connection ${state.agent.connection.status}, setup ${state.setup?.kind ?? 'none'}`,
    },
  );
  const verdict = turnVerdict(read.agent);
  if (verdict.kind === 'failed') throw new Error(`Tab ${tabId}'s agent could not end a turn: ${verdict.reason}.`);
  if (verdict.kind === 'running') throw new Error(`Tab ${tabId}'s setup ended ${JSON.stringify(read.setup)} with no turn running.`);
  return { ended: verdict.ended, events: read.agent.events, tools: toolCalls(read.agent.events), lastSeq: read.agent.lastSeq };
}
