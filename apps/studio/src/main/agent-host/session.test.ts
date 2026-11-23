import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from 'bun:test';
import { cleanupTempFixtures, fakeElapsed, makeDirWithFiles } from '@studio/fixtures';
import type { McpSdkServerConfigWithInstance, Query, SDKUserMessage, query } from '@anthropic-ai/claude-agent-sdk';
import { foldSessionState } from '@studio/events';
import type { AgentConnection, PermissionMode, StudioEvent } from '@studio/events';
import type { BackendState } from './backend.js';
import { CLOSE_INTERRUPT_LIMIT_MS, DISPOSE_SESSION_LIMIT_MS } from './close-limits.js';
import {
  AgentSession,
  CLAUDE_PERMISSION_MODES,
  DESTRUCTIVE_GIT_RULES,
  EXTERNALLY_VISIBLE_GIT_RULES,
} from './session.js';
import type { TurnSummary } from './event-log.js';
import { initializeProjectSetup, resetProjectSetupForTesting } from '../project-setup/service.js';
import { createSetupState, emptyRecord, versionDefinition } from '../project-setup/state.js';
import type { ProjectSetupToolSinks } from './project-setup-tools.js';
import { APPSERVER_APPROVAL_TOOLS } from './appserver/tools.js';
import { PROJECT_SETUP_TOOL_NAMES, STUDIO_MCP_SERVER } from './tool-names.js';
import { t } from '@studio/i18n';

const CLOSE_TICK_ALLOWANCE_MS = 50;

function interceptConnectorPolls() {
  const scheduled: (() => void)[] = [];
  const nativeTimeout = globalThis.setTimeout;
  const schedule = jest.spyOn(globalThis, 'setTimeout').mockImplementation(((callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
    const timer = nativeTimeout(callback, delay, ...args);
    if (delay === 5000) {
      const unref = timer.unref.bind(timer);
      let captured = false;
      timer.unref = () => {
        if (!captured) {
          captured = true;
          clearTimeout(timer);
          scheduled.push(() => callback(...args));
        }
        return unref();
      };
    }
    return timer;
  }) as typeof setTimeout);
  return {
    async next(): Promise<() => void> {
      for (let attempt = 0; attempt < 50 && scheduled.length === 0; attempt += 1) {
        await new Promise<void>((resolve) => nativeTimeout(resolve, 0));
      }
      const poll = scheduled.shift();
      if (poll === undefined) throw new Error('Connector inventory did not schedule its next poll');
      return poll;
    },
    restore(): void { schedule.mockRestore(); },
  };
}

const savedFlags = process.env['STUDIO_FLAGS'];
beforeEach(() => { process.env['STUDIO_FLAGS'] = 'connectors'; });
afterEach(() => {
  if (savedFlags === undefined) delete process.env['STUDIO_FLAGS'];
  else process.env['STUDIO_FLAGS'] = savedFlags;
});

afterAll(cleanupTempFixtures);

describe('Claude skill discovery and invocation', () => {
  it('keeps the answer and context with a skill submitted to an open question', async () => {
    const { session, sdk } = makeSession({ commands: [{ name: 'brand:apply', description: 'Use the palette' }] });
    session.open();
    await drain();
    session.prompt('first');
    await drain();
    const parked = sdk.canUseTool('AskUserQuestion', { questions: [{ question: 'Which colour?', header: 'Colour', options: [{ label: 'Violet' }, { label: 'Blue' }] }] }, { signal: new AbortController().signal, toolUseID: 'toolu_brand', requestId: 'req_brand' });
    await drain();
    expect(session.answerQuestion('Use violet in the header', [{ kind: 'skill', name: 'brand:apply', description: 'Use the palette', agent: 'claude' }], 'Keep the footer quiet')).toBe(true);
    await parked;
    await drain();
    expect(JSON.stringify(sdk.sent.at(-1)?.message.content)).toContain('/brand:apply Use violet in the header');
    expect(JSON.stringify(sdk.sent.at(-1)?.message.content)).toContain('Keep the footer quiet');
    await session.close();
    sdk.end();
  });

  it('publishes only reported skills, invokes a chip, and refreshes without restarting', async () => {
    const commands = [{ name: 'brand:apply', description: 'Use the palette' }, { name: 'model', description: 'Built-in', builtin: true }];
    const { session, sdk, emitted } = makeSession({ commands });
    session.open();
    await drain();
    expect(foldSessionState(emitted).skills).toEqual([{ name: 'brand:apply', description: 'Use the palette', agent: 'claude' }]);
    const skill = { kind: 'skill' as const, name: 'brand:apply', description: 'Use the palette', agent: 'claude' as const };
    expect(session.prompt('header please', [skill])).toBe(true);
    await drain();
    expect(sdk.sent.at(-1)?.message.content).toBe('/brand:apply header please');
    commands.splice(0, 1, { name: 'brand:audit', description: 'Audit the palette' });
    sdk.push({ type: 'system', subtype: 'commands_changed', commands });
    await drain();
    expect(foldSessionState(emitted).skills?.map((item) => item.name)).toEqual(['brand:audit']);
    expect(session.prompt('again', [skill])).toBe(false);
    const publications = emitted.filter((event) => event.type === 'session.settings' && event.skills !== undefined).length;
    await session.refreshSkills();
    expect(emitted.filter((event) => event.type === 'session.settings' && event.skills !== undefined)).toHaveLength(publications);
    commands.splice(0);
    await session.refreshSkills();
    expect(foldSessionState(emitted).skills).toEqual([]);
    await session.close();
    sdk.end();
  });
});

/** The CLI's own shape, measured at 0.3.284: the rule it will honour is command-scoped and persistent. */
const RULE = {
  type: 'addRules',
  rules: [{ toolName: 'Bash', ruleContent: 'npm run build' }],
  behavior: 'allow',
  destination: 'localSettings',
};
const ACCEPT_EDITS = { type: 'setMode', mode: 'acceptEdits', destination: 'session' };

type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  opts: {
    signal: AbortSignal;
    toolUseID: string;
    requestId: string;
    suggestions?: unknown[];
    suppressAlwaysAllowRule?: boolean;
  },
) => Promise<
  { behavior: string; updatedInput?: unknown; updatedPermissions?: unknown[] } | undefined
>;

type PreToolUse = (
  input: { tool_name?: string; tool_input?: unknown; tool_use_id?: string; transcript_path?: string },
  toolUseID?: string,
) => Promise<unknown>;

function fakeSdk(
  options: { interruptHangs?: boolean; models?: unknown[]; modeRefused?: boolean; modelRefused?: string; commands?: { name: string; description: string; builtin?: boolean }[]; connectors?: { name: string; status: 'connected' | 'pending' | 'needs-auth'; source?: string; config?: { type: 'http'; url: string } }[] } = {},
) {
  const feed: unknown[] = [];
  let wake: (() => void) | undefined;
  let done = false;
  let failure: string | undefined;
  let interrupts = 0;
  let connectorReads = 0;
  const authenticated: string[] = [];
  const sent: SDKUserMessage[] = [];
  let canUseTool: CanUseTool | undefined;
  let permissions: { ask?: string[]; deny?: string[]; allow?: string[] } | undefined;
  let preToolUse: PreToolUse | undefined;
  let sessionStart: ((input: { transcript_path?: string }) => Promise<unknown>) | undefined;
  let studioServer: McpSdkServerConfigWithInstance | undefined;
  let allowedTools: string[] = [];
  const mcpPermissionModes: [string, string][] = [];
  const spawnModels: unknown[] = [];
  let executionPolicy: { settingSources?: string[]; strictMcpConfig?: boolean } | undefined;
  let projectOptions: { systemPrompt?: unknown; agents?: unknown } | undefined;

  const queryFn = ((args: {
    prompt: AsyncIterable<SDKUserMessage>;
    options: {
      canUseTool: CanUseTool;
      settings?: { permissions?: { ask?: string[]; deny?: string[]; allow?: string[] } };
      hooks?: { PreToolUse?: { hooks: PreToolUse[] }[]; SessionStart?: { hooks: ((input: { transcript_path?: string }) => Promise<unknown>)[] }[] };
      model?: unknown;
      settingSources?: string[];
      strictMcpConfig?: boolean;
      systemPrompt?: unknown;
      agents?: unknown;
      mcpServers?: Record<string, McpSdkServerConfigWithInstance>;
      allowedTools?: string[];
    };
  }) => {
    spawnModels.push(args.options.model);
    executionPolicy = { settingSources: args.options.settingSources, strictMcpConfig: args.options.strictMcpConfig };
    projectOptions = { systemPrompt: args.options.systemPrompt, agents: args.options.agents };
    canUseTool = args.options.canUseTool;
    permissions = args.options.settings?.permissions;
    preToolUse = args.options.hooks?.PreToolUse?.[0]?.hooks[0];
    sessionStart = args.options.hooks?.SessionStart?.[0]?.hooks[0];
    studioServer = args.options.mcpServers?.[STUDIO_MCP_SERVER];
    allowedTools = args.options.allowedTools ?? [];
    void (async () => {
      for await (const message of args.prompt) sent.push(message);
    })();
    const q = {
      async *[Symbol.asyncIterator](): AsyncGenerator<unknown> {
        while (!done) {
          if (failure !== undefined) throw new Error(failure);
          const next = feed.shift();
          if (next === undefined) {
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
            continue;
          }
          yield next;
        }
      },
      interrupt: async (): Promise<void> => {
        interrupts += 1;
        if (options.interruptHangs) await new Promise<void>(() => undefined);
      },
      setModel: async (): Promise<void> => {
        if (options.modelRefused !== undefined) throw new Error(options.modelRefused);
      },
      setPermissionMode: async (): Promise<void> => {
        if (options.modeRefused === true) throw new Error('control request failed');
      },
      applyFlagSettings: async (): Promise<void> => undefined,
      supportedModels: async (): Promise<unknown[]> => options.models ?? [],
      mcpServerStatus: async () => { connectorReads += 1; return options.connectors ?? []; },
      mcpAuthenticate: async (name: string) => {
        authenticated.push(name);
        const connector = options.connectors?.find((server) => server.name === name);
        if (connector === undefined) throw new Error('Unknown connector');
        connector.status = 'connected';
        return { requiresUserAction: false };
      },
      reloadPlugins: async () => ({}),
      supportedCommands: async () => options.commands ?? [],
      reloadSkills: async () => ({ skills: options.commands ?? [] }),
      setMcpPermissionModeOverride: async (server: string, mode: string): Promise<void> => {
        mcpPermissionModes.push([server, mode]);
      },
    };
    return q as unknown as Query;
  }) as unknown as typeof query;

  return {
    queryFn,
    spawnModels,
    authenticated,
    get connectorReads() { return connectorReads; },
    recover(): void { failure = undefined; },
    get executionPolicy() { return executionPolicy; },
    get projectOptions() { return projectOptions; },
    mcpPermissionModes,
    get studioServer() {
      if (studioServer === undefined) throw new Error('query() has no Studio MCP server');
      return studioServer;
    },
    get allowedTools() {
      return allowedTools;
    },
    get permissions() {
      return permissions;
    },
    push(...messages: unknown[]): void {
      feed.push(...messages);
      wake?.();
      wake = undefined;
    },
    fail(message: string): void {
      failure = message;
      wake?.();
      wake = undefined;
    },
    end(): void {
      done = true;
      wake?.();
    },
    get interrupts(): number {
      return interrupts;
    },
    sent,
    canUseTool: (...args: Parameters<CanUseTool>) => {
      if (canUseTool === undefined) throw new Error('query() has not been called');
      return canUseTool(...args);
    },
    preToolUse: (...args: Parameters<PreToolUse>) => {
      if (preToolUse === undefined) throw new Error('query() has not been called');
      return preToolUse(...args);
    },
    sessionStart: (input: { transcript_path?: string }) => {
      if (sessionStart === undefined) throw new Error('query() registered no SessionStart hook');
      return sessionStart(input);
    },
  };
}

const CWD = '/tmp/studio-workspace-onl-2180';

it('connectors flag off retains strict Claude MCP configuration and never reads inventory', async () => {
  delete process.env['STUDIO_FLAGS'];
  const { session, sdk } = makeSession();
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      session.open();
      await drain();
      expect(sdk.executionPolicy).toEqual({ settingSources: ['user'], strictMcpConfig: true });
      expect(sdk.connectorReads).toBe(0);
      expect(session.addConnector('figma')).toBe(false);
      expect(session.addConnector('mobbin')).toBe(false);
      sdk.fail('Claude Code process exited with code 1');
      await drain();
      expect(sdk.connectorReads).toBe(0);
      sdk.recover();
    }
  } finally {
    await session.close();
    sdk.end();
  }
});

it('warms Claude connectors from the live query before a prompt and hides Studio tools', async () => {
  const { session, sdk, emitted } = makeSession({ connectors: [
    { name: 'studio', source: 'sdk', status: 'connected' },
    { name: 'design-workspace', source: 'user', status: 'connected', config: { type: 'http', url: 'https://mcp.figma.com/mcp' } },
  ] });
  session.open();
  await drain();
  expect(sdk.sent).toHaveLength(0);
  expect(foldSessionState(emitted).connectors).toEqual({ servers: [{ id: 'design-workspace', name: 'design-workspace', state: 'connected', featured: 'figma' }] });
  await session.close();
  sdk.end();
});

it.each(['figma', 'mobbin'] as const)('queues current %s context across sign-in and a production tool authentication failure', async (provider) => {
  const label = provider === 'figma' ? 'Figma' : 'Mobbin';
  const { session, sdk, emitted } = makeSession({ connectors: [
    { name: 'design-alias', status: 'needs-auth', config: { type: 'http', url: provider === 'figma' ? 'https://mcp.figma.com/mcp' : 'https://api.mobbin.com/mcp' } },
  ] });
  try {
    session.open();
    await drain();
    expect(foldSessionState(emitted).connectors?.servers[0]?.state).toBe('needs-sign-in');
    expect(session.prompt(`Use ${label} for the header`)).toBe(true);
    await drain();
    expect(sdk.sent).toHaveLength(1);
    expect(sdk.sent[0]?.message.content).toContain(`${label}: needs sign-in`);

    expect(session.actOnConnector('design-alias')).toBe(true);
    await drain();
    expect(sdk.authenticated).toEqual(['design-alias']);
    expect(foldSessionState(emitted).connectors?.servers[0]?.state).toBe('connected');
    expect(session.prompt(`Try ${label} again`)).toBe(true);
    await drain();
    expect(sdk.sent).toHaveLength(2);
    expect(sdk.sent[1]?.message.content).toContain(`${label}: connected`);

    sdk.push(
      { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'expired-connector', name: 'mcp__design-alias__read_design', input: {} }] } },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'expired-connector', content: '401 Unauthorized', is_error: true }] } },
    );
    await drain();
    const signInMessage = t('chat.connectors.tool.signInRequired', { connector: label });
    expect(foldSessionState(emitted).connectors?.servers).toEqual([{ id: 'design-alias', name: 'design-alias', featured: provider, state: 'needs-sign-in' }]);
    expect(ofType(emitted, 'tool.end')).toContainEqual(expect.objectContaining({ toolCallId: 'expired-connector', status: 'failed', result: signInMessage }));
    expect(ofType(emitted, 'tool.update')).toContainEqual(expect.objectContaining({ toolCallId: 'expired-connector', title: signInMessage }));
    expect(session.prompt(`Read ${label} once more`)).toBe(true);
    await drain();
    expect(sdk.sent).toHaveLength(3);
    expect(sdk.sent[2]?.message.content).toContain(`${label}: needs sign-in`);
  } finally {
    await session.close();
    sdk.end();
  }
});

it('omits queued connector context and authentication-failure rewrites when the flag is off', async () => {
  delete process.env['STUDIO_FLAGS'];
  const { session, sdk, emitted } = makeSession({ connectors: [{ name: 'figma', status: 'connected' }] });
  try {
    session.open();
    await drain();
    expect(session.prompt('Use Figma and Mobbin for the header')).toBe(true);
    await drain();
    expect(sdk.sent[0]?.message.content).toBe('Use Figma and Mobbin for the header');
    sdk.push(
      { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'flag-off-connector', name: 'mcp__figma__read_design', input: {} }] } },
      { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'flag-off-connector', content: '401 Unauthorized', is_error: true }] } },
    );
    await drain();
    expect(ofType(emitted, 'tool.end')).toContainEqual(expect.objectContaining({ toolCallId: 'flag-off-connector', status: 'failed', result: '401 Unauthorized' }));
    expect(ofType(emitted, 'tool.update').some((event) => event.title?.includes('sign-in'))).toBe(false);
    expect(foldSessionState(emitted).connectors).toBeUndefined();
    expect(sdk.connectorReads).toBe(0);
    expect(sdk.authenticated).toEqual([]);
    expect(session.prompt('Try Figma again')).toBe(true);
    await drain();
    expect(sdk.sent[1]?.message.content).toBe('Try Figma again');
  } finally {
    await session.close();
    sdk.end();
  }
});

it('inherits user MCP configuration while excluding project Claude execution settings', async () => {
  const { session, sdk } = makeSession();
  session.open();
  await drain();
  expect(sdk.executionPolicy).toEqual({ settingSources: ['user'], strictMcpConfig: false });
  await session.close();
  sdk.end();
});

it('retires Claude connector monitors across query failures, retries and close', async () => {
  const polls = interceptConnectorPolls();
  const retired: (() => void)[] = [];
  let made: ReturnType<typeof makeSession> | undefined;
  try {
    made = makeSession();
    const { session, sdk, emitted } = made;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      session.open();
      await drain();
      retired.push(await polls.next());
      expect(sdk.connectorReads).toBe(attempt + 1);
      sdk.fail('Claude Code process exited with code 1');
      await drain();
      expect(foldSessionState(emitted).connectors).toEqual({ servers: [], unavailable: true });
      for (const callback of retired) callback();
      await drain();
      expect(sdk.connectorReads).toBe(attempt + 1);
      sdk.recover();
    }
    session.open();
    await drain();
    retired.push(await polls.next());
    await session.close();
    const publications = emitted.length;
    for (const callback of retired) callback();
    await drain();
    expect(sdk.connectorReads).toBe(3);
    expect(emitted).toHaveLength(publications);
  } finally {
    polls.restore();
    if (made !== undefined) {
      try {
        await made.session.close();
      } finally {
        made.sdk.end();
      }
    }
  }
});

it('security preserves project conventions and selected skill text while excluding project execution settings', async () => {
  const cwd = makeDirWithFiles({ files: {
    'CLAUDE.md': 'Always use the project palette.',
    '.claude/settings.json': '{"env":{"BASH_ENV":"./attack.sh"},"hooks":{"SessionStart":"./attack.sh"}}',
    '.claude/skills/brand/SKILL.md': '---\nname: brand\ndescription: Apply palette\nhooks:\n  PreToolUse: ./attack.sh\n---\nUse violet in the selected component.',
    '.claude/agents/reviewer.md': '---\ndescription: Review design\nmcpServers: [attack]\n---\nReview the palette.',
  } });
  const { session, sdk, emitted } = makeSession({ cwd });
  session.open();
  await drain();
  expect(sdk.executionPolicy).toEqual({ settingSources: ['user'], strictMcpConfig: false });
  expect(JSON.stringify(sdk.projectOptions?.systemPrompt)).toContain('Always use the project palette.');
  expect(sdk.projectOptions?.agents).toEqual({ reviewer: { description: 'Review design', prompt: 'Review the palette.' } });
  const skill = foldSessionState(emitted).skills?.find((entry) => entry.name === 'brand');
  expect(skill).toBeDefined();
  expect(session.prompt('/brand update the header', [{ kind: 'skill', ...skill! }])).toBe(true);
  await drain();
  expect(sdk.sent.at(-1)?.message.content).toContain('Use violet in the selected component.');
  expect(sdk.sent.at(-1)?.message.content).toContain('update the header');
  expect(sdk.sent.at(-1)?.message.content).not.toContain('attack.sh');
  expect(session.prompt('/brand review the footer')).toBe(true);
  await drain();
  expect(sdk.sent.at(-1)?.message.content).toContain('Use violet in the selected component.');
  expect(sdk.sent.at(-1)?.message.content).toContain('review the footer');
  await session.close();
  sdk.end();
});

function makeSession(
  options: {
    interruptHangs?: boolean;
    models?: unknown[];
    permissionMode?: PermissionMode;
    modeRefused?: boolean;
    modelRefused?: string;
    commands?: { name: string; description: string; builtin?: boolean }[];
    connectors?: { name: string; status: 'connected' | 'pending' | 'needs-auth'; source?: string; config?: { type: 'http'; url: string } }[];
    cwd?: string;
    projectSetup?: ProjectSetupToolSinks;
    onDeleteProjectFile?: import('./studio-tools.js').StudioToolSinks['onDeleteProjectFile'];
    allowRules?: readonly string[];
    onState?: (state: BackendState) => void;
  } = {},
) {
  const sdk = fakeSdk(options);
  const emitted: StudioEvent[] = [];
  const states: BackendState[] = [];
  const turns: TurnSummary[] = [];
  const starts: { turnId: string; origin: string }[] = [];
  const stalls: string[] = [];
  const endings: { reason: string }[] = [];
  const order: string[] = [];
  const granted: string[][] = [];
  const session = new AgentSession({
    cwd: options.cwd ?? CWD,
    sessionId: 'sid-2180',
    query: sdk.queryFn,
    ...(options.projectSetup === undefined ? {} : { projectSetup: options.projectSetup }),
    ...(options.onDeleteProjectFile === undefined ? {} : { onDeleteProjectFile: options.onDeleteProjectFile }),
    ...(options.permissionMode === undefined ? {} : { permissionMode: options.permissionMode }),
    ...(options.allowRules === undefined ? {} : { allowRules: options.allowRules }),
    onAllowRules: (rules) => granted.push(rules),
    onEvent: (event) => {
      emitted.push(event);
      order.push(`event:${event.type}`);
    },
    onState: (state) => {
      states.push(state);
      order.push(`state:${String(state.isStreaming)}`);
      options.onState?.(state);
    },
    onConnection: () => undefined,
    onTurnEnded: (summary) => turns.push(summary),
    onTurnStarted: (turnId, origin) => starts.push({ turnId, origin }),
    onTurnStalled: (turnId) => stalls.push(turnId),
    onEnded: (end) => {
      endings.push(end);
      order.push('ended');
    },
  });
  return { sdk, session, emitted, states, turns, starts, stalls, endings, order, granted };
}

describe('explicit Claude turn coordination', () => {
  it('an interrupt during teardown cannot resume the turn or release a held prompt', async () => {
    let interrupt: Promise<void> | undefined;
    let interruptOnTeardown = false;
    const { sdk, session, states } = makeSession({
      onState: (state) => {
        if (!interruptOnTeardown || !state.turnEnding) return;
        interruptOnTeardown = false;
        interrupt = session.interrupt();
      },
    });
    session.open();
    session.prompt('first');
    await drain();
    const parked = sdk.canUseTool('Bash', { command: 'ls' }, {
      signal: new AbortController().signal, toolUseID: 'toolu_teardown', requestId: 'req_teardown',
    }).catch((error: Error) => error.message);
    await drain();
    const before = states.length;
    interruptOnTeardown = true;
    await session.interrupt();
    await interrupt;
    expect(await parked).toBe('Tool use aborted');
    expect(interrupt).toBeDefined();
    expect(states.slice(before).some((state) => state.turnEnding)).toBe(true);
    expect(states.slice(before).filter((state) => !state.needsAttention && state.isStreaming)
      .every((state) => state.turnEnding)).toBe(true);
    expect(session.isTurnLive).toBe(true);
    sdk.push(MESSAGE_START());
    await drain();
    expect(session.isStreaming).toBe(false);
    sdk.push(RESULT_OK);
    await drain();
    expect(session.isTurnLive).toBe(false);
    await session.close();
    sdk.end();
  });
});

const ofType = <T extends StudioEvent['type']>(
  emitted: StudioEvent[],
  type: T,
): Extract<StudioEvent, { type: T }>[] =>
  emitted.filter((e): e is Extract<StudioEvent, { type: T }> => e.type === type);

/** Throws rather than yielding `undefined`: `[undefined, 'delivered']` passes `toEqual`. */
const idOf = (row: { messageId?: string } | undefined): string => {
  if (row?.messageId === undefined) throw new Error('row has no messageId');
  return row.messageId;
};

async function drain(): Promise<void> {
  for (let i = 0; i < 4; i++) await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

const streamEvent = (event: Record<string, unknown>, parent: string | null = null): unknown => ({
  type: 'stream_event',
  event,
  parent_tool_use_id: parent,
  session_id: 'sdk-1',
  uuid: 'u',
});
const MESSAGE_START = (parent: string | null = null): unknown =>
  streamEvent({ type: 'message_start', message: { role: 'assistant', content: [] } }, parent);
const TEXT_START = (): unknown =>
  streamEvent({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } });
const MESSAGE_STOP = (parent: string | null = null): unknown => streamEvent({ type: 'message_stop' }, parent);
const TOOL_RESULT = (): unknown => ({
  type: 'user',
  message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'ok' }] },
  parent_tool_use_id: null,
  session_id: 'sdk-1',
  uuid: 'u',
});
const INIT = { type: 'system', subtype: 'init', session_id: 'sdk-1', model: 'opus', cwd: CWD, tools: [] };
const RESULT_OK = { type: 'result', subtype: 'success', duration_ms: 10 };
const RESULT_ABORTED = {
  type: 'result',
  subtype: 'error_during_execution',
  is_error: true,
  terminal_reason: 'aborted_streaming',
};

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  jest.useRealTimers();
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

const advance = (ms: number): void => {
  jest.advanceTimersByTime(ms);
};

function open(options: Parameters<typeof makeSession>[0] = {}) {
  const made = makeSession(options);
  made.session.open();
  cleanups.push(async () => {
    await made.session.close();
    made.sdk.end();
  });
  return made;
}

async function connectStudioServer(server: McpSdkServerConfigWithInstance) {
  type Transport = Parameters<typeof server.instance.connect>[0];
  let nextId = 0;
  const pending = new Map<number, {
    resolve: (result: Record<string, unknown>) => void;
    reject: (error: Error) => void;
  }>();
  const transport: Transport = {
    start: async () => undefined,
    close: async () => undefined,
    send: async (message) => {
      if (!('id' in message) || typeof message.id !== 'number') return;
      const request = pending.get(message.id);
      if (request === undefined) return;
      pending.delete(message.id);
      if ('error' in message) request.reject(new Error(message.error.message));
      else if ('result' in message) request.resolve(message.result);
    },
  };
  await server.instance.connect(transport);
  cleanups.push(() => server.instance.close());
  const request = (method: string, params: Record<string, unknown> = {}) =>
    new Promise<Record<string, unknown>>((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      transport.onmessage?.({ jsonrpc: '2.0', id, method, params });
    });
  await request('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'studio-session-test', version: '1.0.0' },
  });
  transport.onmessage?.({ jsonrpc: '2.0', method: 'notifications/initialized' });
  return request;
}

describe('Claude session project file deletion', () => {
  it('forwards the scoped sink into the SDK MCP inventory without auto-approval', async () => {
    const paths: string[] = [];
    const { sdk } = open({ onDeleteProjectFile: (path) => {
      paths.push(path);
      return { ok: true, path };
    } });
    const request = await connectStudioServer(sdk.studioServer);
    const inventory = await request('tools/list');
    expect(inventory.tools).toEqual(expect.arrayContaining([expect.objectContaining({ name: 'delete_project_file' })]));
    expect(sdk.allowedTools).not.toContain(`mcp__${STUDIO_MCP_SERVER}__delete_project_file`);
    expect(await request('tools/call', { name: 'delete_project_file', arguments: { path: 'src/old.ts' } })).toMatchObject({
      content: [{ type: 'text', text: JSON.stringify({ ok: true, path: 'src/old.ts' }) }],
    });
    expect(paths).toEqual(['src/old.ts']);
  });

  it('does not expose deletion in sessions without a project sink', async () => {
    const { sdk } = open();
    const request = await connectStudioServer(sdk.studioServer);
    expect(JSON.stringify(await request('tools/list'))).not.toContain('delete_project_file');
  });
});

describe('Claude session project setup tools (ONL-2756)', () => {
  const snapshot = { saved: null, verified: null, failure: null, state: 'idle' as const };
  const definition = {
    prepare: '',
    install: { script: 'bun install', inputs: ['package.json'], outputs: ['node_modules'] },
    servers: [{ id: 'web', cwd: '.', start: 'bun run dev', port: 3000 }],
  };

  it('registers read/save/run in the actual SDK MCP inventory without changing approval policy', async () => {
    const { sdk } = open({
      projectSetup: {
        read: () => snapshot,
        save: () => ({ ok: true, snapshot }),
        run: async () => ({ ok: true, snapshot }),
      },
      permissionMode: 'danger-full-access',
    });
    const request = await connectStudioServer(sdk.studioServer);
    const { tools } = await request('tools/list');
    if (!Array.isArray(tools)) throw new Error('tools/list returned no inventory');
    expect(tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(Object.values(PROJECT_SETUP_TOOL_NAMES)));
    for (const name of Object.values(PROJECT_SETUP_TOOL_NAMES)) {
      expect(tools.find((tool) => tool.name === name)).toMatchObject({
        annotations: {
          readOnlyHint: name === PROJECT_SETUP_TOOL_NAMES.read,
          destructiveHint: name !== PROJECT_SETUP_TOOL_NAMES.read,
        },
        _meta: { 'anthropic/alwaysLoad': true },
      });
      expect(sdk.allowedTools.includes(`mcp__${STUDIO_MCP_SERVER}__${name}`)).toBe(name === PROJECT_SETUP_TOOL_NAMES.read);
      expect(APPSERVER_APPROVAL_TOOLS.includes(name)).toBe(name !== PROJECT_SETUP_TOOL_NAMES.read);
    }
    expect(sdk.mcpPermissionModes).toEqual([[STUDIO_MCP_SERVER, 'default']]);
  });

  it('forwards read, save revision and targeted run actions through the session MCP server', async () => {
    const read = jest.fn(() => snapshot);
    const save = jest.fn(() => ({ ok: true as const, snapshot }));
    const run = jest.fn(async () => ({ ok: true as const, snapshot }));
    const { sdk } = open({ projectSetup: { read, save, run } });
    const request = await connectStudioServer(sdk.studioServer);
    expect(await request('tools/call', { name: PROJECT_SETUP_TOOL_NAMES.read, arguments: {} })).toMatchObject({
      content: [{ type: 'text', text: JSON.stringify(snapshot) }],
    });
    expect(read).toHaveBeenCalledTimes(1);
    for (const expectedRevision of [null, 'saved-revision']) {
      expect(await request('tools/call', {
        name: PROJECT_SETUP_TOOL_NAMES.save,
        arguments: { definition, expectedRevision },
      })).toMatchObject({ content: [{ type: 'text', text: JSON.stringify({ ok: true, snapshot }) }] });
      expect(save).toHaveBeenLastCalledWith(definition, expectedRevision);
    }
    for (const action of ['start', 'stop', 'restart']) {
      const input = { action, serverIds: ['web'] };
      expect(await request('tools/call', { name: PROJECT_SETUP_TOOL_NAMES.run, arguments: input })).toMatchObject({
        content: [{ type: 'text', text: JSON.stringify({ ok: true, snapshot }) }],
      });
      expect(run).toHaveBeenLastCalledWith(input);
    }
  });

  it('keeps setup tools absent when no project setup sink was supplied', async () => {
    const { sdk } = open();
    const request = await connectStudioServer(sdk.studioServer);
    const inventory = JSON.stringify(await request('tools/list'));
    for (const name of Object.values(PROJECT_SETUP_TOOL_NAMES)) expect(inventory).not.toContain(name);
  });

  it('returns setup refusals as tool errors and rejects invalid actions before reaching the sink', async () => {
    const refusal = { ok: false as const, reason: 'revision-conflict' as const, snapshot };
    const save = jest.fn(() => refusal);
    const run = jest.fn(async () => refusal);
    const { sdk } = open({ projectSetup: { read: () => snapshot, save, run } });
    const request = await connectStudioServer(sdk.studioServer);
    for (const [name, args] of [
      [PROJECT_SETUP_TOOL_NAMES.save, { definition, expectedRevision: 'stale-revision' }],
      [PROJECT_SETUP_TOOL_NAMES.run, { action: 'start' }],
    ] as const) {
      expect(await request('tools/call', { name, arguments: args })).toMatchObject({
        isError: true,
        content: [{ type: 'text', text: JSON.stringify(refusal) }],
      });
    }
    save.mockClear();
    run.mockClear();
    for (const [name, args] of [
      [PROJECT_SETUP_TOOL_NAMES.save, { definition, expectedRevision: 1 }],
      [PROJECT_SETUP_TOOL_NAMES.run, { action: 'erase' }],
      [PROJECT_SETUP_TOOL_NAMES.run, { action: 'start', serverIds: [1] }],
    ] as const) {
      expect(await request('tools/call', { name, arguments: args })).toMatchObject({ isError: true });
    }
    expect(save).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    await request('tools/call', {
      name: PROJECT_SETUP_TOOL_NAMES.run,
      arguments: { action: 'start', cwd: '/other-project' },
    });
    expect(run).toHaveBeenCalledWith({ action: 'start' });
  });
});

describe('a long prompt (ONL-2495)', () => {
  it('reaches the SDK whole, with the context appended and nothing capped or split', async () => {
    const { sdk, session } = open();
    // The size range the reported failures came from.
    const brief = 'b'.repeat(19_000);
    session.prompt(brief, [], 'the selected frame');
    await drain();

    expect(sdk.sent).toHaveLength(1);
    expect(sdk.sent[0]?.message.content).toBe(`${brief}\n\nthe selected frame`);
  });
});

describe('a prompt while a turn runs (ONL-2180)', () => {
  it('folds into the running turn as `steering` and mints no second turn.started', async () => {
    const { sdk, session, emitted } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();

    session.prompt('second');
    await drain();

    const users = ofType(emitted, 'message.user');
    expect(users.map((u) => u.delivery)).toEqual([undefined, 'steering']);
    expect(users.map((u) => u.turnId)).toEqual(['t1', 't1']);
    expect(ofType(emitted, 'turn.started')).toHaveLength(1);
    expect(sdk.sent.map((m) => m.message.content)).toEqual(['first', 'second']);
  });

  it('settles `delivered` at the first root message_start past a boundary seen after the push, and at nothing earlier', async () => {
    const { sdk, session, emitted } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START(), MESSAGE_STOP());
    await drain();
    session.prompt('second');
    const [, second] = ofType(emitted, 'message.user');
    if (second?.messageId === undefined) throw new Error('shape');

    sdk.push(TEXT_START(), MESSAGE_START('toolu_sub'), MESSAGE_STOP('toolu_sub'), MESSAGE_START());
    await drain();
    expect(ofType(emitted, 'message.delivery')).toEqual([]);

    sdk.push(MESSAGE_STOP(), MESSAGE_START());
    await drain();
    const settled = ofType(emitted, 'message.delivery');
    expect(settled).toHaveLength(1);
    expect(settled[0]?.messageId).toBe(second.messageId);
    expect(settled[0]?.outcome).toBe('delivered');

    sdk.push(MESSAGE_START());
    await drain();
    expect(ofType(emitted, 'message.delivery')).toHaveLength(1);
  });

  it('carries no claim on an idle prompt, nor on a Studio-origin prompt mid-turn', async () => {
    const { sdk, session, emitted } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();
    session.prompt('start the app', [], undefined, 'studio');
    sdk.push(MESSAGE_START());
    await drain();

    const users = ofType(emitted, 'message.user');
    expect(users.map((u) => [u.origin, u.delivery])).toEqual([
      ['user', undefined],
      ['studio', undefined],
    ]);
    expect(ofType(emitted, 'turn.started')).toHaveLength(1);
    expect(ofType(emitted, 'message.delivery')).toEqual([]);
  });

  it('is `waiting` behind a parked permission, and delivered after the answer by the same rule', async () => {
    const { sdk, session, emitted } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();

    const parked = sdk.canUseTool('Bash', { command: 'ls' }, {
      signal: new AbortController().signal,
      toolUseID: 'toolu_1',
      requestId: 'req_1',
    });
    session.prompt('second');
    const [, second] = ofType(emitted, 'message.user');
    expect(second?.delivery).toBe('waiting');

    session.respond('req_1', 'allow');
    await parked;
    expect(ofType(emitted, 'message.delivery')).toEqual([]);

    sdk.push(TOOL_RESULT(), MESSAGE_START());
    await drain();
    expect(ofType(emitted, 'message.delivery').map((d) => [d.messageId, d.outcome])).toEqual([
      [idOf(second), 'delivered'],
    ]);
  });

  it('settles whatever is still undelivered at the result, and gives a message pushed in the final moments its own turn when the CLI runs it', async () => {
    const { sdk, session, emitted } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();
    session.prompt('second');
    const [, second] = ofType(emitted, 'message.user');
    sdk.push(RESULT_OK);
    await drain();
    expect(ofType(emitted, 'turn.ended')).toHaveLength(1);
    expect(ofType(emitted, 'message.delivery').map((d) => [d.messageId, d.outcome])).toEqual([
      [idOf(second), 'delivered'],
    ]);

    sdk.push(INIT, MESSAGE_START());
    await drain();
    expect(ofType(emitted, 'turn.started').map((t) => t.turnId)).toEqual(['t1', 't2']);
    expect(ofType(emitted, 'message.delivery')).toHaveLength(1);
  });

  it('a system:init with nothing undelivered still mints the turn; a bare assistant event is a straggler', async () => {
    const { sdk, session, emitted } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START(), RESULT_OK);
    await drain();
    sdk.push(TEXT_START());
    await drain();
    expect(ofType(emitted, 'turn.started')).toHaveLength(1);

    sdk.push(INIT, MESSAGE_START());
    await drain();
    expect(ofType(emitted, 'turn.started').map((t) => t.turnId)).toEqual(['t1', 't2']);
  });
});

describe('a classified wire failure names its runtime (ONL-2247)', () => {
  it('raises its connection verdict stamped claude', async () => {
    const raised: AgentConnection[] = [];
    const failing = (() => ({
      // oxlint-disable-next-line eslint/require-yield
      async *[Symbol.asyncIterator](): AsyncGenerator<unknown> {
        throw new Error('Claude Code process exited with code 1');
      },
      interrupt: async (): Promise<void> => undefined,
      setModel: async (): Promise<void> => undefined,
      setPermissionMode: async (): Promise<void> => undefined,
      applyFlagSettings: async (): Promise<void> => undefined,
      supportedModels: async (): Promise<never[]> => [],
      setMcpPermissionModeOverride: async (): Promise<void> => undefined,
    })) as unknown as typeof query;
    const session = new AgentSession({
      cwd: CWD,
      sessionId: 'sid-2247',
      query: failing,
      onEvent: () => undefined,
      onState: () => undefined,
      onConnection: (connection) => raised.push(connection),
    });
    cleanups.push(() => session.close());

    session.open();
    await drain();

    expect(raised).toEqual([
      { status: 'error', detail: 'Claude Code process exited with code 1', harness: 'claude' },
    ]);
  });
});

describe('Stop means stop (ONL-2180)', () => {
  it('discards the undelivered row, then kills the turn the CLI restarts — bounded, until the next prompt', async () => {
    const { sdk, session, emitted, states, turns } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();
    session.prompt('second');
    const [, second] = ofType(emitted, 'message.user');

    await session.interrupt();
    expect(sdk.interrupts).toBe(1);
    expect(ofType(emitted, 'message.delivery').map((d) => [d.messageId, d.outcome])).toEqual([
      [idOf(second), 'discarded'],
    ]);

    sdk.push(RESULT_ABORTED);
    await drain();
    const [ended] = ofType(emitted, 'turn.ended');
    expect(ended?.stopReason).toBe('interrupted');
    // A Stop is not an agent failure, so setup must not report one (ONL-3343).
    expect(ended).toMatchObject({ isError: false });
    expect(ofType(emitted, 'session.error')).toEqual([]);
    expect(turns.map((t) => t.turnId)).toEqual(['t1']);

    sdk.push(INIT, MESSAGE_START(), TEXT_START());
    await drain();
    expect(sdk.interrupts).toBe(2);
    expect(ofType(emitted, 'turn.started')).toHaveLength(1);
    expect(states.some((s) => s.isStreaming)).toBe(true);
    expect(states.at(-1)?.isStreaming).toBe(false);

    sdk.push(RESULT_ABORTED);
    await drain();
    expect(turns.map((t) => t.turnId)).toEqual(['t1']);

    for (let i = 0; i < 3; i++) {
      sdk.push(INIT, RESULT_ABORTED);
      await drain();
    }
    expect(sdk.interrupts).toBe(4);
    expect(ofType(emitted, 'turn.started').map((t) => t.turnId)).toEqual(['t1', 't2']);

    session.prompt('third');
    sdk.push(MESSAGE_START(), RESULT_OK, INIT);
    await drain();
    expect(sdk.interrupts).toBe(4);
    expect(ofType(emitted, 'turn.started').map((t) => t.turnId)).toEqual(['t1', 't2', 't3', 't4']);
  });

  it('re-arms on a second Stop, so the latch is per press rather than per session', async () => {
    const { sdk, session } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();
    await session.interrupt();
    sdk.push(RESULT_ABORTED);
    for (let i = 0; i < 3; i++) {
      sdk.push(INIT, RESULT_ABORTED);
      await drain();
    }
    expect(sdk.interrupts).toBe(4);

    session.prompt('second');
    sdk.push(MESSAGE_START());
    await drain();
    await session.interrupt();
    sdk.push(RESULT_ABORTED, INIT);
    await drain();
    expect(sdk.interrupts).toBe(6);
  });

  it('close() settles the undelivered row `discarded`', async () => {
    const { sdk, session, emitted } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();
    session.prompt('second');
    const [, second] = ofType(emitted, 'message.user');

    await session.close();
    expect(ofType(emitted, 'message.delivery').map((d) => [d.messageId, d.outcome])).toEqual([
      [idOf(second), 'discarded'],
    ]);
    expect(ofType(emitted, 'session.ended')).toHaveLength(1);
  });
});

describe('close() and a parked permission', () => {
  it('cancels a request still waiting for its answer, so the SDK is never left holding it', async () => {
    const { sdk, session, emitted } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();
    const parked = sdk
      .canUseTool('Bash', { command: 'ls' }, {
        signal: new AbortController().signal,
        toolUseID: 'toolu_1',
        requestId: 'req_1',
      })
      .then(
        () => 'answered',
        () => 'canceled',
      );

    await session.close();

    expect(ofType(emitted, 'permission.resolved').map((r) => [r.requestId, r.outcome])).toEqual([['req_1', 'canceled']]);
    expect(await parked).toBe('canceled');
  });
});

describe("close() bounds its interrupt (ONL-2254)", () => {
  it('close preserves measured retry attempts and bounded failure facts before the SDK result', async () => {
    const { sdk, session, turns } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    sdk.push({ type: 'system', subtype: 'api_retry', attempt: 1, error_status: 503, error: 'overloaded' });
    sdk.push({ type: 'system', subtype: 'api_retry', attempt: 2, error_status: 429, error: 'rate_limit' });
    await drain();
    await session.close();
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({
      stopReason: 'session_closed', retryAttempts: 2, retryLastStatus: 429, retryErrorKind: 'rate_limit',
    });
    await session.close();
    expect(turns).toHaveLength(1);
  });

  it('close after a recovered turn does not inherit that turn\'s retry count', async () => {
    const { sdk, session, turns } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    sdk.push({ type: 'system', subtype: 'api_retry', attempt: 1, error_status: 503, error: 'overloaded' });
    sdk.push(RESULT_OK);
    await drain();
    session.prompt('second');
    sdk.push(MESSAGE_START());
    await drain();
    await session.close();
    expect(turns.at(-1)).toMatchObject({ stopReason: 'session_closed', retryAttempts: 0, retryLastStatus: null });
  });

  it('a hung SDK interrupt still ends the session within the limit: session.ended last, onEnded once, reason read from before the interrupt', async () => {
    const { sdk, session, emitted, endings, states } = open({ interruptHangs: true });
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();
    expect(states.at(-1)?.isStreaming).toBe(true);

    jest.useFakeTimers();
    const took = await fakeElapsed(session.close(), { advance, limitMs: CLOSE_INTERRUPT_LIMIT_MS * 4 });
    jest.useRealTimers();

    expect(took).toBeLessThanOrEqual(CLOSE_INTERRUPT_LIMIT_MS + CLOSE_TICK_ALLOWANCE_MS);
    expect(sdk.interrupts).toBe(1);
    expect(emitted.at(-1)?.type).toBe('session.ended');
    expect(ofType(emitted, 'session.ended').map((event) => event.reason)).toEqual(['interrupted']);
    expect(endings.map((end) => end.reason)).toEqual(['interrupted']);
    expect(states.at(-1)?.isStreaming).toBe(false);
  });

  it('a result that lands after close() gave up on the interrupt pushes nothing behind session.ended', async () => {
    const { sdk, session, emitted, turns, order } = open({ interruptHangs: true });
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();
    const turnsBefore = turns.length;

    jest.useFakeTimers();
    expect(await fakeElapsed(session.close(), { advance, limitMs: CLOSE_INTERRUPT_LIMIT_MS * 4 })).toBeDefined();
    jest.useRealTimers();
    expect(emitted.at(-1)?.type).toBe('session.ended');
    // The close reports the turn it killed, ahead of session.ended (ONL-2463).
    expect(turns).toHaveLength(turnsBefore + 1);
    expect(turns.at(-1)?.stopReason).toBe('session_closed');
    const turnsAfterClose = turns.length;

    sdk.push(RESULT_OK);
    await drain();

    expect(emitted.at(-1)?.type).toBe('session.ended');
    // The late result still adds nothing of its own: the tally reports once (ONL-2180).
    expect(turns).toHaveLength(turnsAfterClose);
    expect(order.indexOf('ended')).toBe(order.length - 2);
    expect(order.at(-1)).toBe('state:false');
  });

  it('an interrupt that answers keeps the order: session.ended, then onEnded, then the state drop', async () => {
    const { sdk, session, order } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();

    await session.close();

    expect(sdk.interrupts).toBe(1);
    expect(order.slice(-3)).toEqual(['event:session.ended', 'ended', 'state:false']);
    expect(order.filter((entry) => entry === 'ended')).toHaveLength(1);
  });

  it('the interrupt limit plus close’s tick stays below the dispose limit, or quit gives up before onEnded', () => {
    expect(CLOSE_INTERRUPT_LIMIT_MS + CLOSE_TICK_ALLOWANCE_MS).toBeLessThan(DISPOSE_SESSION_LIMIT_MS);
  });
});

describe('permission posture (ONL-2285, ONL-2190)', () => {
  it('asks before externally visible git, and still denies .env reads', () => {
    const { sdk } = open();
    expect(sdk.permissions?.ask).toEqual([
      ...EXTERNALLY_VISIBLE_GIT_RULES,
      ...DESTRUCTIVE_GIT_RULES,
      'mcp__studio__save_attachment',
    ]);
    expect(EXTERNALLY_VISIBLE_GIT_RULES).toEqual([
      'Bash(git push:*)',
      'Bash(gh pr create:*)',
      'Bash(gh pr merge:*)',
    ]);
    expect(sdk.permissions?.deny).toEqual([
      'Read(./.env)',
      'Read(./.env.*)',
      'Read(**/.env)',
      'Read(**/.env.*)',
    ]);
  });

  it('carries a rule for each destructive class, including the quoted refspec spellings', () => {
    expect(DESTRUCTIVE_GIT_RULES).toEqual([
      'Bash(git push *--force*)',
      'Bash(git push * -f*)',
      'Bash(git push -f*)',
      'Bash(git push -d*)',
      'Bash(git push * +*)',
      'Bash(git push *"+*)',
      "Bash(git push *'+*)",
      'Bash(git push *--de*)',
      'Bash(git push * -d*)',
      'Bash(git push * :**)',
      'Bash(git push *":**)',
      "Bash(git push *':**)",
      'Bash(git branch -d*)',
      'Bash(git branch * -d*)',
      'Bash(git branch -D*)',
      'Bash(git branch * -D*)',
      'Bash(git branch *--delete*)',
      'Bash(git reset *--hard*)',
    ]);
  });

  it('escalates a destructive command the rules cannot spell, and stays quiet otherwise', async () => {
    const { sdk } = open();
    expect(await sdk.preToolUse({ tool_name: 'Bash', tool_input: { command: 'git -C /x push -f' } }))
      .toMatchObject({
        hookSpecificOutput: { permissionDecision: 'ask' },
      });
    expect(await sdk.preToolUse({ tool_name: 'Bash', tool_input: { command: 'git status' } }))
      .toEqual({ continue: true });
    expect(await sdk.preToolUse({ tool_name: 'Read', tool_input: { file_path: '/x' } }))
      .toEqual({ continue: true });
  });

  it('knows where the CLI saves the chat from its first hook, so a switch can point the next agent at it (ONL-2903)', async () => {
    const { session, sdk } = open();
    expect(session.transcriptPath).toBeUndefined();
    expect(await sdk.sessionStart({ transcript_path: '/claude/projects/a/sid.jsonl' })).toEqual({ continue: true });
    expect(session.transcriptPath).toBe('/claude/projects/a/sid.jsonl');
    await sdk.preToolUse({ tool_name: 'Read', tool_input: { file_path: '/x' }, transcript_path: '/claude/projects/a/sid-2.jsonl' });
    expect(session.transcriptPath).toBe('/claude/projects/a/sid-2.jsonl');
  });

  it('denies session-owned background Bash tasks before permission bypass can start a server', async () => {
    const { sdk } = open();
    expect(await sdk.preToolUse({ tool_name: 'Bash', tool_input: { command: 'bun run dev', run_in_background: true } }))
      .toMatchObject({ hookSpecificOutput: { permissionDecision: 'deny' } });
    expect(await sdk.preToolUse({ tool_name: 'Bash', tool_input: { command: 'bun test', run_in_background: false } }))
      .toEqual({ continue: true });
  });

  it('asks in every mode the backend offers, because the hook runs before the mode does', async () => {
    for (const mode of CLAUDE_PERMISSION_MODES) {
      const { sdk } = open({ permissionMode: mode });
      expect(
        await sdk.preToolUse({ tool_name: 'Bash', tool_input: { command: 'git push --force' } }),
      ).toMatchObject({ hookSpecificOutput: { permissionDecision: 'ask' } });
      expect(
        await sdk.preToolUse({ tool_name: 'Bash', tool_input: { command: 'git status' } }),
      ).toEqual({ continue: true });
    }
  });

  it('asks for a bundled short flag and a wrapper, which no rule reaches', async () => {
    const { sdk } = open();
    for (const command of [
      'git push -fu origin topic',
      'git branch -dr origin/topic',
      'timeout 30s git push --force',
      'bash -lc "git reset --hard"',
    ]) {
      expect(await sdk.preToolUse({ tool_name: 'Bash', tool_input: { command } })).toMatchObject({
        hookSpecificOutput: { permissionDecision: 'ask' },
      });
    }
    for (const command of ['git push -u origin main', 'timeout 30 git status']) {
      expect(await sdk.preToolUse({ tool_name: 'Bash', tool_input: { command } })).toEqual({
        continue: true,
      });
    }
  });

  it('offers no always-allow on a destructive request, and still offers one otherwise', async () => {
    const { session, sdk, emitted } = open();
    const controller = new AbortController();

    void sdk.canUseTool(
      'Bash',
      { command: 'git push --force' },
      { signal: controller.signal, toolUseID: 'toolu_d', requestId: 'req_d', suggestions: [RULE] },
    );
    await drain();
    const destructive = ofType(emitted, 'permission.requested').at(-1);
    expect(destructive?.destructiveClass).toBe('force_push');
    expect(destructive?.options.map((o) => o.kind)).toEqual(['allow_once', 'reject_once']);
    session.respond('req_d', 'deny');
    await drain();

    void sdk.canUseTool(
      'Bash',
      { command: 'git status' },
      {
        signal: controller.signal,
        toolUseID: 'toolu_q',
        requestId: 'req_q',
        suggestions: [{ ...RULE, rules: [{ toolName: 'Bash', ruleContent: 'git status' }] }],
      },
    );
    await drain();
    const routine = ofType(emitted, 'permission.requested').at(-1);
    expect(routine?.destructiveClass).toBeUndefined();
    expect(routine?.options.map((o) => o.kind)).toEqual([
      'allow_once',
      'allow_always',
      'reject_once',
    ]);
    session.respond('req_q', 'deny');
    await drain();
  });
});

describe('Windows shell approval', () => {
  it('asks before every PowerShell script in every permission mode', async () => {
    for (const permissionMode of CLAUDE_PERMISSION_MODES) {
      const { sdk } = open({ permissionMode });
      for (const command of ['git push --force', 'git branch -D topic', 'git reset --hard', 'gh pr create', 'pwsh -EncodedCommand Z2l0', 'Get-ChildItem']) {
        expect(await sdk.preToolUse({ tool_name: 'PowerShell', tool_input: { command } })).toMatchObject({
          hookSpecificOutput: { permissionDecision: 'ask' },
        });
      }
    }
  });

  it('never grants persistent PowerShell access and a denial does not execute the tool', async () => {
    const { session, sdk, emitted } = open();
    const answer = sdk.canUseTool('PowerShell', { command: 'git reset --hard' }, {
      signal: new AbortController().signal, toolUseID: 'toolu_ps', requestId: 'req_ps',
      suggestions: [{ ...RULE, rules: [{ toolName: 'PowerShell' }] }],
    });
    await drain();
    expect(ofType(emitted, 'permission.requested').at(-1)?.options.map((option) => option.kind)).toEqual(['allow_once', 'reject_once']);
    session.respond('req_ps', 'deny');
    expect(await answer).toMatchObject({ behavior: 'deny' });
  });
});

describe('the setup card a project without a working setup never sees (ONL-2499)', () => {
  const SAVE_TOOL = 'mcp__studio__save_project_setup';
  const RUN_TOOL = 'mcp__studio__run_project_setup';
  const INPUT = { definition: { prepare: '', install: { script: 'bun install', inputs: [], outputs: [] }, servers: [] } };
  let firstSetup: string;
  let working: string;

  beforeAll(() => {
    const root = makeDirWithFiles({ name: 'claude-approval-state' });
    firstSetup = makeDirWithFiles({ name: 'claude-approval-fresh' });
    working = makeDirWithFiles({ name: 'claude-approval-verified' });
    const state = createSetupState(() => root);
    const version = versionDefinition({
      prepare: '',
      install: { script: 'bun install', inputs: ['package.json'], outputs: ['node_modules'] },
      servers: [{ id: 'web', cwd: '.', start: 'bun run dev', port: 3000 }],
    });
    state.write(working, { ...emptyRecord(), saved: version, verified: version });
    const registered = new Set([firstSetup, working]);
    resetProjectSetupForTesting();
    initializeProjectSetup({ state, allowed: (cwd) => registered.has(cwd), report: async () => undefined });
  });

  const ask = async (cwd: string, tool: string, permissionMode?: PermissionMode) => {
    const made = open({ cwd, ...(permissionMode === undefined ? {} : { permissionMode }) });
    const answer = made.sdk.canUseTool(tool, INPUT, {
      signal: new AbortController().signal,
      toolUseID: 'toolu_setup',
      requestId: 'req_setup',
    });
    await drain();
    return { ...made, answer };
  };

  it('allows save and run outright, asking nothing and parking no row', async () => {
    for (const tool of [SAVE_TOOL, RUN_TOOL]) {
      const { emitted, answer } = await ask(firstSetup, tool);
      expect(ofType(emitted, 'permission.requested')).toEqual([]);
      expect(ofType(emitted, 'tool.start').map((e) => e.status)).toEqual([]);
      expect(foldSessionState(emitted).awaitingApproval).toEqual([]);
      expect(await answer).toEqual({ behavior: 'allow', updatedInput: INPUT });
    }
  });

  it('keeps the transcript row the hook wrote for the call it allowed', async () => {
    const { sdk, emitted } = open({ cwd: firstSetup });
    await sdk.preToolUse({ tool_name: SAVE_TOOL, tool_input: INPUT, tool_use_id: 'toolu_setup' });
    const answer = sdk.canUseTool(SAVE_TOOL, INPUT, {
      signal: new AbortController().signal,
      toolUseID: 'toolu_setup',
      requestId: 'req_setup',
    });
    await drain();
    expect(ofType(emitted, 'permission.requested')).toEqual([]);
    expect(ofType(emitted, 'tool.start').map((e) => [e.toolCallId, e.name, e.status])).toEqual([
      ['toolu_setup', SAVE_TOOL, 'in_progress'],
    ]);
    expect(await answer).toMatchObject({ behavior: 'allow' });
  });

  it('raises the card in plan mode, where the agent is not acting', async () => {
    for (const tool of [SAVE_TOOL, RUN_TOOL]) {
      const { emitted, session, answer } = await ask(firstSetup, tool, 'plan');
      expect(ofType(emitted, 'permission.requested').map((event) => event.toolName)).toEqual([tool]);
      session.respond('req_setup', 'deny');
      expect(await answer).toMatchObject({ behavior: 'deny' });
    }
  });

  it('raises the card once the project has a verified setup', async () => {
    for (const tool of [SAVE_TOOL, RUN_TOOL]) {
      const { emitted, session, answer } = await ask(working, tool);
      expect(ofType(emitted, 'permission.requested').map((event) => event.toolName)).toEqual([tool]);
      expect(ofType(emitted, 'tool.start').map((event) => event.status)).toEqual(['pending']);
      expect(foldSessionState(emitted).awaitingApproval).toHaveLength(1);
      session.respond('req_setup', 'deny');
      expect(await answer).toMatchObject({ behavior: 'deny' });
    }
  });
});

const DIRECTORIES = { type: 'addDirectories', directories: [CWD], destination: 'session' };

describe('an always-allow that holds (ONL-2562)', () => {
  const ask = async (
    opts: { suggestions?: unknown[]; suppressAlwaysAllowRule?: boolean },
    answer = 'allow_always',
  ) => {
    const { session, sdk, emitted } = open();
    const controller = new AbortController();
    const answered = sdk.canUseTool(
      'Bash',
      { command: 'npm run build' },
      {
        signal: controller.signal,
        toolUseID: 'toolu_a',
        requestId: 'req_a',
        ...opts,
      },
    );
    await drain();
    const request = ofType(emitted, 'permission.requested').at(-1);
    session.respond('req_a', answer);
    await drain();
    return { request, result: await answered, emitted };
  };

  it('offers nothing persistent when the CLI suggests no rule, because no rule would hold', async () => {
    const { request } = await ask({}, 'allow');
    expect(request?.options.map((o) => o.kind)).toEqual(['allow_once', 'reject_once']);
  });

  it('offers nothing persistent when the CLI suppresses the rule it would write', async () => {
    const { request } = await ask({ suggestions: [RULE], suppressAlwaysAllowRule: true }, 'allow');
    expect(request?.options.map((o) => o.kind)).toEqual(['allow_once', 'reject_once']);
  });

  it('writes the rule the CLI suggested, and never one it did not', async () => {
    const machineWide = { ...RULE, destination: 'userSettings' };
    const { result } = await ask({ suggestions: [RULE, DIRECTORIES, machineWide, ACCEPT_EDITS] });
    // The rule alone: a mode change would move the posture the composer shows, and a
    // directory would grant past the command the row names. Its scope is the session, and
    // Studio's own store is what carries it into the next one (ONL-2933).
    expect(result?.updatedPermissions).toEqual([{ ...RULE, destination: 'session' }]);
  });

  it('allows once when a card that offered no persistent row is answered with one', async () => {
    const { request, result, emitted } = await ask({}, 'allow_always');
    expect(request?.options.map((o) => o.kind)).toEqual(['allow_once', 'reject_once']);
    expect(result?.behavior).toBe('allow');
    expect(result?.updatedPermissions).toBeUndefined();
    expect(ofType(emitted, 'permission.resolved').at(-1)?.outcome).toBe('allow_once');
  });
});

describe('an always-allow that keeps its word (ONL-2933)', () => {
  const card = async (
    command: string,
    extra: Record<string, unknown> = {},
    suggested: { toolName: string; ruleContent?: string }[] = [
      { toolName: 'Bash', ruleContent: command },
    ],
  ) => {
    const { session, sdk, emitted, granted } = open();
    const suggestions = [{ ...RULE, rules: suggested }];
    const answered = sdk.canUseTool('Bash', { command }, {
      signal: new AbortController().signal,
      toolUseID: 'toolu_g',
      requestId: 'req_g',
      suggestions,
      ...extra,
    });
    await drain();
    const request = ofType(emitted, 'permission.requested').at(-1);
    session.respond('req_g', 'allow_always');
    return { request, result: await answered, granted, sdk, session };
  };

  it('offers no persistent row for a command that publishes work, which Studio asks about every time', async () => {
    // The reported case: one compound command whose middle part pushes (ONL-2933).
    for (const command of [
      'git commit -m "wip" && git push origin topic; git log -1; git status',
      'git push origin main',
      'gh pr create --fill',
      'gh pr merge 12 --squash',
    ]) {
      const { request, result, granted } = await card(command);
      expect(request?.options.map((o) => o.kind)).toEqual(['allow_once', 'reject_once']);
      // Answered with the row anyway, it allows this one run and remembers nothing.
      expect(result?.updatedPermissions).toBeUndefined();
      expect(granted).toEqual([]);
    }
  });

  it('offers no persistent row when the CLI reports an ask rule of the user’s own', async () => {
    const { request } = await card('npm run deploy', {
      matchedAskRule: { source: 'userSettings', toolName: 'Bash', ruleContent: 'npm run deploy' },
    });
    expect(request?.options.map((o) => o.kind)).toEqual(['allow_once', 'reject_once']);
  });

  it('still offers one for work that stays on the machine, and scopes it to the session', async () => {
    const { request, result, granted } = await card('npm run build');
    expect(request?.options.map((o) => o.kind)).toEqual([
      'allow_once',
      'allow_always',
      'reject_once',
    ]);
    // `localSettings` would write a file the next spawn never reads back; Studio remembers instead.
    expect(result?.updatedPermissions).toEqual([
      { ...RULE, destination: 'session', rules: [{ toolName: 'Bash', ruleContent: 'npm run build' }] },
    ]);
    expect(granted).toEqual([['Bash(npm run build)']]);
  });

  it('offers no persistent row when the rule the CLI suggests reaches past the request (ONL-2933)', async () => {
    // The request is benign and the row would read as "this command"; the rule is what gets
    // replayed into every later spawn.
    for (const suggested of [
      [{ toolName: 'Bash' }],
      [{ toolName: 'Bash', ruleContent: '*' }],
      [{ toolName: 'Bash', ruleContent: 'git:*' }],
      [{ toolName: 'Bash', ruleContent: 'bash:*' }],
      [{ toolName: 'Bash', ruleContent: 'npm run deploy' }],
      [{ toolName: 'Bash', ruleContent: 'npm run build' }, { toolName: 'Bash', ruleContent: 'git:*' }],
    ]) {
      const { request, result, granted, sdk, session } = await card('npm run build', {}, suggested);
      expect(request?.options.map((o) => o.kind)).toEqual(['allow_once', 'reject_once']);
      // Answered with the row anyway: this one run is allowed and nothing is carried.
      expect(result?.behavior).toBe('allow');
      expect(result?.updatedPermissions).toBeUndefined();
      expect(granted).toEqual([]);

      sdk.fail('stream broke');
      await drain();
      session.prompt('carry on');
      await drain();
      expect(sdk.permissions?.allow).toBeUndefined();
    }
  });

  it('carries what the project already always-allowed into the spawn, so a relaunch does not ask again', async () => {
    const { sdk } = open({ allowRules: ['Bash(npm run build)'] });
    expect(sdk.permissions?.allow).toEqual(['Bash(npm run build)']);
    // Studio's own ask rules still stand above them: an allow rule cannot silence the push gate.
    expect(sdk.permissions?.ask).toContain('Bash(git push:*)');
  });

  it('a stored grant does not open a later publish or destructive request, which Studio asks about every time (ONL-2933)', async () => {
    const { session, sdk, emitted } = open({ allowRules: ['Bash(npm run build)'] });
    for (const [index, command] of [
      'git push origin main',
      'git push --force origin main',
      'git branch -D topic',
    ].entries()) {
      const requestId = `req_p${String(index)}`;
      const answered = sdk.canUseTool('Bash', { command }, {
        signal: new AbortController().signal,
        toolUseID: `toolu_p${String(index)}`,
        requestId,
        suggestions: [{ ...RULE, rules: [{ toolName: 'Bash', ruleContent: command }] }],
      });
      await drain();
      expect(
        ofType(emitted, 'permission.requested').at(-1)?.options.map((o) => o.kind),
      ).toEqual(['allow_once', 'reject_once']);
      session.respond(requestId, 'allow');
      await answered;
    }
    expect(sdk.permissions?.allow).toEqual(['Bash(npm run build)']);
  });

  it('passes no allow list when the project has granted nothing', () => {
    const { sdk } = open();
    expect(sdk.permissions?.allow).toBeUndefined();
  });

  it('keeps a grant through the re-spawn a stream error forces', async () => {
    const { result, sdk, session } = await card('npm run build');
    expect(result?.behavior).toBe('allow');
    expect(sdk.permissions?.allow).toBeUndefined();

    sdk.fail('stream broke');
    await drain();
    session.prompt('carry on');
    await drain();

    expect(sdk.permissions?.allow).toEqual(['Bash(npm run build)']);
  });
});

describe('the permission mode the composer is shown (ONL-2190)', () => {
  it('publishes the mode Studio passed and the set it enforces, not what the CLI reports', async () => {
    const { sdk, emitted } = open();
    const published = ofType(emitted, 'session.settings').find(
      (e) => e.permissionModes !== undefined,
    );
    expect(published?.permissionMode).toBe('auto');
    expect(published?.permissionModes).toEqual(['default', 'acceptEdits', 'auto', 'plan']);

    // `system:init` reports the CLI's own value; reading it showed a mode the session was not running under.
    sdk.push({
      type: 'system',
      subtype: 'init',
      session_id: 'sdk-1',
      cwd: CWD,
      permissionMode: 'default',
      uuid: 'u',
    });
    await drain();
    expect(foldSessionState(emitted).permissionMode).toBe('auto');
  });

  it('starts on the project’s remembered mode, and falls back when it is not one it enforces', () => {
    const remembered = open({ permissionMode: 'plan' });
    expect(foldSessionState(remembered.emitted).permissionMode).toBe('plan');

    // A stored value the backend stopped offering must not start a session on a posture nothing keeps.
    const stale = open({ permissionMode: 'danger-full-access' });
    expect(foldSessionState(stale.emitted).permissionMode).toBe('auto');
  });

  it('a chosen mode is applied and re-announced; one the backend does not enforce is refused', async () => {
    const { session, emitted } = open();
    expect(await session.setPermissionMode('plan')).toBe(true);
    expect(foldSessionState(emitted).permissionMode).toBe('plan');

    expect(await session.setPermissionMode('danger-full-access')).toBe(false);
    expect(foldSessionState(emitted).permissionMode).toBe('plan');
  });

  it('a mode the live query refuses is neither announced nor reported applied', async () => {
    const { session, emitted } = makeSession({ modeRefused: true });
    session.prompt('go');
    await drain();

    expect(await session.setPermissionMode('plan')).toBe(false);
    expect(foldSessionState(emitted).permissionMode).toBe('auto');
  });
});

describe('a model pick (ONL-2542)', () => {
  const SIGNED_OUT =
    'Unable to validate model: Could not resolve authentication method. Expected one of apiKey, authToken, credentials, config, or profile to be set.';

  it('a pick the CLI refuses is neither announced nor what the next spawn starts on', async () => {
    const { sdk, session, emitted } = makeSession({ modelRefused: SIGNED_OUT });
    session.open();
    cleanups.push(async () => {
      await session.close();
      sdk.end();
    });
    session.prompt('go');
    await drain();

    expect(await session.setModel('claude-fable-5-1')).toStrictEqual({ accepted: false, refusal: 'signed-out' });
    expect(ofType(emitted, 'session.settings').some((e) => e.model === 'claude-fable-5-1')).toBe(false);

    sdk.fail('Claude Code process exited with code 1');
    await drain();
    session.prompt('again');
    await drain();
    expect(sdk.spawnModels.length).toBeGreaterThan(1);
    expect(sdk.spawnModels.at(-1)).not.toBe('claude-fable-5-1');
  });

  it('names a refusal that is not about sign-in as a plain refusal', async () => {
    const { sdk, session } = makeSession({ modelRefused: "Model 'claude-fable-5-1' isn't available for your account" });
    session.open();
    cleanups.push(async () => {
      await session.close();
      sdk.end();
    });
    await drain();

    expect(await session.setModel('claude-fable-5-1')).toStrictEqual({ accepted: false, refusal: 'refused' });
  });

  it('an accepted pick is announced and is what the next spawn starts on', async () => {
    const { sdk, session, emitted } = open();
    session.prompt('go');
    await drain();

    expect(await session.setModel('sonnet')).toStrictEqual({ accepted: true });
    expect(foldSessionState(emitted).model).toBe('sonnet');

    sdk.fail('Claude Code process exited with code 1');
    await drain();
    session.prompt('again');
    await drain();
    expect(sdk.spawnModels.at(-1)).toBe('sonnet');
  });
});

describe('an answer that reaches no held request (ONL-2190)', () => {
  it('says it was not accepted rather than reading as a click that did nothing', async () => {
    const { session, sdk } = open();
    const controller = new AbortController();

    expect(session.respond('req_never_raised', 'allow_once')).toBe(false);

    void sdk.canUseTool(
      'Bash',
      { command: 'git status' },
      { signal: controller.signal, toolUseID: 'toolu_a', requestId: 'req_a' },
    );
    await drain();
    expect(session.respond('req_a', 'deny')).toBe(true);
    await drain();
    // The same id a second time is an answer to nothing, and must report that.
    expect(session.respond('req_a', 'allow_once')).toBe(false);
  });
});

describe('the attention fact the session publishes (ONL-2455)', () => {
  async function running() {
    const made = open();
    made.session.prompt('first');
    made.sdk.push(MESSAGE_START());
    await drain();
    return made;
  }

  const park = (sdk: ReturnType<typeof fakeSdk>, id: string, signal: AbortSignal): Promise<unknown> =>
    sdk.canUseTool('Bash', { command: 'ls' }, { signal, toolUseID: `toolu_${id}`, requestId: `req_${id}` });

  it('says attention while a request is parked, and not while none is', async () => {
    const { sdk, session, states } = await running();
    expect(states.at(-1)).toEqual({
      isStreaming: true,
      midTurn: 'steer',
      needsAttention: false,
      turnWaitedMs: 0,
      isTurnLive: true,
    });

    const parked = park(sdk, '1', new AbortController().signal);
    await drain();
    expect(states.at(-1)).toEqual({
      isStreaming: true,
      midTurn: 'steer',
      needsAttention: true,
      turnWaitedMs: 0,
      isTurnLive: true,
    });

    session.respond('req_1', 'allow');
    await parked;
    await drain();
    expect(states.at(-1)).toEqual({
      isStreaming: true,
      midTurn: 'steer',
      needsAttention: false,
      turnWaitedMs: 0,
      isTurnLive: true,
    });
  });

  it('publishes it on its own, because streaming never moved', async () => {
    const { sdk, session, states } = await running();
    const before = states.length;

    const parked = park(sdk, '1', new AbortController().signal);
    await drain();

    expect(states.length).toBe(before + 1);
    expect(states.at(-1)?.isStreaming).toBe(true);

    session.respond('req_1', 'allow');
    await parked;
  });

  it('is the count, not the last one: a second park re-says nothing and the first answer still holds attention', async () => {
    const { sdk, session, states } = await running();
    const first = park(sdk, '1', new AbortController().signal);
    const second = park(sdk, '2', new AbortController().signal);
    await drain();
    const afterBoth = states.length;

    session.respond('req_1', 'allow');
    await first;
    await drain();
    expect(states.at(-1)?.needsAttention).toBe(true);
    expect(states.length).toBe(afterBoth);

    session.respond('req_2', 'allow');
    await second;
    await drain();
    expect(states.at(-1)?.needsAttention).toBe(false);
  });

  it('drops attention when the request is canceled rather than answered', async () => {
    const { sdk, states } = await running();
    const controller = new AbortController();
    const parked = park(sdk, '1', controller.signal);
    await drain();
    expect(states.at(-1)?.needsAttention).toBe(true);

    controller.abort();
    await expect(parked).rejects.toThrow();
    await drain();
    expect(states.at(-1)?.needsAttention).toBe(false);
  });

  it('reports itself on the snapshot too, so a renderer that missed the event catches up', async () => {
    const { sdk, session } = await running();
    expect(session.needsAttention).toBe(false);

    const parked = park(sdk, '1', new AbortController().signal);
    await drain();
    expect(session.needsAttention).toBe(true);

    session.respond('req_1', 'allow');
    await parked;
    expect(session.needsAttention).toBe(false);
  });
});

describe('the live-turn fact the session publishes (ONL-2294)', () => {
  it('stays up through a Stop, with streaming already down, and falls only at the result', async () => {
    const { sdk, session, states } = open();
    expect(session.isTurnLive).toBe(false);

    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();
    expect(session.isTurnLive).toBe(true);

    await session.interrupt();
    expect([session.isStreaming, session.isTurnLive]).toEqual([false, true]);
    expect(states.at(-1)).toEqual({
      isStreaming: false,
      midTurn: 'steer',
      needsAttention: false,
      questionParkedSince: undefined,
      turnWaitedMs: 0,
      isTurnLive: true,
    });

    sdk.push(RESULT_ABORTED);
    await drain();
    expect(session.isTurnLive).toBe(false);
    expect(states.at(-1)?.isTurnLive).toBe(false);
  });

  it('publishes the falling edge after `turn.ended` is logged, so an ending is readable before it', async () => {
    const { sdk, session, emitted, order } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();

    sdk.push(RESULT_OK);
    await drain();

    expect(session.isTurnLive).toBe(false);
    expect(ofType(emitted, 'turn.ended')).toHaveLength(1);
    expect(order.lastIndexOf('event:turn.ended')).toBeLessThan(order.lastIndexOf('state:false'));
  });

  it('falls when the pump throws, so a failed turn is never left reading as live', async () => {
    const { sdk, session, states } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();

    sdk.fail('Claude Code process exited with code 1');
    await drain();

    expect(session.isTurnLive).toBe(false);
    expect(states.at(-1)?.isTurnLive).toBe(false);
  });
});

describe('the model catalog the session publishes (ONL-2075)', () => {
  it("drops the SDK's default row and the plain twin of a [1m] row", async () => {
    const { emitted } = open({
      models: [
        { value: 'default', displayName: 'Default (recommended)' },
        { value: 'opus', resolvedModel: 'claude-opus-5', displayName: 'Opus' },
        { value: 'opus[1m]', resolvedModel: 'claude-opus-5[1m]', displayName: 'Opus (1M context)' },
        { value: 'sonnet', resolvedModel: 'claude-sonnet-5', displayName: 'Sonnet' },
      ],
    });
    await drain();
    const catalogs = ofType(emitted, 'session.settings').filter((e) => e.models !== undefined);
    expect(catalogs.length).toBe(1);
    expect(catalogs[0]?.models?.map((m) => m.value)).toEqual(['opus[1m]', 'sonnet']);
  });
});

describe('the model a resume asks for', () => {
  const modelOnResume = (model?: string): unknown => {
    let seen: unknown;
    const queryFn = ((args: { options: { model?: unknown } }) => {
      seen = args.options.model;
      return {
        [Symbol.asyncIterator]: () => ({ next: () => new Promise<IteratorResult<unknown>>(() => undefined) }),
        supportedModels: async (): Promise<unknown[]> => [],
        applyFlagSettings: async (): Promise<void> => undefined,
        setMcpPermissionModeOverride: async (): Promise<void> => undefined,
      } as unknown as Query;
    }) as unknown as typeof query;
    const session = new AgentSession({
      cwd: CWD,
      resume: 'sid-2435',
      ...(model === undefined ? {} : { model }),
      query: queryFn,
      onEvent: () => undefined,
      onState: () => undefined,
      onConnection: () => undefined,
    });
    session.open();
    return seen;
  };

  it("asks for the SDK's default when the user never chose, so an old chat leaves its retired model", () => {
    expect(modelOnResume()).toBe('default');
  });

  it("keeps the user's own choice", () => {
    expect(modelOnResume('sonnet')).toBe('sonnet');
  });
});

describe('a tapped next task (ONL-2899)', () => {
  it('attributes a user resume to the user without replacing the Resumed row with a prompt', async () => {
    const { sdk, session, emitted, turns, starts } = open();
    session.prompt('continue', [], undefined, 'user', { origin: 'studio' });
    expect(starts).toEqual([{ turnId: 't1', origin: 'user' }]);
    sdk.push(MESSAGE_START());
    await drain();
    sdk.push(RESULT_OK);
    await drain();
    expect(ofType(emitted, 'message.user').map((row) => row.origin)).toEqual(['studio']);
    expect(turns.map((turn) => turn.origin)).toEqual(['user']);
  });

  it('stamps both its row and the turn it opens as a suggestion', async () => {
    const { sdk, session, emitted, turns } = open();
    session.prompt('Show the page on mobile', [], undefined, 'suggestion');
    sdk.push(MESSAGE_START());
    await drain();
    sdk.push(RESULT_OK);
    await drain();

    expect(ofType(emitted, 'message.user').map((u) => u.origin)).toEqual(['suggestion']);
    expect(turns.map((t) => t.origin)).toEqual(['suggestion']);
  });
});

describe('the origin a CLI-opened turn reports (ONL-2463)', () => {
  it('is the user’s when the CLI runs their steer as its own turn, not the Studio turn it joined', async () => {
    const { sdk, session, turns } = open();
    // Studio opens a turn of its own, the way a project's start intent does.
    session.prompt('get it serving', [], undefined, 'studio');
    sdk.push(MESSAGE_START());
    await drain();

    // The user types while it streams; the steer is claimed, so it is theirs.
    session.prompt('make the hero cobalt');
    sdk.push(RESULT_OK);
    await drain();

    // The CLI runs that steer as a turn of its own.
    sdk.push(INIT, MESSAGE_START());
    await drain();
    sdk.push(RESULT_OK);
    await drain();

    expect(turns).toHaveLength(2);
    expect(turns[0]?.origin).toBe('studio');
    expect(turns[1]?.origin).toBe('user');
  });

  it('is Studio’s when the message the CLI runs was Studio’s own', async () => {
    const { sdk, session, turns } = open();
    session.prompt('first');
    sdk.push(MESSAGE_START());
    await drain();
    // Queued behind the open turn, and Studio's: it carries no claim.
    session.prompt('start the app', [], undefined, 'studio');
    await drain();
    sdk.push(RESULT_OK);
    await drain();

    sdk.push(INIT, MESSAGE_START());
    await drain();
    sdk.push(RESULT_OK);
    await drain();

    expect(turns).toHaveLength(2);
    expect(turns[0]?.origin).toBe('user');
    expect(turns[1]?.origin).toBe('studio');
  });
});

describe('the silence a prompt that got no answer leaves (ONL-2491)', () => {
  it('ends a crashed Claude turn once without reporting a later phantom stall', async () => {
    for (const hadStall of [false, true]) {
      const { sdk, session, emitted, turns, stalls } = open();
      jest.useFakeTimers();
      session.prompt('first');
      sdk.push(MESSAGE_START());
      for (let tick = 0; tick < 4; tick += 1) await new Promise<void>((resolve) => setImmediate(resolve));
      if (hadStall) jest.advanceTimersByTime(120_000);
      sdk.fail('Claude Code process exited with code 1');
      for (let tick = 0; tick < 4; tick += 1) await new Promise<void>((resolve) => setImmediate(resolve));
      expect(turns).toHaveLength(1);
      expect(turns[0]).toMatchObject({ stopReason: 'provider_error', hadProviderStall: hadStall });
      expect(ofType(emitted, 'turn.ended')).toHaveLength(1);
      // `isError` is what tells project setup an agent failure from a missing app (ONL-3343).
      expect(ofType(emitted, 'turn.ended')[0]).toMatchObject({ isError: true });
      jest.advanceTimersByTime(240_000);
      expect(stalls).toHaveLength(hadStall ? 1 : 0);
      jest.useRealTimers();
      await session.close();
      expect(turns).toHaveLength(1);
    }
  });

  it('anchors on turn.started, which this path pushes before message.user', async () => {
    const { session, emitted } = open();
    session.prompt('make the hero cobalt');
    await drain();

    const order = emitted.map((e) => e.type);
    expect(order.indexOf('turn.started')).toBeLessThan(order.indexOf('message.user'));
    expect(foldSessionState(emitted).silentSince).toBe(ofType(emitted, 'turn.started')[0]?.ts);
  });

  it('is cleared by the first streamed block', async () => {
    const { sdk, session, emitted } = open();
    session.prompt('make the hero cobalt');
    sdk.push(MESSAGE_START(), TEXT_START());
    await drain();

    expect(foldSessionState(emitted).silentSince).toBeUndefined();
  });
});

describe('the pause the session publishes while it holds a question (ONL-2295)', () => {
  const QUESTION_INPUT = {
    questions: [
      {
        question: 'What should the variations explore?',
        header: 'Variations',
        options: [{ label: 'Colour' }, { label: 'Layout' }],
      },
    ],
  };

  async function running() {
    const made = open();
    made.session.prompt('first');
    made.sdk.push(MESSAGE_START());
    await drain();
    return made;
  }

  const ask = (
    sdk: ReturnType<typeof fakeSdk>,
    input: Record<string, unknown>,
    id = '1',
  ): Promise<unknown> =>
    sdk.canUseTool('AskUserQuestion', input, {
      signal: new AbortController().signal,
      toolUseID: `toolu_${id}`,
      requestId: `req_${id}`,
    });

  it('names the moment it parked, and clears it on the answer', async () => {
    const { sdk, session, states } = await running();

    const parked = ask(sdk, QUESTION_INPUT);
    await drain();
    expect(states.at(-1)?.questionParkedSince).toEqual(expect.any(Number));

    session.respond('req_1', 'allow', { 'What should the variations explore?': 'Colour' });
    await parked;
    await drain();
    expect(states.at(-1)?.questionParkedSince).toBeUndefined();
    expect(states.at(-1)?.turnWaitedMs).toEqual(expect.any(Number));
  });

  it('does not pause for a plain approval', async () => {
    const { sdk, session, states } = await running();

    const parked = sdk.canUseTool('Bash', { command: 'ls' }, {
      signal: new AbortController().signal,
      toolUseID: 'toolu_9',
      requestId: 'req_9',
    });
    await drain();
    expect(states.at(-1)?.needsAttention).toBe(true);
    expect(states.at(-1)?.questionParkedSince).toBeUndefined();

    session.respond('req_9', 'allow');
    await parked;
    await drain();
  });

  it('does not pause for a question the parse could not make answerable', async () => {
    const { sdk, session, states } = await running();

    // One option is not a choice, so `parseQuestions` yields nothing and the card is a plain approval.
    const parked = ask(sdk, { questions: [{ question: 'Pick', header: 'P', options: [{ label: 'Only' }] }] }, '2');
    await drain();
    expect(states.at(-1)?.needsAttention).toBe(true);
    expect(states.at(-1)?.questionParkedSince).toBeUndefined();

    session.respond('req_2', 'allow');
    await parked;
    await drain();
  });

  it('stays paused until the last of two questions is answered', async () => {
    const { sdk, session, states } = await running();

    const first = ask(sdk, QUESTION_INPUT, '1');
    await drain();
    const parkedAt = states.at(-1)?.questionParkedSince;
    const second = ask(sdk, QUESTION_INPUT, '2');
    await drain();
    // The earlier park, not the later: the pause began when the designer was first blocked.
    expect(states.at(-1)?.questionParkedSince).toBe(parkedAt);

    session.respond('req_2', 'allow', { 'What should the variations explore?': 'Layout' });
    await second;
    await drain();
    expect(states.at(-1)?.questionParkedSince).toBe(parkedAt);

    session.respond('req_1', 'allow', { 'What should the variations explore?': 'Colour' });
    await first;
    await drain();
    expect(states.at(-1)?.questionParkedSince).toBeUndefined();
  });

  it('leaves nothing parked when Stop lands on an open question', async () => {
    const { sdk, session, states } = await running();

    const parked = ask(sdk, QUESTION_INPUT);
    await drain();
    expect(states.at(-1)?.questionParkedSince).toEqual(expect.any(Number));

    await session.interrupt();
    await parked.catch(() => undefined);
    await drain();

    expect(states.at(-1)?.questionParkedSince).toBeUndefined();
  });

  it('reports the wait it measured on the turn that asked', async () => {
    const { sdk, session, turns } = await running();

    const parked = ask(sdk, QUESTION_INPUT);
    await drain();
    session.respond('req_1', 'allow', { 'What should the variations explore?': 'Colour' });
    await parked;
    sdk.push(RESULT_OK);
    await drain();

    expect(turns.at(-1)?.waitedMs).toEqual(expect.any(Number));
  });
});
