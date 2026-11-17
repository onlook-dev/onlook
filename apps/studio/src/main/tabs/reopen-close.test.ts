import { describe, expect, it } from 'bun:test';
import type { ProjectSetupSnapshot } from '@studio/events';
import type { WebContents } from 'electron';
import { finalTabClose } from '../agent-host/final-tab-close.js';
import { restartProjectOnOpen } from '../location/setup-reopen.js';
import { applyLocationTransition } from '../location/transition.js';
import { ClosedTabs } from './reopen.js';
import { hasOpenProjectView, registerView, unregisterView, workspaceOf } from './views.js';
import { seatedTabs } from './test-support.js';

interface TestView {
  webContents: WebContents;
}

interface TestTab {
  id: string;
  workspacePath?: string;
  isWorking: boolean;
  view: TestView;
}

function renderer(id: number) {
  const channels: string[] = [];
  const contents = {
    id,
    once: () => undefined,
    isDestroyed: () => false,
    send: (channel: string) => { channels.push(channel); },
  } as unknown as WebContents;
  return { contents, channels };
}

describe('actual Tab close during a pending location reopen', () => {
  it('invalidates the retained last renderer before retirement without waiting for projects-location IPC', async () => {
    for (const saved of [true, false]) {
      const cwd = saved ? '/fixture/reopen-last-saved' : '/fixture/reopen-last-starter';
      const closing = renderer(saved ? 7501 : 7502);
      registerView(closing.contents, cwd);
      const tab: TestTab = { id: 'closing', workspacePath: cwd, isWorking: false, view: { webContents: closing.contents } };
      const tabs = new Map([['closing', tab]]);
      const cleanup: string[] = [];
      let retired = Promise.resolve();
      const host = seatedTabs({
        tabs,
        order: ['closing'],
        closed: new ClosedTabs(),
        broadcastTabs: () => undefined,
        persistWindows: () => undefined,
        assign: () => undefined,
        retire: (project: string) => {
          expect(workspaceOf(closing.contents.id)).toBeUndefined();
          retired = finalTabClose(project, {
            stopSetup: async () => { cleanup.push('stop'); },
            releaseSession: async () => { cleanup.push('release'); },
            closed: () => { cleanup.push('closed'); },
            failed: () => { throw new Error('unexpected cleanup failure'); },
          });
        },
      });
      let resumeCanvas: () => void = () => undefined;
      const canvas = new Promise<void>((resolve) => { resumeCanvas = resolve; });
      const calls: string[] = [];
      const snapshot: ProjectSetupSnapshot = {
        saved: saved ? { revision: 'saved', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 3000 }] } } : null,
        verified: null, state: 'idle', failure: null,
      };
      let reopened = Promise.resolve<'starter' | 'saved' | 'unknown'>('unknown');
      const transition = applyLocationTransition({ kind: 'project', repoIdentity: 'fixture', workspacePath: cwd }, {
        setLocation: () => undefined,
        stopStarterExcept: () => undefined,
        openCanvas: () => canvas,
        deactivateCanvas: () => undefined,
        deactivateServerBook: () => undefined,
        reverifyServerBook: () => undefined,
        projectOpened: () => undefined,
        restartStarter: (project) => {
          reopened = restartProjectOnOpen(project, {
            registered: (target) => target === cwd,
            stillOpen: hasOpenProjectView,
            isStarterProject: () => true,
            setup: () => ({ read: () => snapshot, run: async () => { calls.push('saved-start'); return { ok: true, snapshot }; } }),
            restartStarter: async () => { calls.push('starter-spawn'); },
          });
        },
      });
      try {
        expect(hasOpenProjectView(cwd)).toBe(true);
        host.close('closing');
        await retired;
        expect(cleanup).toEqual(['stop', 'release', 'closed']);
        expect(tabs.get('closing')).toBe(tab);
        expect(tab.workspacePath).toBeUndefined();
        expect(closing.contents.isDestroyed()).toBe(false);
        expect(closing.channels.length).toBeGreaterThan(0);
        expect(hasOpenProjectView(cwd)).toBe(false);
        resumeCanvas();
        await transition;
        expect(await reopened).toBe('unknown');
        expect(calls).toEqual([]);
      } finally { resumeCanvas(); unregisterView(closing.contents); }
    }
  });

  it('preserves another Tab on the same Project when the closing view is invalidated', async () => {
    const cwd = '/fixture/reopen-other-tab';
    const closing = renderer(7503);
    const remaining = renderer(7504);
    registerView(closing.contents, cwd);
    registerView(remaining.contents, cwd);
    const tabs = new Map<string, TestTab>([
      ['closing', { id: 'closing', workspacePath: cwd, isWorking: false, view: { webContents: closing.contents } }],
      ['remaining', { id: 'remaining', workspacePath: cwd, isWorking: false, view: { webContents: remaining.contents } }],
    ]);
    const cleanup: string[] = [];
    const host = seatedTabs({
      tabs,
      order: ['closing', 'remaining'],
      closed: new ClosedTabs(),
      slots: { forget: () => undefined },
      cooling: { forget: () => undefined },
      broadcastTabs: () => undefined,
      persistWindows: () => undefined,
      destroyView: () => undefined,
      retire: () => { cleanup.push('retire'); },
    });
    let resumeCanvas: () => void = () => undefined;
    const canvas = new Promise<void>((resolve) => { resumeCanvas = resolve; });
    const calls: string[] = [];
    const snapshot: ProjectSetupSnapshot = { saved: { revision: 'saved', definition: { prepare: '', install: { script: '', inputs: [], outputs: [] }, servers: [{ id: 'web', cwd: '.', start: 'npm run dev', port: 3000 }] } }, verified: null, state: 'idle', failure: null };
    let reopened = Promise.resolve<'starter' | 'saved' | 'unknown'>('unknown');
    const transition = applyLocationTransition({ kind: 'project', repoIdentity: 'fixture', workspacePath: cwd }, {
      setLocation: () => undefined,
      stopStarterExcept: () => undefined,
      openCanvas: () => canvas,
      deactivateCanvas: () => undefined,
      deactivateServerBook: () => undefined,
      reverifyServerBook: () => undefined,
      projectOpened: () => undefined,
      restartStarter: (project) => {
        reopened = restartProjectOnOpen(project, {
          registered: (target) => target === cwd,
          stillOpen: hasOpenProjectView,
          isStarterProject: () => false,
          setup: () => ({ read: () => snapshot, run: async () => { calls.push('saved-start'); return { ok: true, snapshot }; } }),
          restartStarter: async () => { calls.push('starter-spawn'); },
        });
      },
    });
    try {
      host.close('closing');
      expect(workspaceOf(closing.contents.id)).toBeUndefined();
      expect(workspaceOf(remaining.contents.id)).toBe(cwd);
      expect(hasOpenProjectView(cwd)).toBe(true);
      expect(cleanup).toEqual([]);
      resumeCanvas();
      await transition;
      expect(await reopened).toBe('saved');
      expect(calls).toEqual(['saved-start']);
    } finally { resumeCanvas(); unregisterView(closing.contents); unregisterView(remaining.contents); }
  });
});
