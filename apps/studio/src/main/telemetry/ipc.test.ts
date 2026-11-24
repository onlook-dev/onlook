import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { EventEmitter } from 'node:events';
import { fromMainFrame, seatedTabs } from '../tabs/test-support.js';
import { observeTabHealth } from '../tabs/observe-health.js';
import type { TabHealth } from '../tabs/health.js';
import { beginTelemetryQuit, showTelemetryRenderer, shutdownTelemetry, workspaceTelemetryProperties, setTelemetryRendererWorkspace } from './index.js';
import { notePreviewDiagnostics, resetPreviewDiagnostics } from './preview-diagnostics.js';
import { abandonSetupForRenderer, checkSetupAbandoned, resetSetupTelemetryForTesting } from './setup-step.js';
import { CANVAS_PAN_COUNTS, CHAT_TYPING_COUNTS, IPC_SEND, SLOW_INTERACTION_COUNTS, type RendererTelemetryEvent, type WorkspaceCreated } from '@studio/events';
import { cleanupTempFixtures, makeWorkspaceRoot } from '@studio/fixtures';
import { rememberProject, resetWorkspaceCache } from '../workspace/store.js';
import type { AppLike } from './index.js';

const { resetIdentityCache } = await import('../identity/store.js');
const { initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } =
  await import('./index.js');
const { receiveRendererException, receiveRendererTelemetry, receiveReplaySession } = await import('./ipc.js');
const { peekLinesForTesting, recordLinesForTesting, resetLogForTesting } = await import('../log/index.js');
const { currentSessionId } = await import('./index.js');

const made: string[] = [];

function makeRoot(name: string): string {
  const root = mkdtempSync(join(tmpdir(), `studio-telemetry-ipc-${name}-`));
  made.push(root);
  return root;
}

function fakeApp(userData: string): AppLike {
  return {
    getPath: () => userData,
    getVersion: () => '0.0.0-test',
    getLocale: () => 'en-US',
    isPackaged: false,
  };
}

const ENV_KEYS = [
  'STUDIO_STATE_ROOT',
  'STUDIO_WORKSPACE_ROOT',
  'STUDIO_POSTHOG_KEY',
  'STUDIO_POSTHOG_HOST',
  'STUDIO_TELEMETRY',
  'MAIN_VITE_POSTHOG_KEY',
] as const;
const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

const realFetch = globalThis.fetch;

beforeEach(() => {
  resetTelemetryForTesting();
  resetIdentityCache();
  for (const key of ENV_KEYS) delete process.env[key];
  process.env['STUDIO_STATE_ROOT'] = makeRoot('state');
  setAppForTesting(fakeApp(makeRoot('userdata')));
  globalThis.fetch = (() =>
    Promise.resolve(new Response('{"status":1}'))) as unknown as typeof fetch;
});

afterEach(() => {
  resetTelemetryForTesting();
  setAppForTesting(undefined);
  globalThis.fetch = realFetch;
  for (const key of ENV_KEYS) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

afterAll(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
  cleanupTempFixtures();
});

describe('activation telemetry boundary (ONL-2686)', () => {
  beforeEach(() => {
    resetSetupTelemetryForTesting();
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
  });

  const deadEnds = () => peekQueueForTesting().filter((row) => row.event === 'dead_end_shown');

  it('carries a validated common server port into dead-end diagnostics and rejects invalid ports', () => {
    setTelemetryRendererWorkspace(() => 'sample-workspace');
    notePreviewDiagnostics('sample-workspace', { expected_port: 4100, actual_port: 4101, cause: 'process_exited', exit_code: 17 });
    showTelemetryRenderer(1);
    try {
      const report = { event: 'activation_surface', properties: { surface: 'error_state', dead_end: { state: 'preview_failed', error_class: 'port_unreachable', cover: 'dead', server_port: 4100 } } } as const;
      for (const server_port of [0, 65536, 1.5, '4100', null]) receiveRendererTelemetry({ ...report, properties: { ...report.properties, dead_end: { ...report.properties.dead_end, server_port } } } as unknown as RendererTelemetryEvent, 1);
      expect(deadEnds()).toHaveLength(0);
      receiveRendererTelemetry(report, 1);
      expect(deadEnds().at(-1)?.properties).toMatchObject({ cause: 'process_exited', expected_port: 4100, actual_port: 4101, exit_code: 17, cover: 'dead' });
      receiveRendererTelemetry({ ...report, properties: { ...report.properties, dead_end: { ...report.properties.dead_end, server_port: 4200 } } }, 1);
      expect(deadEnds()).toHaveLength(2);
      expect(deadEnds().at(-1)?.properties).toMatchObject({ cause: 'unknown', expected_port: null });
    } finally {
      setTelemetryRendererWorkspace(() => undefined);
      resetPreviewDiagnostics();
    }
  });

  it('records only enumerated connector actions without server names or addresses', () => {
    receiveRendererTelemetry({ event: 'connector_action', properties: { action: 'open-plug', name: 'private server', url: 'https://private.local' } } as unknown as RendererTelemetryEvent, 1);
    receiveRendererTelemetry({ event: 'connector_action', properties: { action: 'open-add-menu', name: 'private server' } } as unknown as RendererTelemetryEvent, 1);
    receiveRendererTelemetry({ event: 'connector_action', properties: { action: 'private' } } as unknown as RendererTelemetryEvent, 1);
    const events = peekQueueForTesting().filter((row) => row.event === 'connector_action');
    expect(events).toHaveLength(2);
    expect(events[0]?.properties.action).toBe('open-plug');
    expect(events[1]?.properties.action).toBe('open-add-menu');
    expect(JSON.stringify(events)).not.toContain('private');
  });

  it('records preview recovery actions without the address, prompt or smuggled fields', () => {
    receiveRendererTelemetry({ event: 'preview_recovery_pressed', properties: { action: 'ask-agent', url: 'http://private.local', prompt: 'private' } } as unknown as RendererTelemetryEvent, 1);
    receiveRendererTelemetry({ event: 'preview_recovery_pressed', properties: { action: 'restart' } }, 1);
    receiveRendererTelemetry({ event: 'preview_recovery_pressed', properties: { action: 'start' } }, 1);
    receiveRendererTelemetry({ event: 'preview_recovery_pressed', properties: { action: 'try-again' } }, 1);
    receiveRendererTelemetry({ event: 'preview_recovery_pressed', properties: { action: 'back' } }, 1);
    receiveRendererTelemetry({ event: 'preview_recovery_pressed', properties: { action: 'private' } } as unknown as RendererTelemetryEvent, 1);
    const events = peekQueueForTesting().filter((row) => row.event === 'preview_recovery_pressed');
    expect(events).toHaveLength(5);
    expect(events.map((row) => row.properties.action)).toEqual(['ask-agent', 'restart', 'start', 'try-again', 'back']);
    expect(JSON.stringify(events)).not.toContain('private');
  });

  it('a detected provider selection records skipped setup with its actual entry point and no private payload', () => {
    receiveRendererTelemetry({ event: 'agent_setup_skipped', properties: { provider: 'codex', entry_point: 'editor', reason: 'private reason', path: '/private/project' } } as unknown as RendererTelemetryEvent, 1);
    receiveRendererTelemetry({ event: 'agent_setup_skipped', properties: { provider: 'private provider', entry_point: 'editor' } } as unknown as RendererTelemetryEvent, 1);
    const steps = peekQueueForTesting().filter((row) => row.event === 'agent_setup_step');
    expect(steps).toHaveLength(1);
    expect(steps[0]?.properties).toMatchObject({ provider: 'codex', entry_point: 'editor', step: 'skipped', reason: 'provider_detected' });
    expect(JSON.stringify(steps)).not.toContain('private');
    checkSetupAbandoned();
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_abandoned')).toHaveLength(0);
  });

  it('rapid tab reveals attribute the actual covering renderer until the incoming frame presents', () => {
    const makeTab = (id: number) => ({ id: `tab-${id}`, view: { webContents: Object.assign(new EventEmitter(), { id, ipc: new EventEmitter(), isDestroyed: () => false }), setVisible: () => {} } });
    const first = makeTab(1);
    const second = makeTab(2);
    const third = makeTab(3);
    const host = seatedTabs({
      tabs: new Map([first, second, third].map((tab) => [tab.id, tab])),
      visibleId: first.id,
      window: Object.assign(new EventEmitter(), { isDestroyed: () => false, contentView: { addChildView: () => {} } }),
      raiseChrome: () => {},
    });
    showTelemetryRenderer(1);
    receiveRendererTelemetry({ event: 'activation_surface', properties: { surface: 'canvas' } }, 1);
    receiveRendererTelemetry({ event: 'activation_surface', properties: { surface: 'error_state', dead_end: { state: 'preview_failed', error_class: 'unknown' } } }, 2);
    receiveRendererTelemetry({ event: 'activation_surface', properties: { surface: 'project_picker' } }, 3);
    host.reveal(second);
    expect(deadEnds()).toHaveLength(0);
    host.reveal(third);
    expect(deadEnds()).toHaveLength(0);
    third.view.webContents.ipc.emit(IPC_SEND.tabPresented, fromMainFrame(third.view.webContents));
    receiveRendererTelemetry({ event: 'activation_surface', properties: { surface: 'error_state', dead_end: { state: 'setup_failed', error_class: 'unknown' } } }, 2);
    expect(deadEnds()).toHaveLength(0);
  });

  it('destroying a setup tab abandons only its own pending attempt', () => {
    receiveRendererTelemetry({ event: 'agent_setup_opened', properties: { provider: 'claude', entry_point: 'editor' } }, 1);
    receiveRendererTelemetry({ event: 'agent_setup_opened', properties: { provider: 'codex', entry_point: 'settings' } }, 2);
    abandonSetupForRenderer(1);
    abandonSetupForRenderer(1);
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_abandoned').map((row) => row.properties['provider'])).toEqual(['claude']);
    checkSetupAbandoned();
    expect(peekQueueForTesting().filter((row) => row.event === 'agent_setup_abandoned').map((row) => row.properties['provider'])).toEqual(['claude', 'codex']);
  });

  it('counts a displayed dead end once and defers background failures until their tab is shown', () => {
    showTelemetryRenderer(1);
    const report = { event: 'activation_surface', properties: { surface: 'error_state', dead_end: { state: 'app_not_started', error_class: 'timeout' } } } as const;
    receiveRendererTelemetry(report, 2);
    expect(deadEnds()).toHaveLength(0);
    showTelemetryRenderer(2);
    receiveRendererTelemetry(report, 2);
    expect(deadEnds()).toHaveLength(1);
    expect(deadEnds()[0]?.properties).toMatchObject({ state: 'app_not_started', error_class: 'timeout' });
    receiveRendererTelemetry({ event: 'activation_surface', properties: { surface: 'canvas' } }, 2);
    receiveRendererTelemetry(report, 2);
    expect(deadEnds()).toHaveLength(2);
  });

  it('rejects raw error text and strips smuggled paths from accepted activation reports', () => {
    showTelemetryRenderer(1);
    receiveRendererTelemetry(JSON.parse('{"event":"activation_surface","properties":{"surface":"error_state","dead_end":{"state":"setup_failed","error_class":"/Users/private/project failed"}}}'), 1);
    expect(deadEnds()).toHaveLength(0);
    const payload = { event: 'activation_surface', properties: { surface: 'error_state', path: '/Users/private/project', dead_end: { state: 'setup_failed', error_class: 'unknown', message: 'secret' } } };
    receiveRendererTelemetry(payload as RendererTelemetryEvent, 1);
    expect(deadEnds()).toHaveLength(1);
    expect(JSON.stringify(deadEnds())).not.toContain('/Users/private');
    expect(JSON.stringify(deadEnds())).not.toContain('secret');
  });

  it('app_closed records the foreground surface rather than the last background transition', async () => {
    const sent: Array<{ event: string; properties: Record<string, unknown> }> = [];
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      sent.push(...(JSON.parse(String(init?.body)) as { batch: typeof sent }).batch);
      return new Response('{}');
    }) as typeof fetch;
    showTelemetryRenderer(1);
    receiveRendererTelemetry({ event: 'activation_surface', properties: { surface: 'project_picker' } }, 1);
    beginTelemetryQuit();
    receiveRendererTelemetry({ event: 'activation_surface', properties: { surface: 'setup' } }, 1);
    receiveRendererTelemetry({ event: 'activation_surface', properties: { surface: 'error_state', dead_end: { state: 'setup_failed', error_class: 'unknown' } } }, 2);
    await shutdownTelemetry();
    expect(sent.find((row) => row.event === 'app_closed')?.properties['last_surface']).toBe('project_picker');
  });

  it('tab_view_failed fires through the real renderer-crash and load-failure listeners', () => {
    const contents = Object.assign(new EventEmitter(), { id: 42 });
    let health: TabHealth | undefined;
    let live = true;
    showTelemetryRenderer(contents.id);
    observeTabHealth(contents, { isLive: () => live, health: () => health, setHealth: (next) => { health = next; }, projectFields: () => ({ project_id: 'hashed-project' }) });
    contents.emit('render-process-gone', {}, { reason: 'oom', exitCode: 9 });
    expect(health).toBe('gone');
    contents.emit('did-finish-load');
    contents.emit('did-fail-load', {}, -3, 'aborted', 'secret-url', true);
    contents.emit('did-fail-load', {}, -105, 'subframe', 'secret-url', false);
    expect(health).toBeUndefined();
    contents.emit('did-fail-load', {}, -105, 'private message', 'secret-url', true);
    const failures = peekQueueForTesting().filter((row) => row.event === 'tab_view_failed');
    expect(failures.map((row) => row.properties['reason'])).toEqual(['renderer-gone', 'load-failed']);
    expect(deadEnds()).toHaveLength(2);
    expect(JSON.stringify(failures)).not.toContain('secret-url');
    expect(JSON.stringify(failures)).not.toContain('private message');
    live = false;
    contents.emit('render-process-gone', {}, { reason: 'clean-exit', exitCode: 0 });
    expect(peekQueueForTesting().filter((row) => row.event === 'tab_view_failed')).toHaveLength(2);
  });
});

describe('receiveRendererTelemetry', () => {
  it('records touched-file opens with only a boolean, never the file path', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    for (const during_turn of [true, false]) {
      receiveRendererTelemetry({ event: 'touched_file_opened', properties: { during_turn, path: '/private/project/secret.ts', content: 'secret code' } } as RendererTelemetryEvent);
    }
    for (const during_turn of [undefined, 'true', 1, null]) {
      receiveRendererTelemetry({ event: 'touched_file_opened', properties: { during_turn } } as unknown as RendererTelemetryEvent);
    }
    const events = peekQueueForTesting().filter((event) => event.event === 'touched_file_opened');
    expect(events).toHaveLength(2);
    expect(events.map((event) => event.properties.during_turn)).toEqual([true, false]);
    expect(JSON.stringify(events)).not.toContain('secret');
    expect(events.every((event) => !Object.hasOwn(event.properties, 'path') && !Object.hasOwn(event.properties, 'content'))).toBe(true);
  });

  it('records only scalar chat actions and recall outcomes, rejecting invalid values', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    for (const action of ['copy', 'copy_code', 'retry'] as const) {
      receiveRendererTelemetry({ event: 'message_action', properties: { action, role: 'assistant', harness: 'codex', text: 'private prompt', code: 'private code' } } as RendererTelemetryEvent);
    }
    receiveRendererTelemetry({ event: 'prompt_recall', properties: { steps_back: 2, had_attachments: true, next_action: 'edit', harness: 'claude', text: 'private prompt' } } as RendererTelemetryEvent);
    for (const properties of [
      { action: 'private prompt', role: 'user', harness: 'codex' },
      { action: 'copy', role: 'private prompt', harness: 'codex' },
      { action: 'copy', role: 'user', harness: 'private prompt' },
    ]) receiveRendererTelemetry({ event: 'message_action', properties } as unknown as RendererTelemetryEvent);
    for (const properties of [
      { steps_back: -1, had_attachments: true, next_action: 'edit', harness: 'codex' },
      { steps_back: 0, had_attachments: true, next_action: 'send', harness: 'codex' },
      { steps_back: 1, had_attachments: 'private prompt', next_action: 'edit', harness: 'codex' },
      { steps_back: 1, had_attachments: true, next_action: 'private prompt', harness: 'codex' },
    ]) receiveRendererTelemetry({ event: 'prompt_recall', properties } as unknown as RendererTelemetryEvent);
    const actions = peekQueueForTesting().filter((event) => event.event === 'message_action');
    expect(actions).toHaveLength(3);
    expect(actions.map((event) => event.properties.action)).toEqual(['copy', 'copy_code', 'retry']);
    const recalls = peekQueueForTesting().filter((event) => event.event === 'prompt_recall');
    expect(recalls).toHaveLength(1);
    expect(recalls[0]?.properties).toMatchObject({ steps_back: 2, had_attachments: true, next_action: 'edit', harness: 'claude' });
    for (const event of [...actions, ...recalls]) {
      expect(event.properties).not.toHaveProperty('text');
      expect(event.properties).not.toHaveProperty('code');
    }
  });
  it('records recovery actions as counts and drops private fields and invalid values', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    receiveRendererTelemetry({
      event: 'project_recovery_action',
      properties: { action: 'dismiss', count: 2, path: '/private/project' },
    } as unknown as RendererTelemetryEvent);
    for (const properties of [{ action: 'delete', count: 2 }, { action: 'dismiss', count: -1 }]) {
      receiveRendererTelemetry({ event: 'project_recovery_action', properties } as RendererTelemetryEvent);
    }
    const events = peekQueueForTesting().filter((event) => event.event === 'project_recovery_action');
    expect(events).toHaveLength(1);
    expect(events[0]!.properties['action']).toBe('dismiss');
    expect(events[0]!.properties['count']).toBe(2);
    expect(events[0]!.properties).not.toHaveProperty('path');
  });

  it('an event name outside the union is dropped, not captured', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    // The type forbids both; a compromised renderer is not bound by it.
    receiveRendererTelemetry({
      event: 'app_opened',
      properties: { is_first_launch: true, locale: 'en-US' },
    } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({
      event: 'made_up_event',
      properties: { path: '/Users/someone/secret-repo' },
    } as unknown as RendererTelemetryEvent);

    receiveRendererTelemetry({
      event: 'ghost_affordance_reached',
      properties: { affordance: 'chat-new-conversation', surface: 'chat' },
    } as unknown as RendererTelemetryEvent);

    expect(peekQueueForTesting().map((event) => event.event)).toEqual(['app_opened']);
  });

  it('frame_created rides with its method alone — extras never board', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'frame_created', properties: { method: 'click' } });
    receiveRendererTelemetry({
      event: 'frame_created',
      properties: { method: 'drag', url: 'http://localhost:3000' },
    } as unknown as RendererTelemetryEvent);

    const events = peekQueueForTesting();
    expect(events.map((event) => event.event)).toEqual([
      'app_opened',
      'frame_created',
      'frame_created',
    ]);
    expect(events[1]!.properties['method']).toBe('click');
    expect(events[2]!.properties['method']).toBe('drag');
    expect(events[2]!.properties['url']).toBeUndefined();
  });

  it('frame_tool_armed captures with empty properties — smuggled fields never board', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'frame_tool_armed', properties: {} });
    receiveRendererTelemetry({
      event: 'frame_tool_armed',
      properties: { path: '/Users/someone/secret-repo' },
    } as unknown as RendererTelemetryEvent);

    const events = peekQueueForTesting();
    expect(events.map((event) => event.event)).toEqual([
      'app_opened',
      'frame_tool_armed',
      'frame_tool_armed',
    ]);
    expect(events[1]!.properties['path']).toBeUndefined();
    expect(events[2]!.properties['path']).toBeUndefined();
  });

  it('frame scrolling reports only deliberate interaction methods', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    receiveRendererTelemetry({ event: 'frame_scrolled', properties: { method: 'drag', page: 'private' } } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({ event: 'frame_scrolled', properties: { method: 'wheel' } } as unknown as RendererTelemetryEvent);
    const events = peekQueueForTesting().filter((event) => event.event === 'frame_scrolled');
    expect(events).toHaveLength(1);
    expect(events[0]!.properties['method']).toBe('drag');
    expect(events[0]!.properties['page']).toBeUndefined();
  });

  it('a placed text node never boards its worktree path, and nothing at all for an unknown project (ONL-2486)', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({
      event: 'text_node_created',
      properties: {
        worktreePath: '/Users/someone/secret-repo/.studio/worktrees/abc',
        method: 'tool',
        count: 1,
      },
    });
    receiveRendererTelemetry({ event: 'text_tool_armed', properties: {} });

    const events = peekQueueForTesting();
    expect(events.map((event) => event.event)).toEqual([
      'app_opened',
      'text_node_created',
      'text_tool_armed',
    ]);
    expect(events[1]!.properties['method']).toBe('tool');
    expect(events[1]!.properties['count']).toBe(1);
    expect(events[1]!.properties['worktreePath']).toBeUndefined();
    expect(JSON.stringify(events[1]!.properties)).not.toContain('secret-repo');
    // An unregistered project resolves to no id at all, as the inline bubble's event does.
    expect(events[1]!.properties['project_id']).toBeUndefined();
  });

  describe('canvas objects (ONL-2486)', () => {
    function captured(): { event: string; properties: Record<string, unknown> }[] {
      return peekQueueForTesting()
        .filter((event) => event.event !== 'app_opened')
        .map((event) => ({ event: event.event, properties: event.properties }));
    }

    beforeEach(() => {
      process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
      initTelemetry();
    });

    it('carries one method per path that can put an object on the canvas', () => {
      for (const method of ['tool', 'paste', 'duplicate'] as const) {
        receiveRendererTelemetry({ event: 'text_node_created', properties: { method, count: 2 } });
      }
      for (const method of ['drop', 'paste', 'picker', 'duplicate'] as const) {
        receiveRendererTelemetry({ event: 'image_node_created', properties: { method, count: 3 } });
      }

      expect(captured().map((event) => [event.event, event.properties['method']])).toEqual([
        ['text_node_created', 'tool'],
        ['text_node_created', 'paste'],
        ['text_node_created', 'duplicate'],
        ['image_node_created', 'drop'],
        ['image_node_created', 'paste'],
        ['image_node_created', 'picker'],
        ['image_node_created', 'duplicate'],
      ]);
      expect(captured()[0]?.properties['count']).toBe(2);
      expect(captured()[3]?.properties['count']).toBe(3);
    });

    it('refuses a method the renderer cannot author, and a count that is not a whole number', () => {
      receiveRendererTelemetry({
        event: 'text_node_created',
        properties: { method: 'agent', count: 1 },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'image_node_created',
        properties: { method: 'agent', count: 1 },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'text_node_created',
        properties: { method: 'tool', count: 1.5 },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'image_node_created',
        properties: { method: 'drop' },
      } as unknown as RendererTelemetryEvent);

      expect(captured()).toEqual([]);
    });

    it('carries a distinct reason for each way a picture is refused', () => {
      for (const reason of [
        'unreadable',
        'too-large',
        'unsupported-format',
        'too-many-files',
        'no-image',
      ] as const) {
        receiveRendererTelemetry({
          event: 'image_refused',
          properties: { method: 'drop', reason, count: 1 },
        });
      }

      expect(captured().map((event) => event.properties['reason'])).toEqual([
        'unreadable',
        'too-large',
        'unsupported-format',
        'too-many-files',
        'no-image',
      ]);
    });

    it('drops a reason off the closed set, and never boards the file a refusal named', () => {
      receiveRendererTelemetry({
        event: 'image_refused',
        properties: { method: 'drop', reason: 'no thanks', count: 1 },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'image_refused',
        properties: { method: 'drop', reason: 'too-large', count: 1, name: 'pricing-v4.png' },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'image_node_created',
        properties: { method: 'paste', count: 1, name: 'pricing-v4.png' },
      } as unknown as RendererTelemetryEvent);

      expect(captured().map((event) => event.event)).toEqual([
        'image_refused',
        'image_node_created',
      ]);
      for (const event of captured()) {
        expect(event.properties['name']).toBeUndefined();
        expect(JSON.stringify(event.properties)).not.toContain('pricing-v4');
      }
    });

    it('reports the size a change landed on and how many labels took it', () => {
      receiveRendererTelemetry({
        event: 'text_size_changed',
        properties: { size: 'large', node_count: 4 },
      });
      receiveRendererTelemetry({
        event: 'text_size_changed',
        properties: { size: 'enormous', node_count: 1 },
      } as unknown as RendererTelemetryEvent);

      expect(captured()).toHaveLength(1);
      expect(captured()[0]?.properties).toMatchObject({ size: 'large', node_count: 4 });
    });

    it('reports which resize it was', () => {
      receiveRendererTelemetry({
        event: 'image_resized',
        properties: { method: 'handle' },
      });
      receiveRendererTelemetry({
        event: 'image_resized',
        properties: { method: 'restore-aspect-ratio' },
      });
      receiveRendererTelemetry({
        event: 'image_resized',
        properties: { method: 'nudge' },
      } as unknown as RendererTelemetryEvent);

      expect(captured().map((event) => event.properties['method'])).toEqual([
        'handle',
        'restore-aspect-ratio',
      ]);
    });

    it('reports text handle resizes without carrying layout or text across the boundary', () => {
      receiveRendererTelemetry({ event: 'text_resized', properties: { method: 'handle', text: 'private source content', width: 720 } } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({ event: 'text_resized', properties: { method: 'restore-aspect-ratio' } } as unknown as RendererTelemetryEvent);
      expect(captured()).toHaveLength(1);
      expect(captured()[0]!.event).toBe('text_resized');
      expect(captured()[0]!.properties['method']).toBe('handle');
      expect(captured()[0]!.properties['text']).toBeUndefined();
      expect(captured()[0]!.properties['width']).toBeUndefined();
      expect(JSON.stringify(captured())).not.toContain('private source content');
    });
  });

  it('frame_created with a method off the enum is dropped', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({
      event: 'frame_created',
      properties: { method: 'scripted' },
    } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({
      event: 'frame_created',
      properties: {},
    } as unknown as RendererTelemetryEvent);

    expect(peekQueueForTesting().map((event) => event.event)).toEqual(['app_opened']);
  });

  it('agent_status_opened carries the line’s state, target and place in the list, and drops anything else', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'agent_status_opened', properties: { state: 'done', target: 'frame', position: 1, line_count: 2 } });
    receiveRendererTelemetry({ event: 'agent_status_opened', properties: { state: 'needs-you', target: 'url', position: 0, line_count: 1 } } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({ event: 'agent_status_opened', properties: { state: 'done', target: 'frame', position: -1, line_count: 2 } });
    receiveRendererTelemetry({ event: 'agent_status_opened', properties: { state: 'done', target: 'frame', position: 0, line_count: 2, frame: 'Home' } } as unknown as RendererTelemetryEvent);

    const sent = peekQueueForTesting().filter((event) => event.event === 'agent_status_opened');
    expect(sent.map(({ properties: { state, target, position, line_count } }) => ({ state, target, position, line_count }))).toEqual([
      { state: 'done', target: 'frame', position: 1, line_count: 2 },
      { state: 'done', target: 'frame', position: 0, line_count: 2 },
    ]);
    expect(sent.some((event) => 'frame' in event.properties)).toBe(false);
  });

  it('the notification invite events carry the surface and the action, and drop anything else (ONL-2995)', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'notification_invite_shown', properties: { surface: 'rail_tip' } });
    receiveRendererTelemetry({ event: 'notification_invite_shown', properties: { surface: 'chat' } } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({ event: 'notification_invite_acted', properties: { surface: 'rail_tip', action: 'dismiss' } });
    receiveRendererTelemetry({ event: 'notification_invite_acted', properties: { surface: 'rail_tip', action: 'snooze' } } as unknown as RendererTelemetryEvent);

    const sent = peekQueueForTesting().filter((event) => event.event.startsWith('notification_invite_'));
    expect(sent.map(({ event, properties: { surface, action } }) => ({ event, surface, action }))).toEqual([
      { event: 'notification_invite_shown', surface: 'rail_tip', action: undefined },
      { event: 'notification_invite_acted', surface: 'rail_tip', action: 'dismiss' },
    ]);
  });

  it('onboarding screens carry the screen, the visit and the launch main saw, and drop anything else (ONL-3259)', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'onboarding_screen_shown', properties: { screen: 'found', visit: 1, is_first_launch: false, path: '/private/project' } } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({ event: 'onboarding_screen_passed', properties: { screen: 'found', is_first_launch: false } } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({ event: 'onboarding_screen_shown', properties: { screen: 'machine', visit: 2 } });
    receiveRendererTelemetry({ event: 'onboarding_screen_passed', properties: { screen: 'import', choice: 'blank' } });
    for (const properties of [
      { screen: 'pricing', visit: 1 },
      { screen: 'agent', visit: 0 },
      { screen: 'agent', visit: 1.5 },
      { screen: 'agent' },
    ]) receiveRendererTelemetry({ event: 'onboarding_screen_shown', properties } as unknown as RendererTelemetryEvent);
    for (const properties of [
      { screen: 'import' },
      { screen: 'import', choice: 'github' },
      { screen: 'agent', choice: 'new' },
      { screen: 'pricing' },
    ]) receiveRendererTelemetry({ event: 'onboarding_screen_passed', properties } as unknown as RendererTelemetryEvent);

    const sent = peekQueueForTesting().filter((event) => event.event.startsWith('onboarding_screen_'));
    expect(sent.map(({ event, properties: { screen, visit, choice, is_first_launch } }) => ({ event, screen, visit, choice, is_first_launch }))).toEqual([
      { event: 'onboarding_screen_shown', screen: 'found', visit: 1, choice: undefined, is_first_launch: true },
      { event: 'onboarding_screen_passed', screen: 'found', visit: undefined, choice: undefined, is_first_launch: true },
      { event: 'onboarding_screen_shown', screen: 'machine', visit: 2, choice: undefined, is_first_launch: true },
      { event: 'onboarding_screen_passed', screen: 'import', visit: undefined, choice: 'blank', is_first_launch: true },
    ]);
    expect(JSON.stringify(sent)).not.toContain('private');
  });

  it('a tip records how long it waited to show, and a delay that is not a duration is dropped (ONL-2959)', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'first_run_shown', properties: { surface: 'prompt_tip', delay_ms: 20_000.4 } });
    receiveRendererTelemetry({ event: 'first_run_shown', properties: { surface: 'prompt_tip', delay_ms: 'soon' } } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({ event: 'first_run_acted', properties: { surface: 'prompt_tip', action: 'show_prompts' } });

    const sent = peekQueueForTesting().filter((event) => event.event.startsWith('first_run_'));
    expect(sent.map((event) => ({ event: event.event, delay: event.properties['delay_ms'], action: event.properties['action'] }))).toEqual([
      { event: 'first_run_shown', delay: 20_000, action: undefined },
      { event: 'first_run_shown', delay: undefined, action: undefined },
      { event: 'first_run_acted', delay: undefined, action: 'show_prompts' },
    ]);
  });

  it('a tip resolved without being acted on says what ended it, and a reason rides only that action (ONL-2960)', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'first_run_acted', properties: { surface: 'scroll_tip', action: 'resolved', reason: 'question' } });
    receiveRendererTelemetry({ event: 'first_run_acted', properties: { surface: 'inspire_tip', action: 'resolved', reason: 'other_path' } });
    receiveRendererTelemetry({ event: 'first_run_acted', properties: { surface: 'scroll_tip', action: 'resolved' } });
    receiveRendererTelemetry({ event: 'first_run_acted', properties: { surface: 'scroll_tip', action: 'resolved', reason: 'boredom' } } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({ event: 'first_run_acted', properties: { surface: 'scroll_tip', action: 'not_now', reason: 'question' } });
    receiveRendererTelemetry({ event: 'notification_invite_acted', properties: { surface: 'rail_tip', action: 'resolved', reason: 'approval' } });

    const sent = peekQueueForTesting().filter((event) => event.event === 'first_run_acted' || event.event === 'notification_invite_acted');
    expect(sent.map((event) => ({ event: event.event, action: event.properties['action'], reason: event.properties['reason'] }))).toEqual([
      { event: 'first_run_acted', action: 'resolved', reason: 'question' },
      { event: 'first_run_acted', action: 'resolved', reason: 'other_path' },
      { event: 'notification_invite_acted', action: 'resolved', reason: 'approval' },
    ]);
  });

  it('agent_status_expanded carries how many lines the list opened to, and drops anything else', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'agent_status_expanded', properties: { line_count: 4 } });
    receiveRendererTelemetry({ event: 'agent_status_expanded', properties: { line_count: -1 } });
    receiveRendererTelemetry({ event: 'agent_status_expanded', properties: { line_count: 3, frame: 'Home' } } as unknown as RendererTelemetryEvent);

    const sent = peekQueueForTesting().filter((event) => event.event === 'agent_status_expanded');
    expect(sent.map((event) => event.properties.line_count)).toEqual([4, 3]);
    expect(sent.some((event) => 'frame' in event.properties)).toBe(false);
  });

  it('tips_pill_dismissed says whether the × or a selection dismissed it, and drops any other way', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'tips_pill_dismissed', properties: { source: 'close' } });
    receiveRendererTelemetry({ event: 'tips_pill_dismissed', properties: { source: 'selection' } });
    receiveRendererTelemetry({ event: 'tips_pill_dismissed', properties: { source: 'timeout' } } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({ event: 'tips_pill_dismissed', properties: {} } as unknown as RendererTelemetryEvent);

    expect(
      peekQueueForTesting()
        .filter((event) => event.event === 'tips_pill_dismissed')
        .map((event) => event.properties['source']),
    ).toEqual(['close', 'selection']);
  });

  describe('the artifacts section (ONL-2568)', () => {
    function captured(): { event: string; properties: Record<string, unknown> }[] {
      return peekQueueForTesting()
        .filter((event) => event.event !== 'app_opened')
        .map((event) => ({ event: event.event, properties: event.properties }));
    }

    beforeEach(() => {
      process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
      initTelemetry();
    });

    it('carries the method a drawn artifact reports, and a count for the node it placed', () => {
      receiveRendererTelemetry({ event: 'artifact_created', properties: { method: 'click' } });
      receiveRendererTelemetry({
        event: 'artifact_placed',
        properties: { method: 'click', count: 1 },
      });

      expect(captured().map((event) => event.event)).toEqual([
        'artifact_created',
        'artifact_placed',
      ]);
      expect(captured()[0]?.properties).toMatchObject({ method: 'click' });
      expect(captured()[1]?.properties).toMatchObject({ method: 'click', count: 1 });
    });

    it('distinguishes a paste from a click on the same event', () => {
      receiveRendererTelemetry({ event: 'artifact_created', properties: { method: 'paste' } });

      expect(captured()[0]?.properties).toMatchObject({ method: 'paste' });
    });

    it('drops a renderer claiming the agent authored one', () => {
      // `agent` is main's own stamp; the renderer cannot claim it.
      receiveRendererTelemetry({
        event: 'artifact_created',
        properties: { method: 'agent' },
      } as unknown as RendererTelemetryEvent);

      expect(captured()).toEqual([]);
    });

    it('drops a title smuggled onto the event, and never ships one', () => {
      receiveRendererTelemetry({
        event: 'artifact_created',
        properties: { method: 'click', title: 'Pricing page v3' },
      } as unknown as RendererTelemetryEvent);

      expect(captured()[0]?.properties).toMatchObject({ method: 'click' });
      expect(captured()[0]?.properties['title']).toBeUndefined();
      expect(JSON.stringify(captured())).not.toContain('Pricing');
    });

    it('drops a path smuggled through worktreePath for an unregistered project', () => {
      receiveRendererTelemetry({
        event: 'artifact_placed',
        properties: { method: 'click', count: 1, worktreePath: '/Users/someone/secret/repo' },
      });

      expect(captured()[0]?.properties['project_id']).toBeUndefined();
      expect(JSON.stringify(captured())).not.toContain('secret');
    });

    it('drops a count that is not one', () => {
      receiveRendererTelemetry({
        event: 'artifact_placed',
        properties: { method: 'click', count: -1 },
      } as unknown as RendererTelemetryEvent);

      expect(captured()).toEqual([]);
    });
  });

  describe('the pages section (ONL-2488)', () => {
    function captured(): { event: string; properties: Record<string, unknown> }[] {
      return peekQueueForTesting()
        .filter((event) => event.event !== 'app_opened')
        .map((event) => ({ event: event.event, properties: event.properties }));
    }

    beforeEach(() => {
      process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
      initTelemetry();
    });

    it('carries the counts and the method each page gesture reports', () => {
      receiveRendererTelemetry({ event: 'page_created', properties: { method: 'plus' } });
      receiveRendererTelemetry({
        event: 'page_switched',
        properties: { method: 'click', node_count: 0, artifact_node_count: 0, artifact_cover_held_count: 0, artifact_snapshot_held_count: 0, ms_since_open: 4200 },
      });
      receiveRendererTelemetry({
        event: 'page_renamed',
        properties: { method: 'user', became_divider: true },
      });
      receiveRendererTelemetry({
        event: 'page_deleted',
        properties: { method: 'user', had_nodes: true, confirmed: true },
      });
      receiveRendererTelemetry({
        event: 'page_nodes_moved',
        properties: { method: 'menu', node_count: 3 },
      });

      expect(captured().map((event) => event.event)).toEqual([
        'page_created',
        'page_switched',
        'page_renamed',
        'page_deleted',
        'page_nodes_moved',
      ]);
      expect(captured()[0]?.properties).toMatchObject({ method: 'plus' });
      expect(captured()[1]?.properties).toMatchObject({
        method: 'click',
        node_count: 0,
        artifact_node_count: 0,
        artifact_cover_held_count: 0,
        artifact_snapshot_held_count: 0,
        ms_since_open: 4200,
      });
      expect(captured()[2]?.properties).toMatchObject({ method: 'user', became_divider: true });
      expect(captured()[3]?.properties).toMatchObject({
        method: 'user',
        had_nodes: true,
        confirmed: true,
      });
      expect(captured()[4]?.properties).toMatchObject({ method: 'menu', node_count: 3 });
    });

    it('refuses a method the renderer cannot author — main stamps the agent at the tool', () => {
      for (const event of ['page_created', 'page_renamed', 'page_deleted', 'page_nodes_moved']) {
        receiveRendererTelemetry({
          event,
          properties: { method: 'agent', became_divider: false, had_nodes: false, confirmed: false, node_count: 1 },
        } as unknown as RendererTelemetryEvent);
      }

      expect(captured()).toEqual([]);
    });

    it('drops a property the renderer map does not declare, rather than boarding it (ONL-2488)', () => {
      receiveRendererTelemetry({
        event: 'page_switched',
        properties: {
          method: 'click',
          node_count: 1,
          artifact_node_count: 1,
          artifact_cover_held_count: 1,
          artifact_snapshot_held_count: 0,
          page_name: 'Checkout',
          worktreePath: '/Users/tester/site',
        },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'page_created',
        properties: { method: 'plus', page_id: 'pg_a', name: 'Checkout' },
      } as unknown as RendererTelemetryEvent);

      expect(captured().map((event) => event.event)).toEqual(['page_switched', 'page_created']);
      for (const event of captured()) {
        expect(event.properties['page_name']).toBeUndefined();
        expect(event.properties['page_id']).toBeUndefined();
        expect(event.properties['name']).toBeUndefined();
        expect(JSON.stringify(event.properties)).not.toContain('Checkout');
        expect(JSON.stringify(event.properties)).not.toContain('/Users/tester');
      }
    });

    it('refuses a switch whose counts are not whole, and a flag that is not one', () => {
      receiveRendererTelemetry({
        event: 'page_switched',
        properties: { method: 'click', node_count: -1 },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'page_switched',
        properties: { method: 'teleport', node_count: 1 },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'page_switched',
        properties: { method: 'click', node_count: 1, artifact_node_count: 1, artifact_cover_held_count: 0.5, artifact_snapshot_held_count: 0 },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'page_switched',
        properties: { method: 'click', node_count: 1, artifact_node_count: 1, artifact_cover_held_count: 1, artifact_snapshot_held_count: 'two' },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'page_deleted',
        properties: { method: 'user', had_nodes: 'yes', confirmed: true },
      } as unknown as RendererTelemetryEvent);

      expect(captured()).toEqual([]);
    });
  });

  describe('git pill events', () => {
    let worktree: string;

    beforeEach(() => {
      process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
      const workspaceRootDir = makeWorkspaceRoot({ name: 'telemetry-ipc' });
      process.env['STUDIO_WORKSPACE_ROOT'] = workspaceRootDir;
      resetWorkspaceCache();
      worktree = join(workspaceRootDir, 'repo', 'teal-skylark');
      mkdirSync(worktree, { recursive: true });
      const record: WorkspaceCreated = {
        workspacePath: worktree,
        workspaceName: 'teal-skylark',
        branchName: 'user/teal-skylark',
        baseBranch: 'main',
        sourceRepoName: 'repo',
        sourcePath: '/nowhere/repo',
        sourceRepoRoot: '/nowhere/repo',
        repoIdentity: 'repo',
        copiedEnvFiles: [],
      };
      rememberProject(record);
      initTelemetry();
    });

    it('a valid shown event captures both workspace IDs, never the path or forged IDs', () => {
      receiveRendererTelemetry({
        event: 'git_pill_shown',
        properties: { worktreePath: worktree, state: 'create-pr', project_id: 'forged-project', workspace_instance_id: 'forged-instance' },
      } as unknown as RendererTelemetryEvent);
      const events = peekQueueForTesting();
      expect(events.map((event) => event.event)).toEqual(['app_opened', 'git_pill_shown']);
      const shown = events[1]!;
      expect(shown.properties['state']).toBe('create-pr');
      const project = shown.properties['project_id'] as string;
      expect(project).toMatch(/^[0-9a-f]{16}$/);
      expect(shown.properties).toMatchObject(workspaceTelemetryProperties('repo'));
      expect(shown.properties['workspace_instance_id']).toEqual(expect.any(String));
      expect(shown.properties['project_id']).not.toBe('forged-project');
      expect(shown.properties['workspace_instance_id']).not.toBe('forged-instance');
      expect(JSON.stringify(shown.properties)).not.toContain('teal-skylark');
      expect(shown.properties['worktreePath']).toBeUndefined();
    });

    it('accepts inert presses with only bounded facts and rejects smuggled labels and reasons', () => {
      receiveRendererTelemetry({ event: 'git_pill_no_action', properties: {
        worktreePath: worktree, state: 'local-only', reason: 'passive-state',
        account: 'private-account', branch: 'private-branch', repo: 'private-repo',
      } } as unknown as RendererTelemetryEvent);
      for (const properties of [
        { worktreePath: worktree, state: 'private-repo', reason: 'passive-state' },
        { worktreePath: worktree, state: 'local-only', reason: '/private/path' },
        { worktreePath: '/unknown/project', state: 'local-only', reason: 'passive-state' },
      ]) receiveRendererTelemetry({ event: 'git_pill_no_action', properties } as unknown as RendererTelemetryEvent);
      const captured = peekQueueForTesting().filter((event) => event.event === 'git_pill_no_action');
      expect(captured).toHaveLength(1);
      expect(captured[0]!.properties).toMatchObject({ state: 'local-only', reason: 'passive-state' });
      expect(captured[0]!.properties['project_id']).toMatch(/^[0-9a-f]{16}$/);
      for (const key of ['account', 'branch', 'repo', 'worktreePath']) expect(captured[0]!.properties).not.toHaveProperty(key);
    });

    it('a queued press and the take-back that ends it both reach the queue (ONL-2379)', () => {
      receiveRendererTelemetry({
        event: 'git_pill_queued',
        properties: { worktreePath: worktree, state: 'create-pr', action: 'create-pr' },
      });
      receiveRendererTelemetry({
        event: 'git_pill_outcome',
        properties: {
          worktreePath: worktree,
          from_state: 'create-pr',
          to_state: 'create-pr',
          outcome: 'cancelled',
          duration_ms: 1_200,
        },
      });
      const events = peekQueueForTesting();
      expect(events.map((event) => event.event)).toEqual(['app_opened', 'git_pill_queued', 'git_pill_outcome']);
      expect(events[1]!.properties['action']).toBe('create-pr');
      expect(events[1]!.properties['worktreePath']).toBeUndefined();
      expect(events[2]!.properties['outcome']).toBe('cancelled');
    });

    it('a worktree outside the registry captures nothing', () => {
      receiveRendererTelemetry({
        event: 'git_pill_shown',
        properties: { worktreePath: '/tmp/not-a-workspace', state: 'create-pr' },
      });
      expect(peekQueueForTesting().map((event) => event.event)).toEqual(['app_opened']);
    });

    it('a non-string or empty worktreePath is dropped without throwing', () => {
      receiveRendererTelemetry({
        event: 'git_pill_shown',
        properties: { worktreePath: 42, state: 'create-pr' },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'git_pill_shown',
        properties: { worktreePath: null, state: 'create-pr' },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'git_pill_shown',
        properties: { worktreePath: '', state: 'create-pr' },
      });
      expect(peekQueueForTesting().map((event) => event.event)).toEqual(['app_opened']);
    });

    it('path-shaped and free-text state or action ids are dropped', () => {
      receiveRendererTelemetry({
        event: 'git_pill_shown',
        properties: { worktreePath: worktree, state: '/etc/passwd' },
      });
      receiveRendererTelemetry({
        event: 'git_pill_clicked',
        properties: { worktreePath: worktree, state: 'create-pr', action: 'Create PR now' },
      });
      expect(peekQueueForTesting().map((event) => event.event)).toEqual(['app_opened']);
    });

    it('path-shaped and free-text outcome states are each dropped on their own', () => {
      receiveRendererTelemetry({
        event: 'git_pill_outcome',
        properties: { worktreePath: worktree, from_state: '/etc/passwd', to_state: 'checks-running', outcome: 'advanced', duration_ms: 100 },
      });
      receiveRendererTelemetry({
        event: 'git_pill_outcome',
        properties: { worktreePath: worktree, from_state: 'create-pr', to_state: 'Checks Running', outcome: 'advanced', duration_ms: 100 },
      });
      expect(peekQueueForTesting().map((event) => event.event)).toEqual(['app_opened']);
    });

    it('clicked rides with its three properties and nothing smuggled', () => {
      receiveRendererTelemetry({
        event: 'git_pill_clicked',
        properties: { worktreePath: worktree, state: 'create-pr', action: 'push', branch: 'user/secret' },
      } as unknown as RendererTelemetryEvent);
      const events = peekQueueForTesting();
      expect(events.map((event) => event.event)).toEqual(['app_opened', 'git_pill_clicked', 'publish_triggered']);
      expect(events[1]!.properties['action']).toBe('push');
      expect(events[1]!.properties['branch']).toBeUndefined();
    });

    it('outcome validates its union and duration bound', () => {
      receiveRendererTelemetry({
        event: 'git_pill_outcome',
        properties: { worktreePath: worktree, from_state: 'create-pr', to_state: 'checks-running', outcome: 'exploded', duration_ms: 100 },
      } as unknown as RendererTelemetryEvent);
      receiveRendererTelemetry({
        event: 'git_pill_outcome',
        properties: { worktreePath: worktree, from_state: 'create-pr', to_state: 'checks-running', outcome: 'advanced', duration_ms: -5 },
      });
      receiveRendererTelemetry({
        event: 'git_pill_outcome',
        properties: { worktreePath: worktree, from_state: 'create-pr', to_state: 'checks-running', outcome: 'advanced', duration_ms: Number.NaN },
      });
      receiveRendererTelemetry({
        event: 'git_pill_outcome',
        properties: { worktreePath: worktree, from_state: 'create-pr', to_state: 'checks-running', outcome: 'advanced', duration_ms: 6200 },
      });
      const events = peekQueueForTesting();
      expect(events.map((event) => event.event)).toEqual(['app_opened', 'git_pill_outcome', 'code_exported']);
      expect(events[1]!.properties['outcome']).toBe('advanced');
      expect(events[1]!.properties['duration_ms']).toBe(6200);
    });

    it('a publish pick fires publish_triggered; an advanced outcome fires code_exported; neither on other actions (ONL-2380)', () => {
      receiveRendererTelemetry({
        event: 'git_pill_clicked',
        properties: { worktreePath: worktree, state: 'create-pr', action: 'push' },
      });
      receiveRendererTelemetry({
        event: 'git_pill_clicked',
        properties: { worktreePath: worktree, state: 'ready-to-merge', action: 'open-in-browser' },
      });
      receiveRendererTelemetry({
        event: 'git_pill_outcome',
        properties: { worktreePath: worktree, from_state: 'ready-to-merge', to_state: 'merged', outcome: 'advanced', duration_ms: 900 },
      });
      receiveRendererTelemetry({
        event: 'git_pill_outcome',
        properties: { worktreePath: worktree, from_state: 'create-pr', to_state: 'create-pr', outcome: 'unchanged', duration_ms: 900 },
      });
      receiveRendererTelemetry({
        event: 'git_pill_outcome',
        properties: { worktreePath: worktree, from_state: 'download-changes', to_state: 'first-paint', outcome: 'advanced', duration_ms: 900 },
      });

      const events = peekQueueForTesting();
      expect(events.map((event) => event.event)).toEqual([
        'app_opened',
        'git_pill_clicked',
        'publish_triggered',
        'git_pill_clicked',
        'git_pill_outcome',
        'code_exported',
        'git_pill_outcome',
        'git_pill_outcome',
      ]);
      expect(events[2]!.properties['export_type']).toBe('push');
      expect(events[2]!.properties['route']).toBe('agent');
      expect(events[5]!.properties['export_type']).toBe('merge');
      expect(events[5]!.properties['duration_ms']).toBe(900);
      for (const event of events) {
        expect(JSON.stringify(event.properties)).not.toContain(worktree);
      }
    });
  });
});

describe('receiveReplaySession', () => {
  it('adopts a UUIDv7, ignores a v4 or a non-string, and null restores the launch id', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const launch = currentSessionId();
    const rotated = '01920000-0000-7000-8000-00000000abcd';
    receiveReplaySession({ sessionId: rotated });
    expect(currentSessionId()).toBe(rotated);
    receiveReplaySession({ sessionId: '3b241101-e2bb-4a5e-8f4d-2e1c9a7b6d5f' });
    expect(currentSessionId()).toBe(rotated);
    receiveReplaySession({ sessionId: 42 } as unknown as { sessionId: string });
    expect(currentSessionId()).toBe(rotated);
    receiveReplaySession(null as unknown as { sessionId: string });
    expect(currentSessionId()).toBe(rotated);
    receiveReplaySession({ sessionId: null });
    expect(currentSessionId()).toBe(launch);
  });
});

describe('receiveRendererException', () => {
  it('ignores only recognized browser notices and classifies network failures at the trusted intake', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const base = { type: 'Error', frames: [], surface: 'tab' as const };
    receiveRendererException({ ...base, value: 'ResizeObserver loop completed with undelivered notifications.', mechanism: 'resize-observer-loop' });
    receiveRendererException({ ...base, value: 'ResizeObserver loop limit exceeded', mechanism: 'resize-observer-loop' });
    receiveRendererException({ ...base, value: 'net::ERR_CONNECTION_RESET (-101)', mechanism: 'unhandled-rejection' });
    expect(peekQueueForTesting().filter((event) => event.event === '$exception')).toHaveLength(0);
    receiveRendererException({ ...base, value: 'a real failure /Users/wren/repo/file.ts', mechanism: 'resize-observer-loop' });
    receiveRendererException({ ...base, value: 'ResizeObserver loop completed with undelivered notifications.', mechanism: 'window-error' });
    receiveRendererException({ ...base, value: 'net::ERR_INVALID_URL', mechanism: 'unhandled-rejection' });
    const sent = peekQueueForTesting().filter((event) => event.event === '$exception');
    expect(sent).toHaveLength(3);
    expect(JSON.stringify(sent)).not.toContain('/Users/');
  });

  function enableExceptionTelemetry(): void {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
  }

  it('Windows renderer exceptions retain scrubbed stack frames and their process type', () => {
    enableExceptionTelemetry();
    receiveRendererException({ type: 'TypeError', value: 'failed at C:\\private\\project\\file.ts', surface: 'tab', mechanism: 'window-error', frames: [{ platform: 'web:javascript', filename: 'C:\\private\\Onlook\\resources\\app.asar\\out\\renderer\\index.js', function: 'render', lineno: 19, colno: 4, in_app: true }] });
    const event = peekQueueForTesting().find((entry) => entry.event === '$exception');
    expect(event?.properties).toMatchObject({ process_type: 'renderer', $exception_type: 'TypeError', $exception_list: [{ stacktrace: { frames: [{ filename: 'app://studio/out/renderer/index.js', lineno: 19, colno: 4 }] } }] });
    expect(JSON.stringify(event)).not.toContain('private');
  });

  it('a report becomes one $exception owned by us, frames re-scrubbed, surface and mechanism kept', () => {
    enableExceptionTelemetry();
    recordLinesForTesting();
    receiveRendererException({
      type: 'TypeError',
      value: 'x is not a function at /Users/wren/repo/x.ts',
      frames: [{ platform: 'node:javascript', filename: '/Users/wren/repo/out/renderer/index.js', function: 'f', lineno: 1, colno: 2, in_app: true }],
      surface: 'tab',
      mechanism: 'window-error',
      region: 'chat',
    });
    const [event] = peekQueueForTesting().filter((e) => e.event === '$exception');
    expect(event).toBeDefined();
    const props = event!.properties;
    expect(props['$exception_type']).toBe('TypeError');
    expect(props['$exception_message']).toBe('x is not a function at <path>');
    expect(props['surface']).toBe('tab');
    expect(props['mechanism']).toBe('window-error');
    expect(props['region']).toBe('chat');
    expect(props['subsystem']).toBe('renderer');
    expect(props['process_type']).toBe('renderer');
    expect(JSON.stringify(props)).not.toContain('/Users/');
    expect((props['$exception_list'] as Array<{ stacktrace: { frames: Array<{ filename: string; platform: string }> } }>)[0]!.stacktrace.frames[0]).toMatchObject({
      filename: 'app://studio/renderer/index.js',
      platform: 'web:javascript',
    });
    expect(peekLinesForTesting().at(-1)).toMatchObject({ level: 'error', subsystem: 'renderer', owner: 'ours' });
    resetLogForTesting();
  });

  it('an off-union surface, a free-text mechanism, a non-string type, and a null payload are dropped', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const base = { type: 'Error', value: 'x', frames: [], surface: 'tab' as const, mechanism: 'window-error' };
    receiveRendererException({ ...base, surface: 'guest' } as unknown as Parameters<typeof receiveRendererException>[0]);
    receiveRendererException({ ...base, mechanism: 'see /Users/wren' } as unknown as Parameters<typeof receiveRendererException>[0]);
    receiveRendererException({ ...base, type: 42 } as unknown as Parameters<typeof receiveRendererException>[0]);
    receiveRendererException(null as unknown as Parameters<typeof receiveRendererException>[0]);
    expect(peekQueueForTesting().filter((e) => e.event === '$exception')).toHaveLength(0);
  });

  it('a frame-preload report is owned as ours under its own subsystem', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    receiveRendererException({ type: 'Error', value: 'guest threw', frames: [], surface: 'frame-preload', mechanism: 'guest-handler' });
    const [event] = peekQueueForTesting().filter((e) => e.event === '$exception');
    expect(event!.properties['subsystem']).toBe('frame-preload');
  });
});

describe('the transcript events (ONL-2353)', () => {
  it('a gap with finite non-negative integer seqs is captured; a negative, a fraction, or a reversed range is dropped', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    receiveRendererTelemetry({ event: 'transcript_gap', properties: { agent_session_id: 'sess-1', from_seq: 5, to_seq: 9 } });
    receiveRendererTelemetry({ event: 'transcript_gap', properties: { agent_session_id: 'sess-1', from_seq: -1, to_seq: 9 } });
    receiveRendererTelemetry({ event: 'transcript_gap', properties: { agent_session_id: 'sess-1', from_seq: 1.5, to_seq: 9 } });
    receiveRendererTelemetry({ event: 'transcript_gap', properties: { agent_session_id: 'sess-1', from_seq: 9, to_seq: 5 } });
    receiveRendererTelemetry({ event: 'transcript_gap', properties: { agent_session_id: '/Users/x', from_seq: 1, to_seq: 2 } });
    const gaps = peekQueueForTesting().filter((e) => e.event === 'transcript_gap');
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.properties).toMatchObject({ agent_session_id: 'sess-1', from_seq: 5, to_seq: 9 });
  });

  it('an unknown event type is captured only in the dotted lowercase shape', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    receiveRendererTelemetry({ event: 'transcript_unknown_event', properties: { agent_session_id: 'sess-1', event_type: 'future.thing' } });
    receiveRendererTelemetry({ event: 'transcript_unknown_event', properties: { agent_session_id: 'sess-1', event_type: 'the user typed /Users/x' } });
    const rows = peekQueueForTesting().filter((e) => e.event === 'transcript_unknown_event');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.properties['event_type']).toBe('future.thing');
  });
});

describe('the silence a turn never reports for itself (ONL-2491)', () => {
  it('limit cards report only allowlisted agent and window kind, never message text', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    receiveRendererTelemetry({ event: 'rate_limit_card_shown', properties: { agent: 'claude', window_kind: 'weekly', message: 'private text' } } as RendererTelemetryEvent);
    receiveRendererTelemetry({ event: 'rate_limit_card_shown', properties: { agent: 'private text', window_kind: 'weekly' } } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({ event: 'rate_limit_card_shown', properties: { agent: 'codex', window_kind: 'private text' } } as unknown as RendererTelemetryEvent);
    const rows = peekQueueForTesting().filter((event) => event.event === 'rate_limit_card_shown');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.properties).toMatchObject({ agent: 'claude', window_kind: 'weekly' });
    expect(rows[0]?.properties).not.toHaveProperty('message');
  });
  function silences(): Record<string, unknown>[] {
    return peekQueueForTesting()
      .filter((event) => event.event === 'agent_silence_shown')
      .map((event) => event.properties);
  }

  it('captures the session, the harness and the elapsed silence', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    receiveRendererTelemetry({
      event: 'agent_silence_shown',
      properties: { agent_session_id: 'sess-1', harness: 'codex', silent_ms: 25_000 },
    });
    const [silence] = silences();
    expect(silence).toMatchObject({
      agent_session_id: 'sess-1',
      harness: 'codex',
      silent_ms: 25_000,
    });
    // No project is registered here, so the hash has nothing to swap in.
    expect(silence).not.toHaveProperty('project_id');
  });

  it('rides with its three fields alone — extras never board', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    receiveRendererTelemetry({
      event: 'agent_silence_shown',
      properties: {
        agent_session_id: 'sess-1',
        harness: 'claude',
        silent_ms: 25_000,
        prompt: 'make the header blue',
        cwd: '/Users/x/repo',
      },
    } as unknown as RendererTelemetryEvent);

    const [silence] = silences();
    expect(silence).toMatchObject({ agent_session_id: 'sess-1', harness: 'claude', silent_ms: 25_000 });
    expect(silence?.['prompt']).toBeUndefined();
    expect(silence?.['cwd']).toBeUndefined();
  });

  it('drops an off-union harness, a path-shaped session id, and a non-integer or negative elapsed', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    const sent: RendererTelemetryEvent['properties'][] = [
      { agent_session_id: 'sess-1', harness: 'bedrock', silent_ms: 25_000 },
      { agent_session_id: '/Users/x/repo', harness: 'claude', silent_ms: 25_000 },
      { agent_session_id: 'sess-1', harness: 'claude', silent_ms: '25000' },
      { agent_session_id: 'sess-1', harness: 'claude', silent_ms: -1 },
      { agent_session_id: 'sess-1', harness: 'claude', silent_ms: 25_000.5 },
      { agent_session_id: 'sess-1', silent_ms: 25_000 },
    ] as unknown as RendererTelemetryEvent['properties'][];
    for (const properties of sent) {
      receiveRendererTelemetry({ event: 'agent_silence_shown', properties } as RendererTelemetryEvent);
    }
    expect(silences()).toEqual([]);
  });

  it('swaps a known worktree for its hash and never carries the path', () => {
    const workspaceRootDir = makeWorkspaceRoot({ name: 'telemetry-silence' });
    process.env['STUDIO_WORKSPACE_ROOT'] = workspaceRootDir;
    resetWorkspaceCache();
    const worktree = join(workspaceRootDir, 'repo', 'teal-skylark');
    mkdirSync(worktree, { recursive: true });
    const record: WorkspaceCreated = {
      workspacePath: worktree,
      workspaceName: 'teal-skylark',
      branchName: 'user/teal-skylark',
      baseBranch: 'main',
      sourceRepoName: 'repo',
      sourcePath: '/nowhere/repo',
      sourceRepoRoot: '/nowhere/repo',
      repoIdentity: 'repo',
      copiedEnvFiles: [],
    };
    rememberProject(record);
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    receiveRendererTelemetry({
      event: 'agent_silence_shown',
      properties: {
        worktreePath: worktree,
        agent_session_id: 'sess-1',
        harness: 'claude',
        silent_ms: 31_000,
      },
    });
    const [silence] = silences();
    expect(silence?.['project_id']).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(silence)).not.toContain(worktree);
    resetWorkspaceCache();
  });
});

describe('the inline bubble measurements (ONL-2455)', () => {
  function rows(name: string, keys: readonly string[]): Record<string, unknown>[] {
    return peekQueueForTesting()
      .filter((event) => event.event === name)
      .map((event) =>
        Object.fromEntries(
          keys.flatMap((key) => (key in event.properties ? [[key, event.properties[key]]] : [])),
        ),
      );
  }

  const FORBIDDEN = ['prompt', 'text', 'tag', 'domPath', 'worktreePath', 'path'] as const;

  function forbiddenSeen(name: string): string[] {
    return peekQueueForTesting()
      .filter((event) => event.event === name)
      .flatMap((event) => FORBIDDEN.filter((key) => key in event.properties));
  }

  it('opens carrying no field of its own beyond a hashed project id', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'inline_chat_opened', properties: {} });
    expect(rows('inline_chat_opened', ['project_id'])).toEqual([{}]);
    expect(forbiddenSeen('inline_chat_opened')).toEqual([]);
  });

  it('distinguishes every way a bubble closes, each with whether a draft was lost', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    const methods = [
      'escape', 'click-away', 'mode-switch', 'tool-switch', 'picker-armed', 'selection-changed',
      'chat-sent', 'prompt-recalled', 'window-hidden', 'canvas-cleared', 'unattributed',
    ] as const;
    for (const method of methods) {
      receiveRendererTelemetry({ event: 'inline_chat_dismissed', properties: { method, draft_lost: method === 'escape' } });
    }

    expect(rows('inline_chat_dismissed', ['method', 'draft_lost'])).toEqual(
      methods.map((method) => ({ method, draft_lost: method === 'escape' })),
    );
    expect(forbiddenSeen('inline_chat_dismissed')).toEqual([]);
  });

  it('drops a dismissal whose method is off the enum, or whose loss flag is not a boolean', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({
      event: 'inline_chat_dismissed',
      properties: { method: 'gave-up', draft_lost: false },
    } as unknown as RendererTelemetryEvent);
    // Nothing the page does closes a bubble any more, so the method it would have carried is gone (ONL-2518).
    receiveRendererTelemetry({
      event: 'inline_chat_dismissed',
      properties: { method: 'page-left', draft_lost: true },
    } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({
      event: 'inline_chat_dismissed',
      properties: { method: 'escape', draft_lost: 'yes' },
    } as unknown as RendererTelemetryEvent);

    expect(rows('inline_chat_dismissed', ['method'])).toEqual([]);
  });

  it('records a turned-away inline send by its outcome and anchor, and drops an outcome off the enum', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'inline_chat_send_refused', properties: { outcome: 'rejected', anchor: 'element' } });
    receiveRendererTelemetry({ event: 'inline_chat_send_refused', properties: { outcome: 'in-flight', anchor: 'node' } });
    receiveRendererTelemetry({
      event: 'inline_chat_send_refused',
      properties: { outcome: 'accepted', anchor: 'element' },
    } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({
      event: 'inline_chat_send_refused',
      properties: { outcome: 'failed', anchor: 'node', prompt: 'Tighten this' },
    } as unknown as RendererTelemetryEvent);

    expect(rows('inline_chat_send_refused', ['outcome', 'anchor'])).toEqual([
      { outcome: 'rejected', anchor: 'element' },
      { outcome: 'in-flight', anchor: 'node' },
      { outcome: 'failed', anchor: 'node' },
    ]);
    expect(forbiddenSeen('inline_chat_send_refused')).toEqual([]);
  });

  it('submits the element and frame counts and the rail state, and never the prompt, the tag or the path', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({
      event: 'inline_chat_submitted',
      properties: { element_count: 3, frame_count: 2, image_count: 1, prompt_chars: 42, rail_open: false },
    });
    receiveRendererTelemetry({
      event: 'inline_chat_submitted',
      properties: {
        element_count: 1,
        frame_count: 1,
        image_count: 0,
        prompt_chars: 7,
        rail_open: true,
        prompt: 'make the hero bigger',
        tag: 'button',
        domPath: 'body > button:nth-of-type(1)',
      },
    } as unknown as RendererTelemetryEvent);

    expect(
      rows('inline_chat_submitted', [
        'element_count',
        'frame_count',
        'image_count',
        'prompt_chars',
        'rail_open',
      ]),
    ).toEqual([
      { element_count: 3, frame_count: 2, image_count: 1, prompt_chars: 42, rail_open: false },
      { element_count: 1, frame_count: 1, image_count: 0, prompt_chars: 7, rail_open: true },
    ]);
    expect(forbiddenSeen('inline_chat_submitted')).toEqual([]);
  });

  it('drops a submit whose counts are not counts', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({
      event: 'inline_chat_submitted',
      properties: { element_count: -1, frame_count: 1, image_count: 0, prompt_chars: 5, rail_open: true },
    } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({
      event: 'inline_chat_submitted',
      properties: { element_count: 1, frame_count: 1, image_count: 0, prompt_chars: 1.5, rail_open: true },
    } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({
      event: 'inline_chat_submitted',
      properties: { element_count: 1, frame_count: 1, image_count: 0, prompt_chars: 5 },
    } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({
      event: 'inline_chat_submitted',
      properties: { element_count: 2, frame_count: 0.5, image_count: 0, prompt_chars: 5, rail_open: true },
    } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({
      event: 'inline_chat_submitted',
      properties: { element_count: 2, image_count: 0, prompt_chars: 5, rail_open: true },
    } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({
      event: 'inline_chat_submitted',
      properties: { element_count: 1, frame_count: 1, image_count: -2, prompt_chars: 5, rail_open: true },
    } as unknown as RendererTelemetryEvent);

    expect(rows('inline_chat_submitted', ['element_count'])).toEqual([]);
  });
});

describe('the discover card measurements (ONL-2443)', () => {
  function captured(name: string): Record<string, unknown>[] {
    return peekQueueForTesting()
      .filter((event) => event.event === name)
      .map((event) => event.properties);
  }

  it('update-screen measurements drop all renderer properties', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    for (const event of ['cloud_update_required_shown', 'cloud_update_download_clicked'] as const) {
      receiveRendererTelemetry({ event, properties: { path: '/private/project', message: 'private' } } as unknown as RendererTelemetryEvent);
      expect(captured(event)).toHaveLength(1);
      expect(captured(event)[0]!['path']).toBeUndefined();
      expect(captured(event)[0]!['message']).toBeUndefined();
      expect(captured(event)[0]!['project_id']).toBeUndefined();
    }
  });

  it('a display reaches capture carrying no property of its own', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'discover_cta_shown', properties: {} });

    expect(captured('discover_cta_shown')).toHaveLength(1);
    const shown = captured('discover_cta_shown')[0]!;
    expect(shown['project_id']).toBeUndefined();
    expect(shown['url']).toBeUndefined();
  });

  it('artifact refresh carries only a valid count', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    receiveRendererTelemetry({event: 'artifact_refreshed', properties: {count: 1, title: 'Private'}} as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({event: 'artifact_refreshed', properties: {count: -1}});
    expect(captured('artifact_refreshed')).toHaveLength(1);
    expect(captured('artifact_refreshed')[0]!['count']).toBe(1);
    expect(captured('artifact_refreshed')[0]!['title']).toBeUndefined();
  });

  it('export panel events carry counts and a known outcome only (ONL-2593)', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'artifact_export_panel_opened', properties: { selected_count: 0 } });
    receiveRendererTelemetry({ event: 'artifact_export_batch', properties: { outcome: 'saved', artifact_count: 2, format_count: 2 } });
    receiveRendererTelemetry({ event: 'artifact_export_batch', properties: { outcome: 'bogus' as 'saved', artifact_count: 2, format_count: 2 } });
    expect(captured('artifact_export_panel_opened').map((props) => props['selected_count'])).toEqual([0]);
    expect(captured('artifact_export_batch').map(({ outcome, artifact_count, format_count }) => ({ outcome, artifact_count, format_count }))).toEqual([{ outcome: 'saved', artifact_count: 2, format_count: 2 }]);
  });

  it('a resolution reaches capture with the outcome that distinguishes a star from a dismissal', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({ event: 'discover_cta_resolved', properties: { outcome: 'starred' } });
    receiveRendererTelemetry({
      event: 'discover_cta_resolved',
      properties: { outcome: 'dismissed' },
    });

    expect(captured('discover_cta_resolved').map((props) => props['outcome'])).toEqual([
      'starred',
      'dismissed',
    ]);
  });

  it('drops a resolution whose outcome is off the enum', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({
      event: 'discover_cta_resolved',
      properties: { outcome: 'ignored' },
    } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({
      event: 'discover_cta_resolved',
      properties: {},
    } as unknown as RendererTelemetryEvent);

    expect(captured('discover_cta_resolved')).toEqual([]);
  });

  it('never carries the repository the card points at, on either event', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    receiveRendererTelemetry({
      event: 'discover_cta_shown',
      properties: { url: 'https://example.invalid/some/repo' },
    } as unknown as RendererTelemetryEvent);
    receiveRendererTelemetry({
      event: 'discover_cta_resolved',
      properties: { outcome: 'starred', url: 'https://example.invalid/some/repo' },
    } as unknown as RendererTelemetryEvent);

    expect(captured('discover_cta_shown')).toHaveLength(1);
    expect(captured('discover_cta_resolved')).toHaveLength(1);
    expect(JSON.stringify([...captured('discover_cta_shown'), ...captured('discover_cta_resolved')])).not.toContain(
      'example.invalid',
    );
  });
});

describe('the perf events', () => {
  const typing = {
    replay_recording: false,
    ...Object.fromEntries(CHAT_TYPING_COUNTS.map((key) => [key, 2])),
    inline_chat_keystrokes: 0,
  };
  const slow = {
    surface: 'chat_panel',
    input: 'key',
    top_script: 'message',
    agent_busy: true,
    other_tab_agent_busy: true,
    replay_recording: true,
    ...Object.fromEntries(SLOW_INTERACTION_COUNTS.map((key) => [key, 240])),
  };
  const pan = { replay_recording: false, ...Object.fromEntries(CANVAS_PAN_COUNTS.map((key) => [key, 3])) };

  const captured = (name: string) => peekQueueForTesting().filter((event) => event.event === name);
  const send = (event: string, properties: unknown) =>
    receiveRendererTelemetry({ event, properties } as unknown as RendererTelemetryEvent);

  it('captures code-opening and performance events with only the fields their vocabulary names', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    send('chat_typing_measured', { ...typing, text: 'typed words' });
    send('slow_interaction', { ...slow, path: '/Users/someone/repo' });
    send('canvas_pan_measured', { ...pan, url: 'http://localhost:3000/secret' });
    send('code_opened', { method: 'selection', target: 'element', confidence: 'likely', file_path: '/Users/someone/repo/Row.tsx' });

    const [typed] = captured('chat_typing_measured');
    const [slowed] = captured('slow_interaction');
    const [panned] = captured('canvas_pan_measured');
    const [opened] = captured('code_opened');
    expect(typed?.properties['chat_panel_keystrokes']).toBe(2);
    expect(slowed?.properties['top_script']).toBe('message');
    expect(slowed?.properties['other_tab_agent_busy']).toBe(true);
    expect(typed?.properties['other_tab_busy_keystrokes']).toBe(2);
    expect(typed?.properties['other_tab_busy_over_100']).toBe(2);
    expect(panned?.properties['gestures']).toBe(3);
    expect(opened?.properties).toMatchObject({ method: 'selection', target: 'element', confidence: 'likely' });
    expect(['text', 'path', 'url', 'file_path'].filter((key) => [typed, slowed, panned, opened].some((event) => key in event!.properties))).toEqual([]);
  });

  it('drops one with a value that is not a count, a label outside its set, or nothing measured', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();

    send('chat_typing_measured', { ...typing, chat_panel_max_ms: 1.5 });
    send('chat_typing_measured', { ...typing, chat_panel_keystrokes: 0 });
    send('slow_interaction', { ...slow, surface: 'terminal' });
    send('slow_interaction', { ...slow, top_script: 'file:///Users/someone/app.js' });
    send('slow_interaction', { ...slow, agent_busy: 'yes' });
    send('slow_interaction', { ...slow, other_tab_agent_busy: 'yes' });
    send('slow_interaction', { ...slow, other_tab_agent_busy: undefined });
    send('chat_typing_measured', { ...typing, other_tab_busy_keystrokes: -1 });
    send('chat_typing_measured', { ...typing, other_tab_busy_over_100: '2' });
    send('canvas_pan_measured', { ...pan, gestures: 0 });
    send('canvas_pan_measured', { ...pan, dropped_pct: -1 });
    send('code_opened', { method: 'selection', target: 'element', confidence: 'confident' });

    expect(['chat_typing_measured', 'slow_interaction', 'canvas_pan_measured', 'code_opened'].flatMap(captured)).toEqual([]);
  });

  it('preserves a measured idle cross-tab flag rather than dropping false', () => {
    process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
    initTelemetry();
    send('slow_interaction', { ...slow, other_tab_agent_busy: false });
    expect(captured('slow_interaction')[0]?.properties['other_tab_agent_busy']).toBe(false);
  });
});
