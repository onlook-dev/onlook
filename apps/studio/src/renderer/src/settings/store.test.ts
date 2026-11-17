import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import type { HarnessId, RendererLogLine, SetDefaultRequest, SettingsDefaults, SettingsState } from '@studio/events';
import { deferred, type Deferred } from '../testing/bridge.js';
import { primeSettings, resetSettingsPrimeForTests, useSettingsStore } from './store.js';

const DEFAULTS: SettingsDefaults = {
  claude: { model: 'opus', effort: 'high', models: [{ value: 'opus', displayName: 'Claude Opus', supportedEffortLevels: ['low', 'high'] }] },
  codex: { models: [{ value: 'gpt-5.6', displayName: 'gpt-5.6' }] },
};

const OTHER_DEFAULTS: SettingsDefaults = {
  claude: { model: 'haiku', models: [{ value: 'haiku', displayName: 'Claude Haiku' }] },
  codex: { models: [] },
};

const logged: RendererLogLine[] = [];

describe('connectors notice', () => {
  it('applies the saved dismissal when no settings broadcast intervenes', async () => {
    const bridge = fakeBridge();
    bridge.install();
    resetSettingsPrimeForTests();
    window.studio.settingsDismissConnectorsNotice = async () => ({ connectorsNoticeDismissed: true, harness: 'codex' });
    await useSettingsStore.getState().dismissConnectorsNotice();
    expect(useSettingsStore.getState().connectorsNoticeDismissed).toBe(true);
    expect(useSettingsStore.getState().harness).toBe('codex');
  });

  it('does not resurrect a dismissed notice when an older settings broadcast arrives', async () => {
    const bridge = fakeBridge();
    bridge.install();
    resetSettingsPrimeForTests();
    let release: ((state: SettingsState) => void) | undefined;
    window.studio.settingsDismissConnectorsNotice = () => new Promise((resolve) => { release = resolve; });
    const pending = useSettingsStore.getState().dismissConnectorsNotice();
    useSettingsStore.getState().apply({ harness: 'codex' });
    expect(useSettingsStore.getState().connectorsNoticeDismissed).toBe(true);
    release?.({ connectorsNoticeDismissed: true });
    await pending;
    expect(useSettingsStore.getState().connectorsNoticeDismissed).toBe(true);
    expect(useSettingsStore.getState().harness).toBe('codex');
  });
});

describe('tips pill dismissal', () => {
  function wireDismissal(): { saves: () => number; events: () => unknown[] } {
    let saves = 0;
    const events: unknown[] = [];
    window.studio.settingsDismissTipsPill = async () => {
      saves += 1;
      return { tipsPillDismissed: true };
    };
    window.studio.telemetryEvent = (event) => {
      events.push(event);
    };
    return { saves: () => saves, events: () => events };
  }

  it('saves the dismissal once and reports which way it went', async () => {
    fakeBridge().install();
    resetSettingsPrimeForTests();
    useSettingsStore.getState().apply({});
    const wired = wireDismissal();
    await useSettingsStore.getState().dismissTipsPill('selection');
    await useSettingsStore.getState().dismissTipsPill('close');
    expect(useSettingsStore.getState().tipsPillDismissed).toBe(true);
    expect(wired.saves()).toBe(1);
    expect(wired.events()).toEqual([{ event: 'tips_pill_dismissed', properties: { source: 'selection' } }]);
  });

  it('writes nothing before main has answered with the saved settings', async () => {
    fakeBridge().install();
    resetSettingsPrimeForTests();
    const wired = wireDismissal();
    await useSettingsStore.getState().dismissTipsPill('selection');
    expect(wired.saves()).toBe(0);
    expect(wired.events()).toEqual([]);
  });
});

describe('experimental settings writes', () => {
  it('does not overwrite a newer broadcast with a delayed write reply', async () => {
    const bridge = fakeBridge();
    bridge.install();
    resetSettingsPrimeForTests();
    let release: ((state: SettingsState) => void) | undefined;
    window.studio.settingsSetCodePanel = () => new Promise((resolve) => { release = resolve; });
    const pending = useSettingsStore.getState().setCodePanel(true);
    useSettingsStore.getState().apply({ experimentalCodePanel: true });
    useSettingsStore.getState().apply({ experimentalCodePanel: false });
    release?.({ experimentalCodePanel: true });
    await pending;
    expect(useSettingsStore.getState().experimentalCodePanel).toBe(false);
  });

  it('uses main’s answer and retains the choice on a refused write', async () => {
    const bridge = fakeBridge();
    bridge.install();
    resetSettingsPrimeForTests();
    bridge.answer({ experimentalCodePanel: true });
    await useSettingsStore.getState().setCodePanel(true);
    expect(useSettingsStore.getState().experimentalCodePanel).toBe(true);
    bridge.answer(new Error('disk full'));
    await useSettingsStore.getState().setCodePanel(false);
    expect(useSettingsStore.getState().experimentalCodePanel).toBe(true);
    expect(useSettingsStore.getState().codePanelSaveFailed).toBe(true);
    expect(useSettingsStore.getState().isCodePanelSaving).toBe(false);
    bridge.answer({ experimentalCodePanel: false });
    await useSettingsStore.getState().setCodePanel(false);
    expect(useSettingsStore.getState().experimentalCodePanel).toBe(false);
    expect(useSettingsStore.getState().codePanelSaveFailed).toBe(false);
  });
});

describe('analytics settings writes', () => {
  it('uses confirmed consent, reports failed saves, and retries', async () => {
    const bridge = fakeBridge();
    bridge.install();
    resetSettingsPrimeForTests();
    expect(useSettingsStore.getState().analyticsEnabled).toBe(true);
    bridge.answer({ analyticsEnabled: false });
    await useSettingsStore.getState().setAnalytics(false);
    expect(useSettingsStore.getState().analyticsEnabled).toBe(false);
    bridge.answer(new Error('disk full'));
    await useSettingsStore.getState().setAnalytics(true);
    expect(useSettingsStore.getState().analyticsEnabled).toBe(false);
    expect(useSettingsStore.getState().analyticsSaveFailed).toBe(true);
    expect(useSettingsStore.getState().isAnalyticsSaving).toBe(false);
    bridge.answer({ analyticsEnabled: true });
    await useSettingsStore.getState().setAnalytics(true);
    expect(useSettingsStore.getState().analyticsEnabled).toBe(true);
    expect(useSettingsStore.getState().analyticsSaveFailed).toBe(false);
  });

  it('ignores overlapping clicks and a stale reply after a newer broadcast', async () => {
    const bridge = fakeBridge();
    bridge.install();
    resetSettingsPrimeForTests();
    let release: ((state: SettingsState) => void) | undefined;
    let writes = 0;
    window.studio.settingsSetAnalytics = () => {
      writes += 1;
      return new Promise((resolve) => { release = resolve; });
    };
    const pending = useSettingsStore.getState().setAnalytics(false);
    await useSettingsStore.getState().setAnalytics(true);
    expect(writes).toBe(1);
    expect(useSettingsStore.getState().analyticsEnabled).toBe(true);
    expect(useSettingsStore.getState().isAnalyticsSaving).toBe(true);
    useSettingsStore.getState().apply({ analyticsEnabled: true });
    release?.({ analyticsEnabled: false });
    await pending;
    expect(useSettingsStore.getState().analyticsEnabled).toBe(true);
  });
});

function fakeBridge(): {
  install: () => void;
  releaseRead: (state: SettingsState) => Promise<void>;
  failRead: () => Promise<void>;
  broadcast: (state: SettingsState) => void;
  answer: (state: SettingsState | Error) => void;
  defaultsAnswer: (defaults: SettingsDefaults | Error) => void;
  order: () => string[];
  sets: () => HarnessId[];
  patches: () => SetDefaultRequest[];
} {
  const order: string[] = [];
  const sets: HarnessId[] = [];
  const patches: SetDefaultRequest[] = [];
  let releaseState: ((state: SettingsState) => void) | undefined;
  let rejectState: ((error: Error) => void) | undefined;
  let changedListener: ((state: SettingsState) => void) | undefined;
  let pending: Promise<unknown> | undefined;
  let nextAnswer: SettingsState | Error = {};
  let nextDefaults: SettingsDefaults | Error = DEFAULTS;

  const bridge = {
    log(line: RendererLogLine): void {
      logged.push(line);
    },
    telemetryException(): void {},
    settingsState(): Promise<SettingsState> {
      order.push('read');
      const p = new Promise<SettingsState>((resolve, reject) => {
        releaseState = resolve;
        rejectState = reject;
      });
      pending = p;
      return p;
    },
    onSettingsChanged(listener: (state: SettingsState) => void): () => void {
      order.push('subscribe');
      changedListener = listener;
      return () => {};
    },
    settingsSetHarness(req: { harness: HarnessId }): Promise<SettingsState> {
      sets.push(req.harness);
      return nextAnswer instanceof Error ? Promise.reject(nextAnswer) : Promise.resolve(nextAnswer);
    },
    settingsResolveDiscoverCta(): Promise<SettingsState> {
      order.push('resolveDiscoverCta');
      return nextAnswer instanceof Error ? Promise.reject(nextAnswer) : Promise.resolve(nextAnswer);
    },
    settingsSetNotificationSound(): Promise<SettingsState> {
      return nextAnswer instanceof Error ? Promise.reject(nextAnswer) : Promise.resolve(nextAnswer);
    },
    settingsSetCodePanel(): Promise<SettingsState> {
      return nextAnswer instanceof Error ? Promise.reject(nextAnswer) : Promise.resolve(nextAnswer);
    },
    settingsSetAnalytics(): Promise<SettingsState> {
      return nextAnswer instanceof Error ? Promise.reject(nextAnswer) : Promise.resolve(nextAnswer);
    },
    settingsDefaults(): Promise<SettingsDefaults> {
      order.push('readDefaults');
      return nextDefaults instanceof Error ? Promise.reject(nextDefaults) : Promise.resolve(nextDefaults);
    },
    settingsSetDefault(req: SetDefaultRequest): Promise<SettingsDefaults> {
      patches.push(req);
      return nextDefaults instanceof Error ? Promise.reject(nextDefaults) : Promise.resolve(nextDefaults);
    },
  };

  return {
    install(): void {
      Object.defineProperty(globalThis, 'window', { value: { studio: bridge }, configurable: true, writable: true });
    },
    async releaseRead(state): Promise<void> {
      releaseState?.(state);
      await pending;
      await Promise.resolve();
      await Promise.resolve();
    },
    async failRead(): Promise<void> {
      rejectState?.(new Error('read refused'));
      await pending?.catch(() => undefined);
      await Promise.resolve();
      await Promise.resolve();
    },
    broadcast(state): void {
      changedListener?.(state);
    },
    answer(state): void {
      nextAnswer = state;
    },
    defaultsAnswer(defaults): void {
      nextDefaults = defaults;
    },
    order: () => order,
    sets: () => sets,
    patches: () => patches,
  };
}

const settleReads = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

let bridge: ReturnType<typeof fakeBridge>;

beforeEach(() => {
  logged.length = 0;
  resetSettingsPrimeForTests();
  bridge = fakeBridge();
  bridge.install();
});

afterEach(() => {
  resetSettingsPrimeForTests();
  Reflect.deleteProperty(globalThis, 'window');
});

describe('primeSettings', () => {
  it('subscribes before it reads, once, however many times it is called', async () => {
    const first = primeSettings();
    const second = primeSettings();

    expect(bridge.order()).toEqual(['subscribe', 'read', 'readDefaults']);

    await bridge.releaseRead({ harness: 'codex' });
    await Promise.all([first, second]);

    expect(bridge.order()).toEqual(['subscribe', 'read', 'readDefaults']);
    expect(useSettingsStore.getState().harness).toBe('codex');
  });

  it('keeps applying broadcasts after the prime has resolved', async () => {
    const primed = primeSettings();
    await bridge.releaseRead({ harness: 'claude' });
    await primed;

    bridge.broadcast({ harness: 'codex' });
    expect(useSettingsStore.getState().harness).toBe('codex');

    bridge.broadcast({});
    expect(useSettingsStore.getState().harness).toBe('claude');
  });

  it('a broadcast landing while the read is in flight is not overwritten by the read', async () => {
    const primed = primeSettings();

    bridge.broadcast({ harness: 'codex' });
    expect(useSettingsStore.getState().harness).toBe('codex');

    // The read was in flight when the broadcast landed, so its answer is the older fact.
    await bridge.releaseRead({ harness: 'claude' });
    await primed;
    expect(useSettingsStore.getState().harness).toBe('codex');
  });

  it('a failed read leaves the shown default where it was', async () => {
    useSettingsStore.getState().apply({ harness: 'codex' });
    const primed = primeSettings();
    await bridge.failRead();
    await primed;
    expect(useSettingsStore.getState().harness).toBe('codex');
  });
});

describe('reads that overlap', () => {
  function heldDefaults(): Deferred<SettingsDefaults>[] {
    const reads: Deferred<SettingsDefaults>[] = [];
    window.studio.settingsDefaults = () => {
      const read = deferred<SettingsDefaults>();
      reads.push(read);
      return read.promise;
    };
    return reads;
  }

  it('two re-reads of the defaults answered in reverse leave the newer answer showing', async () => {
    const primed = primeSettings();
    await bridge.releaseRead({});
    await primed;
    const reads = heldDefaults();

    bridge.broadcast({});
    bridge.broadcast({});
    reads[1]?.settle(OTHER_DEFAULTS);
    await settleReads();
    reads[0]?.settle(DEFAULTS);
    await settleReads();

    expect(useSettingsStore.getState().defaults).toEqual(OTHER_DEFAULTS);
  });

  it('a re-read that is refused leaves an earlier one free to land', async () => {
    const primed = primeSettings();
    await bridge.releaseRead({});
    await primed;
    const reads = heldDefaults();

    bridge.broadcast({});
    bridge.broadcast({});
    reads[1]?.refuse(new Error('refused'));
    await settleReads();
    reads[0]?.settle(OTHER_DEFAULTS);
    await settleReads();

    expect(useSettingsStore.getState().defaults).toEqual(OTHER_DEFAULTS);
  });

  it('a write answered before a re-read that began ahead of it is not undone by that re-read', async () => {
    const primed = primeSettings();
    await bridge.releaseRead({});
    await primed;
    const reads = heldDefaults();

    bridge.broadcast({});
    bridge.defaultsAnswer(OTHER_DEFAULTS);
    await useSettingsStore.getState().setDefault('claude', { model: 'haiku' });
    reads[0]?.settle(DEFAULTS);
    await settleReads();

    expect(useSettingsStore.getState().defaults).toEqual(OTHER_DEFAULTS);
  });

  it('shows the saved settings as soon as they answer, so a later write is not undone when the defaults answer', async () => {
    const reads = heldDefaults();
    const primed = primeSettings();
    await bridge.releaseRead({ harness: 'codex' });
    expect(useSettingsStore.getState().harness).toBe('codex');

    bridge.answer({ harness: 'claude' });
    await useSettingsStore.getState().setHarness('claude');
    reads[0]?.settle(DEFAULTS);
    await primed;

    expect(useSettingsStore.getState().harness).toBe('claude');
    expect(useSettingsStore.getState().defaults).toEqual(DEFAULTS);
  });
});

describe('a refused call', () => {
  const refusals = (): string[] => logged.filter((line) => line.subsystem === 'settings' && line.level === 'warn').map((line) => line.msg);

  it('is logged when it is the read of the saved settings', async () => {
    const primed = primeSettings();
    await bridge.failRead();
    await primed;
    expect(refusals()).toEqual(['state read refused']);
  });

  it('is logged when it is the read of the defaults', async () => {
    bridge.defaultsAnswer(new Error('refused'));
    const primed = primeSettings();
    await bridge.releaseRead({});
    await primed;
    expect(refusals()).toEqual(['defaults read refused']);
  });

  it('is logged when it is the agent choice', async () => {
    bridge.answer(new Error('refused'));
    await useSettingsStore.getState().setHarness('codex');
    expect(refusals()).toEqual(['set harness refused']);
  });

  it('is logged when it is a default', async () => {
    bridge.defaultsAnswer(new Error('refused'));
    await useSettingsStore.getState().setDefault('claude', { model: 'opus' });
    expect(refusals()).toEqual(['set default refused']);
  });
});

describe('the discover CTA resolution (ONL-2443)', () => {
  it('starts unprimed, so a reader cannot read it as a known answer', () => {
    expect(useSettingsStore.getState().isPrimed).toBe(false);
    expect(useSettingsStore.getState().discoverCtaResolved).toBe(false);
  });

  it('a broadcast carrying the resolution leaves the shown harness where it was', async () => {
    const primed = primeSettings();
    await bridge.releaseRead({ harness: 'codex' });
    await primed;

    bridge.broadcast({ harness: 'codex', discoverCtaResolved: true });

    expect(useSettingsStore.getState().harness).toBe('codex');
    expect(useSettingsStore.getState().discoverCtaResolved).toBe(true);
    expect(useSettingsStore.getState().isPrimed).toBe(true);
  });

  it("holds main's answer after the write", async () => {
    bridge.answer({ discoverCtaResolved: true });
    await useSettingsStore.getState().resolveDiscoverCta();

    expect(bridge.order()).toEqual(['resolveDiscoverCta']);
    expect(useSettingsStore.getState().discoverCtaResolved).toBe(true);
  });

  it('rejects a refused write rather than swallowing it, so the call site can log it', async () => {
    bridge.answer(new Error('refused'));

    await expect(useSettingsStore.getState().resolveDiscoverCta()).rejects.toThrow('refused');
    expect(useSettingsStore.getState().discoverCtaResolved).toBe(false);
  });

  it('keeps the click answered for the session when the write never lands', async () => {
    bridge.answer(new Error('refused'));

    await expect(useSettingsStore.getState().resolveDiscoverCta()).rejects.toThrow('refused');
    expect(useSettingsStore.getState().isDiscoverResolvedInSession).toBe(true);
  });

  it('leaves the session answer alone when a later broadcast reports it unresolved', async () => {
    bridge.answer(new Error('refused'));
    await expect(useSettingsStore.getState().resolveDiscoverCta()).rejects.toThrow('refused');

    bridge.broadcast({ harness: 'codex' });

    expect(useSettingsStore.getState().discoverCtaResolved).toBe(false);
    expect(useSettingsStore.getState().isDiscoverResolvedInSession).toBe(true);
  });
});

describe('setHarness', () => {
  it('projects saved sound answers and retains the prior preference when a write fails', async () => {
    const bridge = fakeBridge();
    bridge.install();
    bridge.answer({ notificationSound: { enabled: false, sound: 'two-tone' } });
    await useSettingsStore.getState().setNotificationSound({ enabled: false, sound: 'two-tone' });
    expect(useSettingsStore.getState().notificationSound).toEqual({ enabled: false, sound: 'two-tone' });
    bridge.answer(new Error('disk unavailable'));
    await expect(useSettingsStore.getState().setNotificationSound({ enabled: true, sound: 'chirp' })).rejects.toThrow('disk unavailable');
    expect(useSettingsStore.getState().notificationSound).toEqual({ enabled: false, sound: 'two-tone' });
  });

  it('choosing Codex writes once and holds the answer', async () => {
    bridge.answer({ harness: 'codex' });
    await useSettingsStore.getState().setHarness('codex');
    expect(bridge.sets()).toEqual(['codex']);
    expect(useSettingsStore.getState().harness).toBe('codex');
  });

  it("holds main's answer over the request when they differ (a pin)", async () => {
    bridge.answer({ harness: 'claude' });
    await useSettingsStore.getState().setHarness('codex');
    expect(useSettingsStore.getState().harness).toBe('claude');
  });

  it('a refused write leaves the shown default where it was', async () => {
    bridge.answer(new Error('refused'));
    await useSettingsStore.getState().setHarness('codex');
    expect(bridge.sets()).toEqual(['codex']);
    expect(useSettingsStore.getState().harness).toBe('claude');
  });
});

describe('defaults', () => {
  it('land at prime, beside the agent default', async () => {
    const primed = primeSettings();
    await bridge.releaseRead({ harness: 'claude' });
    await primed;

    expect(useSettingsStore.getState().defaults).toEqual(DEFAULTS);
  });

  it('a failed read leaves the rows on what they hold', async () => {
    bridge.defaultsAnswer(new Error('refused'));
    const primed = primeSettings();
    await bridge.releaseRead({});
    await primed;

    expect(useSettingsStore.getState().defaults).toEqual({ claude: { models: [] }, codex: { models: [] } });
  });

  it('a settings:changed broadcast re-reads them — a catalog write carries nothing in its payload', async () => {
    bridge.defaultsAnswer({ claude: { models: [] }, codex: { models: [] } });
    const primed = primeSettings();
    await bridge.releaseRead({});
    await primed;

    bridge.defaultsAnswer(DEFAULTS);
    bridge.broadcast({ harness: 'claude' });
    await settleReads();

    expect(bridge.order()).toEqual(['subscribe', 'read', 'readDefaults', 'readDefaults']);
    expect(useSettingsStore.getState().defaults).toEqual(DEFAULTS);
  });
});

describe('setDefault', () => {
  it('writes the patch once and holds the answer', async () => {
    await useSettingsStore.getState().setDefault('codex', { model: 'gpt-5.6' });

    expect(bridge.patches()).toEqual([{ harness: 'codex', model: 'gpt-5.6' }]);
    expect(useSettingsStore.getState().defaults).toEqual(DEFAULTS);
  });

  it('clears a field with null and leaves the other alone', async () => {
    await useSettingsStore.getState().setDefault('claude', { effort: null });

    expect(bridge.patches()).toEqual([{ harness: 'claude', effort: null }]);
  });

  it('a refused write leaves the shown defaults where they were', async () => {
    bridge.defaultsAnswer(new Error('refused'));
    await useSettingsStore.getState().setDefault('claude', { model: 'opus' });

    expect(bridge.patches()).toEqual([{ harness: 'claude', model: 'opus' }]);
    expect(useSettingsStore.getState().defaults).toEqual({ claude: { models: [] }, codex: { models: [] } });
  });
});
