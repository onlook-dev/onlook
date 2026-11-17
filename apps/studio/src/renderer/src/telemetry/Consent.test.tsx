import '../testing/dom.js';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SettingsState } from '@studio/events';
import { ConsentGate, ConsentView } from './Consent.js';
import { AnalyticsRow } from '../settings/rows.js';
import { primeSettings, resetSettingsPrimeForTests, useSettingsStore } from '../settings/store.js';
import { deferred, installBridge, type Deferred } from '../testing/bridge.js';
import { takeComplaints } from '../testing/dom.js';
import { t } from '@studio/i18n';

describe('source telemetry question', () => {
  it('shows two clear choices and explains data, recipient and later withdrawal', () => {
    const markup = renderToStaticMarkup(<ConsentView onAnswer={() => {}} />);
    for (const text of [t('telemetry.accept'), t('telemetry.decline'), 'PostHog', 'Settings', 'Nothing is sent']) expect(markup).toContain(text);
    expect(markup).toContain('telemetry-accept');
    expect(markup).toContain('telemetry-decline');
    expect(markup).toContain(t('telemetry.choice'));
    expect(markup).not.toContain('type="email"');
  });

  it('keeps errors accessible and both choices available for retry', () => {
    const markup = renderToStaticMarkup(<ConsentView failed onAnswer={() => {}} />);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain(t('settings.analytics.saveFailed'));
    expect(markup).not.toContain('disabled');
  });

  it('disables both choices while saving', () => {
    const markup = renderToStaticMarkup(<ConsentView saving onAnswer={() => {}} />);
    expect(markup.match(/<button[^>]*disabled/g)).toHaveLength(2);
  });

  it('shows a usage-only setting, with a fixed error row and removed-build explanation', () => {
    const accepted = renderToStaticMarkup(<AnalyticsRow consent="accepted" value saveFailed onChange={() => {}} />);
    expect(accepted).toContain(t('telemetry.settings.label'));
    expect(accepted).toContain('checked');
    expect(accepted).toContain('role="alert"');
    const removed = renderToStaticMarkup(<AnalyticsRow consent="removed" value={false} onChange={() => {}} />);
    expect(removed).toContain('disabled');
    expect(removed).toContain(t('telemetry.settings.removed'));
  });
});

describe('mounted source telemetry question', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  beforeEach(resetSettingsPrimeForTests);
  afterEach(async () => {
    await act(async () => { root?.unmount(); });
    root = undefined;
    container?.remove();
    container = undefined;
    resetSettingsPrimeForTests();
    expect(takeComplaints()).toEqual([]);
  });

  function ParentGate(): React.JSX.Element {
    const consent = useSettingsStore((state) => state.telemetryConsent);
    return consent === undefined || consent === 'unknown'
      ? <ConsentGate />
      : <div data-testid="consent-complete" />;
  }

  async function mount() {
    const requests: { enabled: boolean; answer: Deferred<SettingsState> }[] = [];
    let publish: (state: SettingsState) => void = () => {};
    installBridge({
      settingsState: async () => ({ telemetryConsent: 'unknown', analyticsEnabled: false }),
      settingsDefaults: async () => useSettingsStore.getState().defaults,
      onSettingsChanged: (listener) => { publish = listener; return () => {}; },
      settingsSetAnalytics: (enabled) => {
        const answer = deferred<SettingsState>();
        requests.push({ enabled, answer });
        return answer.promise;
      },
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    const node = container;
    await act(async () => {
      await primeSettings();
      root = createRoot(node);
      root.render(<ParentGate />);
    });
    return { node, requests, publish: (state: SettingsState) => { publish(state); } };
  }

  it('keeps unknown consent after a failed affirmative and enables both choices for retry', async () => {
    const { node, requests } = await mount();
    await act(async () => { node.querySelector<HTMLButtonElement>('[data-testid="telemetry-accept"]')!.click(); });
    expect(requests.map((request) => request.enabled)).toEqual([true]);
    expect(useSettingsStore.getState().isAnalyticsSaving).toBe(true);
    for (const choice of ['accept', 'decline']) {
      expect(node.querySelector<HTMLButtonElement>(`[data-testid="telemetry-${choice}"]`)?.disabled).toBe(true);
    }

    await act(async () => { requests[0]!.answer.refuse(new Error('save failed')); });
    expect(useSettingsStore.getState()).toMatchObject({
      telemetryConsent: 'unknown', analyticsEnabled: false, isAnalyticsSaving: false, analyticsSaveFailed: true,
    });
    expect(node.querySelector('[data-testid="telemetry-consent"]')).not.toBeNull();
    expect(node.querySelector('[role="alert"]')?.textContent).toBe(t('settings.analytics.saveFailed'));
    for (const choice of ['accept', 'decline']) {
      expect(node.querySelector<HTMLButtonElement>(`[data-testid="telemetry-${choice}"]`)?.disabled).toBe(false);
    }

    await act(async () => { node.querySelector<HTMLButtonElement>('[data-testid="telemetry-accept"]')!.click(); });
    expect(requests.map((request) => request.enabled)).toEqual([true, true]);
    expect(useSettingsStore.getState().analyticsSaveFailed).toBe(false);
    expect(node.querySelector('[role="alert"]')).toBeNull();
    await act(async () => { requests[1]!.answer.settle({ telemetryConsent: 'accepted', analyticsEnabled: true }); });
    expect(node.querySelector('[data-testid="consent-complete"]')).not.toBeNull();
  });

  for (const enabled of [true, false]) {
    it(`applies a successful ${enabled ? 'acceptance' : 'refusal'} and leaves the parent gate`, async () => {
      const { node, requests } = await mount();
      await act(async () => {
        node.querySelector<HTMLButtonElement>(`[data-testid="telemetry-${enabled ? 'accept' : 'decline'}"]`)!.click();
      });
      expect(requests.map((request) => request.enabled)).toEqual([enabled]);
      expect(useSettingsStore.getState().telemetryConsent).toBe('unknown');
      await act(async () => {
        requests[0]!.answer.settle({ telemetryConsent: enabled ? 'accepted' : 'declined', analyticsEnabled: enabled });
      });
      expect(useSettingsStore.getState()).toMatchObject({
        telemetryConsent: enabled ? 'accepted' : 'declined', analyticsEnabled: enabled, isAnalyticsSaving: false, analyticsSaveFailed: false,
      });
      expect(node.querySelector('[data-testid="telemetry-consent"]')).toBeNull();
      expect(node.querySelector('[data-testid="consent-complete"]')).not.toBeNull();
    });
  }

  it('keeps a broadcast refusal when saving rejects after the parent gate leaves and retains the save warning', async () => {
    const { node, requests, publish } = await mount();
    await act(async () => { node.querySelector<HTMLButtonElement>('[data-testid="telemetry-decline"]')!.click(); });
    expect(requests.map((request) => request.enabled)).toEqual([false]);

    await act(async () => { publish({ telemetryConsent: 'declined', analyticsEnabled: false }); });
    expect(useSettingsStore.getState()).toMatchObject({
      telemetryConsent: 'declined', analyticsEnabled: false, isAnalyticsSaving: true, analyticsSaveFailed: false,
    });
    expect(node.querySelector('[data-testid="telemetry-consent"]')).toBeNull();
    expect(node.querySelector('[data-testid="consent-complete"]')).not.toBeNull();

    await act(async () => { requests[0]!.answer.refuse(new Error('save failed')); });
    expect(useSettingsStore.getState()).toMatchObject({
      telemetryConsent: 'declined', analyticsEnabled: false, isAnalyticsSaving: false, analyticsSaveFailed: true,
    });
    expect(node.querySelector('[data-testid="telemetry-consent"]')).toBeNull();
    expect(node.querySelector('[data-testid="consent-complete"]')).not.toBeNull();
  });
});
