import { afterAll, afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { cleanupTempFixtures, makeStateRoot } from '@studio/fixtures';
import type { AppLike } from '../telemetry/index.js';

const { initTelemetry, peekQueueForTesting, resetTelemetryForTesting, setAppForTesting } =
  await import('../telemetry/index.js');
const { recordAgentDefaultChanged, recordExperimentalToggled } = await import('./telemetry.js');

const ENV_KEYS = ['STUDIO_STATE_ROOT', 'STUDIO_POSTHOG_KEY'] as const;
const originalEnv = new Map<string, string | undefined>(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);
const realFetch = globalThis.fetch;

beforeEach(() => {
  resetTelemetryForTesting();
  for (const key of ENV_KEYS) delete process.env[key];
  const root = makeStateRoot({ name: 'settings-telemetry' });
  process.env['STUDIO_STATE_ROOT'] = root;
  process.env['STUDIO_POSTHOG_KEY'] = 'phc_test';
  setAppForTesting({
    getPath: () => root,
    getVersion: () => '0.0.0-test',
    getLocale: () => 'en-US',
    isPackaged: false,
  } satisfies AppLike);
  globalThis.fetch = (() =>
    Promise.resolve(new Response('{"status":1}'))) as unknown as typeof fetch;
  initTelemetry();
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
  cleanupTempFixtures();
});

function captured(): Record<string, unknown>[] {
  return peekQueueForTesting()
    .filter((event) => event.event === 'agent_default_changed')
    .map((event) => event.properties);
}

describe('experimental telemetry', () => {
  it('captures the fixed feature name and both boolean choices, with no project data', () => {
    recordExperimentalToggled(true);
    recordExperimentalToggled(false);
    const events = peekQueueForTesting().filter((event) => event.event === 'experimental_toggled');
    expect(events).toHaveLength(2);
    expect(events.map((event) => ({ feature: event.properties['feature'], enabled: event.properties['enabled'] })))
      .toEqual([{ feature: 'code_panel', enabled: true }, { feature: 'code_panel', enabled: false }]);
    expect(events.every((event) => !('project_id' in event.properties) && !('path' in event.properties))).toBe(true);
  });
});

describe('recordAgentDefaultChanged', () => {
  it('a harness switch rides with the harness alone', () => {
    recordAgentDefaultChanged({ harness: 'codex', setting: 'harness' });

    const [event] = captured();
    expect(event!['harness']).toBe('codex');
    expect(event!['setting']).toBe('harness');
    expect(event!['model']).toBeUndefined();
    expect(event!['effort']).toBeUndefined();
  });

  it('a model default carries the enumerated model and effort ids', () => {
    recordAgentDefaultChanged({
      harness: 'claude',
      setting: 'model',
      model: 'claude-sonnet-4-5',
      effort: 'high',
    });

    const [event] = captured();
    expect(event!['setting']).toBe('model');
    expect(event!['model']).toBe('claude-sonnet-4-5');
    expect(event!['effort']).toBe('high');
  });

  it('a cleared default drops the field rather than shipping null', () => {
    recordAgentDefaultChanged({ harness: 'claude', setting: 'model', model: null, effort: null });

    const [event] = captured();
    expect(event).toBeDefined();
    expect('model' in event!).toBe(false);
    expect('effort' in event!).toBe(false);
  });

  it('a path-shaped or free-text model or effort never boards', () => {
    recordAgentDefaultChanged({
      harness: 'claude',
      setting: 'model',
      model: '/Users/someone/secret-repo/model.bin',
      effort: 'as high as it goes',
    });
    recordAgentDefaultChanged({
      harness: 'claude',
      setting: 'model',
      model: 'a'.repeat(65),
      effort: 'medium',
    });

    const events = captured();
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(event['model']).toBeUndefined();
      expect(JSON.stringify(event)).not.toContain('/Users/');
      expect(JSON.stringify(event)).not.toContain('secret-repo');
    }
    expect(events[0]!['effort']).toBeUndefined();
    expect(events[1]!['effort']).toBe('medium');
  });
});
