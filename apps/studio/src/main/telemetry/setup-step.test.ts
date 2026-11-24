import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { ClaudeHost } from '../claude/index.js';
import { ClaudeBrowserPreparationError } from '../claude/browsers.js';
import type { ClaudeLoginHandle } from '../claude/login.js';
import { resetIdentityCache } from '../identity/store.js';
import { capture, initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } from './index.js';
import { checkSetupAbandoned, recordAgentSetupStep, resetSetupTelemetryForTesting } from './setup-step.js';
import { EventEmitter } from 'node:events';
import type { AppUpdater } from 'electron-updater';
import { createUpdateSession } from '../updater/session.js';
import { UpdateMachine } from '../updater/machine.js';

const ENV_KEYS = [
  'STUDIO_STATE_ROOT',
  'STUDIO_POSTHOG_KEY',
  'STUDIO_POSTHOG_HOST',
  'STUDIO_TELEMETRY',
  'MAIN_VITE_POSTHOG_KEY',
  'AGENT_HEADLESS',
  'STUDIO_TELEMETRY_HEADLESS',
] as const;
let previousEnv: Array<string | undefined>;
let root: string;
const realFetch = globalThis.fetch;

it('Windows-style update checks report started, available, and up-to-date outcomes', async () => {
  let available = true;
  const updater = Object.assign(new EventEmitter(), { checkForUpdates: async () => ({ isUpdateAvailable: available, updateInfo: { version: '2.0.1' } }), downloadUpdate: async () => [], quitAndInstall: () => {} });
  const machine = new UpdateMachine({ emit: () => {}, waitForNativeStage: false });
  const session = createUpdateSession(updater as unknown as AppUpdater, machine);
  try {
    await session.check(true);
    available = false;
    await session.check();
    const events = peekQueueForTesting().filter(({ event }) => event === 'update_check_started' || event === 'update_check_completed');
    expect(events.map(({ event, properties }) => [event, properties['requested'], properties['outcome']])).toEqual([
      ['update_check_started', true, undefined], ['update_check_completed', true, 'available'],
      ['update_check_started', false, undefined], ['update_check_completed', false, 'up_to_date'],
    ]);
  } finally { session.dispose(); }
});

it('setup fallback and its dead end keep the same scrubbed cause for the correct harness', () => {
  recordAgentSetupStep('claude', 'fallback', { outcome: 'failed', failure: { error: 'spawn EACCES C:\\private\\agent.exe', exitCode: 5 } });
  recordAgentSetupStep('codex', 'fallback', { outcome: 'timeout' });
  capture('dead_end_shown', { state: 'setup_failed', error_class: 'unknown', harness: 'claude' });
  const events = peekQueueForTesting();
  const deadEnd = events.find(({ event }) => event === 'dead_end_shown');
  expect(deadEnd?.properties).toMatchObject({ harness: 'claude', error_class: 'spawn_eacces', exit_code: 5, stderr_class: 'spawn_eacces', failure_cause: 'spawn_eacces' });
  expect(JSON.stringify(events)).not.toContain('private');
  recordAgentSetupStep('claude', 'sign_in_started');
  capture('dead_end_shown', { state: 'setup_failed', error_class: 'unknown', harness: 'claude' });
  expect(peekQueueForTesting().at(-1)?.properties['error_class']).toBe('unknown');
});

beforeEach(() => {
  previousEnv = ENV_KEYS.map((key) => process.env[key]);
  for (const key of ENV_KEYS) delete process.env[key];
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  globalThis.fetch = (() => Promise.resolve(new Response('{"status":1}'))) as unknown as typeof fetch;
  resetTelemetryForTesting();
  resetSetupTelemetryForTesting();
  resetIdentityCache();
  root = mkdtempSync(join(tmpdir(), 'studio-browser-telemetry-'));
  process.env['STUDIO_STATE_ROOT'] = root;
  setAppForTesting({ getPath: () => root, getVersion: () => '0.0.0-test', getLocale: () => 'en-US', isPackaged: false });
  initTelemetry();
});

afterEach(() => {
  resetTelemetryForTesting();
  resetSetupTelemetryForTesting();
  resetIdentityCache();
  setAppForTesting(undefined);
  globalThis.fetch = realFetch;
  for (const [index, key] of ENV_KEYS.entries()) {
    const value = previousEnv[index];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(root, { recursive: true, force: true });
});

describe('Claude browser choice telemetry', () => {
  it('keeps browser choice alongside attempt tracking without leaking it into a skipped attempt', () => {
    recordAgentSetupStep('claude', 'opened', { entryPoint: 'editor' });
    recordAgentSetupStep('claude', 'sign_in_started', { browserChoice: 'other' });
    checkSetupAbandoned('claude');
    recordAgentSetupStep('claude', 'opened', { entryPoint: 'onboarding' });
    recordAgentSetupStep('claude', 'skipped', { reason: 'provider_detected' });
    checkSetupAbandoned('claude');
    const events = peekQueueForTesting();
    const signIn = events.find(({ event, properties }) => event === 'agent_setup_step' && properties['step'] === 'sign_in_started');
    expect(signIn?.properties).toMatchObject({ browser_choice: 'other', entry_point: 'editor' });
    const abandoned = events.filter(({ event }) => event === 'agent_setup_abandoned');
    expect(abandoned).toHaveLength(1);
    expect(abandoned[0]!.properties).toMatchObject({ provider: 'claude', last_step: 'sign_in_started', entry_point: 'editor' });
    expect(abandoned[0]!.properties).not.toHaveProperty('browser_choice');
    const skipped = events.find(({ event, properties }) => event === 'agent_setup_step' && properties['step'] === 'skipped');
    expect(skipped?.properties).toMatchObject({ reason: 'provider_detected', entry_point: 'onboarding' });
    expect(skipped?.properties).not.toHaveProperty('browser_choice');
  });

  it('records failed sign-in telemetry while a removed selected browser leaves the host retryable', async () => {
    const host = new ClaudeHost({
      browsers: () => [{ id: 'fixture-removed', name: 'Fixture Browser', isDefault: false }],
      bin: () => '/fixture/claude',
      env: async () => ({}),
      emit: () => undefined,
      runStatus: async () => ({ ok: false, out: '', err: '', timedOut: false, missing: false, exitCode: 1 }),
      browserLogin: async () => { throw new ClaudeBrowserPreparationError(); },
    });
    await host.detect({ fresh: true });
    expect(host.signIn({ browserId: 'fixture-removed', entryPoint: 'editor' })).toEqual({ accepted: true });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(host.current()).toMatchObject({ status: 'signed-out', detail: 'exited' });
    const fallback = peekQueueForTesting().find(({ event, properties }) => event === 'agent_setup_step' && properties['step'] === 'fallback');
    expect(fallback?.properties).toMatchObject({ provider: 'claude', outcome: 'failed', entry_point: 'editor' });
    const completed = peekQueueForTesting().find(({ event }) => event === 'agent_setup_completed');
    expect(completed).toBeUndefined();
  });

  it('records only default or other for accepted sign-in choices and nothing for malicious IDs', async () => {
    const browsers = [
      { id: 'fixture-default-id', name: 'Private Default Browser', isDefault: true },
      { id: 'fixture-other-id', name: 'Private Other Browser', isDefault: false },
    ];
    const handle: ClaudeLoginHandle = {
      authUrl: '',
      completed: Promise.resolve('cancelled'),
      exitCode: () => null,
      loginFailed: () => false,
      submitCode: () => false,
      cancel: () => undefined,
      onRejected: () => undefined,
      openPage: async () => undefined,
    };
    for (const browserId of [undefined, browsers[0]!.id, browsers[1]!.id, '/private/injected.app']) {
      const host = new ClaudeHost({
        browsers: () => browsers,
        bin: () => '/fixture/claude',
        env: async () => ({}),
        emit: () => undefined,
        runStatus: async () => ({ ok: false, out: '', err: '', timedOut: false, missing: false, exitCode: 1 }),
        startLogin: async () => handle,
        browserLogin: async () => handle,
      });
      await host.detect({ fresh: true });
      expect(host.signIn({ browserId, entryPoint: 'settings' }).accepted).toBe(browserId !== '/private/injected.app');
      await Promise.resolve();
      await Promise.resolve();
    }
    const choices = peekQueueForTesting()
      .filter(({ event, properties }) => event === 'agent_setup_step' && properties['step'] === 'sign_in_started')
      .map(({ properties }) => properties['browser_choice']);
    expect(choices).toEqual(['default', 'default', 'other']);
    const serialized = JSON.stringify(peekQueueForTesting());
    for (const browser of browsers) {
      expect(serialized).not.toContain(browser.id);
      expect(serialized).not.toContain(browser.name);
    }
    expect(serialized).not.toContain('/private/injected.app');
  });

  it('does not carry browser choices into subsequent steps or completion events', () => {
    recordAgentSetupStep('claude', 'sign_in_started', { entryPoint: 'editor', browserChoice: 'other' });
    recordAgentSetupStep('claude', 'page_reopened');
    recordAgentSetupStep('claude', 'connected');
    const events = peekQueueForTesting().filter(({ event }) => event === 'agent_setup_step' || event === 'agent_setup_completed');
    expect(events[0]!.properties['browser_choice']).toBe('other');
    expect(events.slice(1).every(({ properties }) => !('browser_choice' in properties))).toBe(true);
  });
});
