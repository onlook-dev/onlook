import { describe, expect, it } from 'bun:test';
import type { EnabledTelemetryConfig } from '@studio/events';
import {
  createReplayIdentityMirror,
  maskReplayRequest,
  replayInitPlan,
  sanitizeReplayProperties,
  storeNeedsReplacing,
} from './derive.js';

const enabledConfig: EnabledTelemetryConfig = {
  enabled: true,
  key: 'phc_test',
  host: 'https://us.i.posthog.com',
  distinctId: 'install-uuid',
  isIdentified: false,
  identityRevision: 0,
  sessionId: '01920000-0000-7000-8000-000000000001',
};

describe('replayInitPlan', () => {
  it('a disabled config initializes nothing — the fail-closed direction', () => {
    expect(replayInitPlan({ enabled: false })).toBeNull();
  });

  it('pins the replay-only, masked-fail-closed init shape exactly', () => {
    const plan = replayInitPlan(enabledConfig);
    // toEqual on the WHOLE object, not key-by-key: a new option sneaking into
    // the derivation must fail here rather than ship silently.
    expect(plan).toEqual({
      key: 'phc_test',
      options: {
        api_host: 'https://us.i.posthog.com',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_external_dependency_loading: true,
        capture_exceptions: false,
        capture_performance: false,
        enable_recording_console_log: false,
        // By reference: a rewrapped inline function would dodge the suites below.
        sanitize_properties: sanitizeReplayProperties,
        session_recording: {
          maskAllInputs: true,
          maskTextSelector: '*',
          blockSelector: 'img, [data-replay-block]',
          captureCanvas: { recordCanvas: false },
          recordHeaders: false,
          recordBody: false,
          maskCapturedNetworkRequestFn: maskReplayRequest,
        },
        bootstrap: {
          // Web-SDK casing: capital ID. The mobile SDKs differ.
          distinctID: 'install-uuid',
          isIdentifiedID: false,
          sessionID: '01920000-0000-7000-8000-000000000001',
        },
        persistence: 'localStorage',
        persistence_name: 'studio-replay',
      },
    });
  });

  it('decides every capture the shared project could switch on, explicitly off', () => {
    const options = replayInitPlan(enabledConfig)?.options;
    expect(options?.session_recording?.captureCanvas?.recordCanvas).toBe(false);
    expect(options?.enable_recording_console_log).toBe(false);
    expect(options?.capture_performance).toBe(false);
    expect(options?.session_recording?.recordHeaders).toBe(false);
    expect(options?.session_recording?.recordBody).toBe(false);
  });

  it('a URL the recorder stores, its own starting page included, carries no disk path', () => {
    const masked = maskReplayRequest({
      name: 'file:///Users/someone/Applications/Onlook.app/Contents/Resources/app.asar/out/renderer/index.html?tab=t1',
      initiatorType: 'navigation',
    });
    expect(masked).toEqual({ name: 'app://studio', initiatorType: 'navigation' });
    expect(maskReplayRequest({ name: 'https://example.test/x' }).name).toBe('https://example.test/x');
  });

  it('the sanitizer keeps file:// paths out of every property, the start_url leak included', () => {
    const sanitized = sanitizeReplayProperties({
      $current_url: 'file:///Users/someone/checkout/apps/studio/out/renderer/index.html',
      $pathname: '/Users/someone/checkout',
      note: 'opened file:///Users/someone/secret.txt today',
      count: 3,
      untouched: 'https://example.test/fine',
    });
    expect(sanitized['$current_url']).toBe('app://studio');
    expect(sanitized['note']).toBe('opened app://studio today');
    // `$pathname` is the scheme-stripped twin of the same leak.
    expect(sanitized['$pathname']).toBe('/');
    expect(sanitized['count']).toBe(3);
    expect(sanitized['untouched']).toBe('https://example.test/fine');
  });

  it('a launch no account owns keeps its identity nowhere', () => {
    // Persisted, the launch id becomes an id the next launch's bootstrap would link to the account (ONL-2882).
    expect(replayInitPlan({ ...enabledConfig, distinctId: 'launch-1', unowned: true })?.options.persistence).toBe('memory');
  });

  it('an identified config bootstraps the identified id, flagged as such', () => {
    const plan = replayInitPlan({
      ...enabledConfig,
      distinctId: 'user_workos123',
      isIdentified: true,
    });
    expect(plan?.options.bootstrap).toEqual({
      distinctID: 'user_workos123',
      isIdentifiedID: true,
      sessionID: '01920000-0000-7000-8000-000000000001',
    });
  });
});

describe('storeNeedsReplacing', () => {
  const identified = { ...enabledConfig, distinctId: 'user_A', isIdentified: true } as const;

  it('an empty store holds nothing to replace', () => {
    expect(storeNeedsReplacing(identified, undefined)).toBe(false);
  });

  it('a store nothing can read is replaced, because `init` reads it next', () => {
    expect(storeNeedsReplacing(identified, 'unreadable')).toBe(true);
    expect(storeNeedsReplacing(enabledConfig, 'unreadable')).toBe(true);
  });

  it('an identity this launch is booting as anyway stays', () => {
    expect(storeNeedsReplacing(identified, { distinctId: 'user_A', identified: true })).toBe(false);
    expect(storeNeedsReplacing(enabledConfig, { distinctId: 'install-uuid', identified: false })).toBe(false);
  });

  it('the one anonymous id main says this account has taken stays, so the account takes that person', () => {
    expect(storeNeedsReplacing(
      { ...identified, linkableAnonymousId: 'install-uuid' },
      { distinctId: 'install-uuid', identified: false },
    )).toBe(false);
  });

  it('an anonymous id main does not name goes, whoever left it', () => {
    expect(storeNeedsReplacing(identified, { distinctId: 'install-uuid', identified: false })).toBe(true);
    expect(storeNeedsReplacing(
      { ...identified, linkableAnonymousId: 'install-uuid' },
      { distinctId: 'some-other-launch', identified: false },
    )).toBe(true);
  });

  it('another account’s person goes, and is never the one a link could name', () => {
    expect(storeNeedsReplacing(identified, { distinctId: 'user_B', identified: true })).toBe(true);
    expect(storeNeedsReplacing(
      { ...identified, linkableAnonymousId: 'user_B' },
      { distinctId: 'user_B', identified: true },
    )).toBe(true);
  });

  it('a person left identified goes when main names no account for this launch', () => {
    expect(storeNeedsReplacing(enabledConfig, { distinctId: 'install-uuid', identified: true })).toBe(true);
  });
});

describe('replay account boundaries', () => {
  it('resets replay on sign-out and identifies B without joining A', () => {
    const calls: Array<string | undefined> = [];
    const mirror = createReplayIdentityMirror(
      { ...enabledConfig, distinctId: 'user_A', isIdentified: true },
      (distinctId) => calls.push(`identify:${distinctId}`),
      (distinctId) => calls.push(`reset:${distinctId}`),
    );
    mirror({ ...enabledConfig, distinctId: 'fresh-anonymous', identityRevision: 1 });
    mirror({ ...enabledConfig, distinctId: 'user_B', isIdentified: true, identityRevision: 2 });
    mirror({ ...enabledConfig, distinctId: 'user_B', isIdentified: true, identityRevision: 3 });
    expect(calls).toEqual(['reset:fresh-anonymous', 'identify:user_B']);
  });

  it('ignores buffered identities older than the bootstrap snapshot', () => {
    const calls: string[] = [];
    const mirror = createReplayIdentityMirror(
      { ...enabledConfig, distinctId: 'user_B', isIdentified: true, identityRevision: 3 },
      (distinctId) => calls.push(distinctId),
      () => calls.push('reset'),
    );
    mirror({ ...enabledConfig, distinctId: 'user_A', isIdentified: true, identityRevision: 1 });
    mirror({ ...enabledConfig, identityRevision: 2 });
    expect(calls).toEqual([]);
  });
});
