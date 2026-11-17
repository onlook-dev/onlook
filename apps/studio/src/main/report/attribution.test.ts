import { beforeEach, describe, expect, it, mock } from 'bun:test';
import type { StudioIdentity } from '@studio/events';
import type { ReportProperties } from './payload.js';

let enabled = true;
let identity: StudioIdentity | null = null;
const captured: ReportProperties[] = [];

mock.module('@onlook/cloud-provider', () => ({ identity: { enabled: () => enabled } }));
mock.module('./provider.js', () => ({ reportProvider: async () => undefined }));
mock.module('../identity/store.js', () => ({ readIdentity: () => identity }));
mock.module('../telemetry/index.js', () => ({
  correlation: () => ({ installId: 'test-install' }),
  captureDurable: async (_event: string, properties: ReportProperties) => {
    captured.push(properties);
    return 'queued';
  },
}));

const { noteOnlookSession } = await import('../cloud/access.js');
const { submitReport, resetReportBoundsForTesting } = await import('./index.js');
const request = { lane: 'feature', entryPoint: 'rail', message: 'Add a ruler' };

beforeEach(() => {
  enabled = true;
  identity = { email: 'first@onlook.test', source: 'provider', subject: 'first-account' };
  captured.length = 0;
  noteOnlookSession('signed-in');
  resetReportBoundsForTesting();
});

describe('feedback attribution through the live submission dependencies', () => {
  it('reads the current account for each submission instead of retaining the previous sender', async () => {
    expect(await submitReport(request)).toEqual({ kind: 'queued' });
    identity = { email: 'second@onlook.test', source: 'provider', subject: 'second-account' };
    resetReportBoundsForTesting();
    expect(await submitReport(request)).toEqual({ kind: 'queued' });

    expect(captured.map(({ email, account_id }) => ({ email, account_id }))).toEqual([
      { email: 'first@onlook.test', account_id: 'first-account' },
      { email: 'second@onlook.test', account_id: 'second-account' },
    ]);
  });

  it('omits saved account details after sign-out even when the identity file remains', async () => {
    noteOnlookSession('signed-out');
    expect(await submitReport(request)).toEqual({ kind: 'queued' });

    expect(captured).toHaveLength(1);
    expect(captured[0]).not.toHaveProperty('email');
    expect(captured[0]).not.toHaveProperty('account_id');
  });

  it('keeps local feedback usable with a manual email or no identity', async () => {
    enabled = false;
    noteOnlookSession('local');
    identity = { email: 'manual@onlook.test', source: 'manual' };
    expect(await submitReport(request)).toEqual({ kind: 'queued' });
    expect(captured[0]?.email).toBe('manual@onlook.test');
    expect(captured[0]).not.toHaveProperty('account_id');

    identity = null;
    resetReportBoundsForTesting();
    expect(await submitReport(request)).toEqual({ kind: 'queued' });
    expect(captured[1]).not.toHaveProperty('email');
    expect(captured[1]).not.toHaveProperty('account_id');
  });
});
