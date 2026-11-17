import { readFileSync } from 'node:fs';
import type {
  CanUseTool,
  HookCallbackMatcher,
  McpServerConfig,
  Options,
  Query,
  SDKMessage,
  SDKUserMessage,
  query,
} from '@anthropic-ai/claude-agent-sdk';
import { log } from '../log/index.js';
import { applyRecordedFileTool, RECORDED_FILE_TOOLS } from './replayed-edits.js';
import { STARTER_PORT_RANGE } from '../starter/port.js';
import { learnRunIds, recordedPortIn, withRunIds, type RunIds } from './replayed-ids.js';
import { LIST_FRAMES_TOOL_NAME } from './tool-names.js';

const logger = log('agent-host');

type Row = Record<string, unknown>;
interface ToolUse {
  name: string;
  input: Record<string, unknown>;
}
interface ToolAnswer {
  content: unknown[];
  isError: boolean;
}
type CallTool = (name: string, input: Record<string, unknown>) => Promise<ToolAnswer>;

const isRow = (value: unknown): value is Row => value !== null && typeof value === 'object' && !Array.isArray(value);
const blocks = (row: Row): Row[] => {
  const content = isRow(row['message']) ? row['message']['content'] : undefined;
  return Array.isArray(content) ? content.filter(isRow) : [];
};

function readReplay(path: string): { turns: Row[][]; controlsUrl?: string } {
  const turns: Row[][] = [];
  let turn: Row[] = [];
  let controlsUrl: string | undefined;
  let first = true;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const row: unknown = JSON.parse(line);
    if (first && isRow(row) && row['type'] === 'replay.controls') controlsUrl = String(row['url']);
    first = false;
    if (!isRow(row)) continue;
    if (row['type'] === 'replay.controls') continue;
    turn.push(row);
    if (row['type'] === 'result') {
      turns.push(turn);
      turn = [];
    }
  }
  if (turn.length > 0) turns.push(turn);
  return { turns, controlsUrl };
}

/** Reached the way the SDK reaches them: MCP JSON-RPC to the instance. */
function sdkServerTools(servers: Record<string, McpServerConfig> | undefined): (fullName: string) => CallTool | undefined {
  const connected = new Map<string, Promise<CallTool>>();
  return (fullName) => {
    const match = /^mcp__(.+?)__(.+)$/.exec(fullName);
    const server = match === null ? undefined : servers?.[match[1]!];
    if (match === null || server === undefined || server.type !== 'sdk') return undefined;
    let call = connected.get(match[1]!);
    if (call === undefined) {
      call = connect(server.instance as unknown as { connect: (transport: unknown) => Promise<void> });
      connected.set(match[1]!, call);
    }
    const tool = match[2]!;
    return async (_name, input) => (await call)(tool, input);
  };
}

async function connect(instance: { connect: (transport: unknown) => Promise<void> }): Promise<CallTool> {
  const waiting = new Map<number, (reply: Row) => void>();
  const transport: { onmessage?: (message: unknown) => void } & Record<string, unknown> = {
    start: () => Promise.resolve(),
    close: () => Promise.resolve(),
    send: (message: unknown) => {
      if (isRow(message) && typeof message['id'] === 'number') {
        waiting.get(message['id'])?.(message);
        waiting.delete(message['id']);
      }
      return Promise.resolve();
    },
  };
  await instance.connect(transport);
  let next = 0;
  const request = (method: string, params: Row): Promise<Row> =>
    new Promise((resolve) => {
      next += 1;
      waiting.set(next, resolve);
      transport.onmessage?.({ jsonrpc: '2.0', id: next, method, params });
    });
  await request('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'studio-replay', version: '1' },
  });
  transport.onmessage?.({ jsonrpc: '2.0', method: 'notifications/initialized' });
  return async (name, input) => {
    const reply = await request('tools/call', { name, arguments: input });
    const result = isRow(reply['result']) ? reply['result'] : undefined;
    if (result !== undefined) {
      return { content: Array.isArray(result['content']) ? result['content'] : [], isError: result['isError'] === true };
    }
    const error = isRow(reply['error']) ? reply['error'] : {};
    return { content: [{ type: 'text', text: `MCP error ${String(error['code'])}: ${String(error['message'])}` }], isError: true };
  };
}

function toolResultBlock(id: string, answer: ToolAnswer): Row {
  if (!answer.isError) {
    const content = answer.content.map((block) => {
      if (!isRow(block) || block['type'] !== 'image' || typeof block['data'] !== 'string' || typeof block['mimeType'] !== 'string') return block;
      return { type: 'image', source: { type: 'base64', data: block['data'], media_type: block['mimeType'] } };
    });
    return { type: 'tool_result', tool_use_id: id, content };
  }
  const text = answer.content.map((block) => (isRow(block) && typeof block['text'] === 'string' ? block['text'] : '')).join('\n');
  return { type: 'tool_result', tool_use_id: id, content: text, is_error: true };
}

export interface ReplayRun {
  starterPortFor?: (cwd: string) => number | undefined;
  framePagesLive?: (cwd: string, frameIds: readonly string[]) => Promise<boolean>;
}

const FRAME_PAGE_WAIT_MS = 5_000;

function framesNamed(input: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  if (typeof input['frame_id'] === 'string') ids.add(input['frame_id']);
  const tasks = Array.isArray(input['tasks']) ? input['tasks'].filter(isRow) : [];
  for (const task of tasks) {
    const picture = isRow(task['picture']) ? task['picture'] : undefined;
    if (typeof picture?.['frame_id'] === 'string') ids.add(picture['frame_id']);
  }
  return [...ids];
}

export function replayedQuery(path: string, run: ReplayRun = {}): typeof query {
  return (params) => {
    const { turns, controlsUrl } = readReplay(path);
    const controls = controlsUrl === undefined ? undefined : new URL(controlsUrl);
    if (controls !== undefined && (controls.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(controls.hostname))) throw new Error('Replay controls must use a loopback HTTP fixture');
    const control = async (method: string, input: unknown = {}): Promise<unknown> => {
      if (controls === undefined) return undefined;
      const response = await fetch(controls, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ method, input }), signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error('Replay control fixture refused a request');
      return response.json();
    };
    const options: Options = params.options ?? {};
    const studioTool = sdkServerTools(options.mcpServers);
    const alwaysAllowed = new Set(options.allowedTools ?? []);
    let interrupted = false;
    let abort = new AbortController();
    let recordedCwd: string | undefined;
    const runIds: RunIds = new Map();
    const recordedStarterPort = recordedPortIn(turns, STARTER_PORT_RANGE);

    function replayFileTool(block: Row, use: ToolUse): void {
      const cwd = options.cwd;
      if (block['is_error'] === true || !RECORDED_FILE_TOOLS.has(use.name) || recordedCwd === undefined || cwd === undefined) return;
      const outcome = applyRecordedFileTool(use, withRunIds(recordedCwd, runIds), cwd);
      if ('skipped' in outcome) logger.warn('a replayed file edit was not applied', { tool: use.name, reason: outcome.skipped });
    }

    function carryStarterPort(): void {
      const live = options.cwd === undefined ? undefined : run.starterPortFor?.(options.cwd);
      if (live === undefined || recordedStarterPort === undefined || live === recordedStarterPort) return;
      for (const host of ['localhost', '127.0.0.1']) {
        const recorded = `${host}:${String(recordedStarterPort)}`;
        if (!runIds.has(recorded)) runIds.set(recorded, `${host}:${String(live)}`);
      }
    }

    /** A recorded turn answers at once, ahead of a page a live model's latency would have let load (ONL-2977). */
    async function framePagesLive(name: string, input: Record<string, unknown>): Promise<void> {
      const cwd = options.cwd;
      const live = run.framePagesLive;
      const named = framesNamed(input);
      if (cwd === undefined || live === undefined || (named.length === 0 && !name.endsWith(`__${LIST_FRAMES_TOOL_NAME}`))) return;
      const deadline = Date.now() + FRAME_PAGE_WAIT_MS;
      while (Date.now() < deadline && !(await live(cwd, named))) await new Promise((resolve) => setTimeout(resolve, 100));
    }

    async function runPreToolUse(id: string, use: ToolUse): Promise<void> {
      const matchers: HookCallbackMatcher[] = options.hooks?.PreToolUse ?? [];
      for (const matcher of matchers) {
        for (const hook of matcher.hooks) {
          await hook(
            { hook_event_name: 'PreToolUse', tool_name: use.name, tool_input: use.input, tool_use_id: id } as never,
            id,
            { signal: abort.signal },
          );
        }
      }
    }

    async function permitted(id: string, use: ToolUse, index: number): Promise<{ input: Record<string, unknown> } | { denied: string }> {
      const canUseTool: CanUseTool | undefined = options.canUseTool;
      if (alwaysAllowed.has(use.name) || canUseTool === undefined) return { input: use.input };
      const answer = await canUseTool(use.name, use.input, {
        signal: abort.signal,
        toolUseID: id,
        requestId: `replay-${String(index)}-${id}`,
      } as never);
      if (answer?.behavior === 'deny') return { denied: answer.message };
      if (answer?.updatedPermissions !== undefined) alwaysAllowed.add(use.name);
      return { input: answer?.updatedInput ?? use.input };
    }

    async function answerTools(row: Row, calls: Map<string, ToolUse>, index: number): Promise<Row> {
      const message = isRow(row['message']) ? row['message'] : {};
      const content: Row[] = [];
      let live = false;
      for (const block of blocks(row)) {
        const id = typeof block['tool_use_id'] === 'string' ? block['tool_use_id'] : undefined;
        const use = id === undefined ? undefined : calls.get(id);
        const call = use === undefined ? undefined : studioTool(use.name) ?? (controls !== undefined && use.name.startsWith('mcp__') ? async (name: string, input: Record<string, unknown>) => await control('tools/call', { name, input }) as ToolAnswer : undefined);
        if (block['type'] === 'tool_result' && use !== undefined) replayFileTool(block, use);
        if (block['type'] !== 'tool_result' || id === undefined || use === undefined || (call === undefined && use.name !== 'AskUserQuestion')) {
          content.push(block);
          continue;
        }
        live = true;
        const permit = await permitted(id, use, index);
        const answer: ToolAnswer =
          'denied' in permit
            ? { content: [{ type: 'text', text: permit.denied }], isError: true }
            : call === undefined
              ? { content: [{ type: 'text', text: JSON.stringify(permit.input['answers'] ?? {}) }], isError: false }
              : await framePagesLive(use.name, permit.input).then(() => call(use.name, permit.input));
        if (!answer.isError) learnRunIds(block['content'], answer.content, runIds);
        content.push(toolResultBlock(id, answer));
      }
      if (!live) return row;
      const { tool_use_result: _recorded, ...rest } = row;
      return { ...rest, message: { ...message, content } };
    }

    async function* stream(): AsyncGenerator<SDKMessage, void> {
      const prompts = (params.prompt as AsyncIterable<SDKUserMessage>)[Symbol.asyncIterator]();
      for (let index = 0; ; index += 1) {
        const prompt = await prompts.next();
        if (prompt.done === true) return;
        const turn = turns[index];
        if (turn === undefined) {
          throw new Error(`The recording at ${path} holds ${String(turns.length)} turns; prompt ${String(index + 1)} has no recorded reply.`);
        }
        interrupted = false;
        abort = new AbortController();
        carryStarterPort();
        const calls = new Map<string, ToolUse>();
        const result = turn.find((row) => row['type'] === 'result');
        for (const recorded of turn) {
          if (interrupted) break;
          const row = withRunIds(recorded, runIds);
          let message = row;
          if (row['type'] === 'system' && row['subtype'] === 'init' && typeof row['cwd'] === 'string') recordedCwd = row['cwd'];
          if (row['type'] === 'user') {
            try {
              message = await answerTools(row, calls, index);
            } catch (error) {
              if (interrupted) break;
              throw new Error(`A replayed tool call failed in turn ${String(index + 1)} of ${path}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
          yield message as unknown as SDKMessage;
          if (row['type'] !== 'assistant') continue;
          for (const block of blocks(row)) {
            if (block['type'] !== 'tool_use' || typeof block['id'] !== 'string' || typeof block['name'] !== 'string') continue;
            const use = { name: block['name'], input: isRow(block['input']) ? block['input'] : {} };
            calls.set(block['id'], use);
            await runPreToolUse(block['id'], use);
          }
        }
        if (interrupted && result !== undefined) {
          yield { ...result, subtype: 'error_during_execution', is_error: true } as unknown as SDKMessage;
        }
      }
    }

    const replay = stream();
    return Object.assign(replay, {
      interrupt: () => {
        interrupted = true;
        abort.abort();
        return Promise.resolve();
      },
      setModel: () => Promise.resolve(),
      applyFlagSettings: () => Promise.resolve(),
      setMcpPermissionModeOverride: () => Promise.resolve(),
      supportedModels: () => Promise.resolve([]),
      ...(controls === undefined ? {} : {
        mcpServerStatus: () => control('mcpServerStatus'),
        reloadPlugins: () => control('reloadPlugins'),
        mcpAuthenticate: (name: string) => control('mcpAuthenticate', { name }),
      }),
    }) as unknown as Query;
  };
}
