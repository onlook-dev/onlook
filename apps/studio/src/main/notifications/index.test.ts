import { afterAll, beforeEach, expect, test } from 'bun:test';
import { Notification } from 'electron';
import type { StudioEvent, TabNotice } from '@studio/events';
import { makeStateRoot, cleanupTempFixtures, restoreWorkspaceRoot } from '@studio/fixtures';
import { resetSettingsCache, notificationSettings, saveNotificationSettings } from '../settings/state.js';
import { rememberProject, resetWorkspaceCache } from '../workspace/store.js';
import { ANNOUNCEMENT_WINDOW_MS, importedProject } from '../github-import/announced.js';
import { announceImportLanding, applyNotificationAction, observeNotificationEvent, setNotificationHost } from './index.js';

const savedRoot = process.env['STUDIO_STATE_ROOT'];
const MockNotification = Notification as unknown as { instances: { options: Record<string, unknown>; emit(name: string, ...args: unknown[]): boolean }[] };
let sequence = 0;
let focused = true;
let activeProject = false;
let located = true;
let notices: TabNotice[] = [];
let opened: string[] = [];
const returning = (): void => {
  for (const n of [1, 2, 3]) rememberProject({ workspacePath: `/private-project-${n}`, workspaceName: `brave-otter-${n}`, branchName: `tester/brave-otter-${n}`, baseBranch: 'main', sourceRepoName: 'site', sourcePath: '/private-source', sourceRepoRoot: '/private-source', repoIdentity: 'github.com/tester/site', copiedEnvFiles: [], createdAt: '2026-01-01T00:00:00.000Z' });
};
const ended = (stopReason = 'success'): StudioEvent => ({ type: 'turn.ended', turnId: 'turn', stopReason, cwd: '/private-project', eventId: `e${++sequence}`, sessionId: 'session', seq: sequence, ts: Date.now() });

beforeEach(() => {
  process.env['STUDIO_STATE_ROOT'] = makeStateRoot({ name: 'background-notifications' });
  process.env['STUDIO_WORKSPACE_ROOT'] = makeStateRoot({ name: 'background-notifications-registry' });
  resetSettingsCache();
  resetWorkspaceCache();
  MockNotification.instances.length = 0;
  focused = true;
  activeProject = false;
  located = true;
  notices = [];
  opened = [];
  setNotificationHost({ locate: () => located ? { tabId: 'tab-a', name: 'Project A', focused, activeProject } : undefined, toast: (notice) => notices.push(notice), open: (tabId) => { opened.push(tabId); return true; } });
});

afterAll(() => {
  if (savedRoot === undefined) delete process.env['STUDIO_STATE_ROOT'];
  else process.env['STUDIO_STATE_ROOT'] = savedRoot;
  restoreWorkspaceRoot();
  resetSettingsCache();
  resetWorkspaceCache();
  cleanupTempFixtures();
});

test('focused background work produces one Open toast and no native notification', async () => {
  const event = ended();
  observeNotificationEvent(event);
  observeNotificationEvent(event);
  expect(notices).toHaveLength(1);
  expect(MockNotification.instances).toHaveLength(0);
  await applyNotificationAction({ kind: 'open', id: notices[0]!.id });
  expect(opened).toEqual(['tab-a']);
});

test('unfocused work creates one silent native notification and click selects its tab', () => {
  focused = false;
  saveNotificationSettings({ enabled: true, invitation: 'dismissed', delivery: 'unconfirmed' });
  const event = ended();
  observeNotificationEvent(event);
  observeNotificationEvent(event);
  const notification = MockNotification.instances[0]!;
  expect(MockNotification.instances).toHaveLength(1);
  expect(notification.options).toMatchObject({ title: 'Onlook', body: 'Project A finished', silent: true });
  notification.emit('show');
  expect(notificationSettings().delivery).toBe('delivered');
  notification.emit('click');
  expect(opened).toEqual(['tab-a']);
  expect(notices).toHaveLength(0);
});

test('current-tab work and a user stop produce neither kind of notification', () => {
  activeProject = true;
  observeNotificationEvent(ended());
  focused = false;
  observeNotificationEvent(ended('interrupted'));
  expect(notices).toHaveLength(0);
  expect(MockNotification.instances).toHaveLength(0);
});

const register = (workspacePath: string, workspaceName: string, repoIdentity: string): void => {
  rememberProject({ workspacePath, workspaceName, branchName: `tester/${workspaceName}`, baseBranch: 'main', sourceRepoName: 'test', sourcePath: `/private-source-${workspaceName}`, sourceRepoRoot: `/private-source-${workspaceName}`, repoIdentity, copiedEnvFiles: [], createdAt: '2026-01-01T00:00:00.000Z' });
};
const imported = (): void => {
  register('/private-project', 'slate-swift', 'github.com/onlook-dev/test');
  importedProject('/private-project', 'onlook-dev/test');
};

test('an import working in the background is announced once, by its repository, with its landing words', () => {
  imported();
  announceImportLanding('/private-project');
  announceImportLanding('/private-project');
  expect(notices).toHaveLength(1);
  expect(notices[0]).toMatchObject({ name: 'Project A', repository: 'onlook-dev/test', kind: 'ready' });
});

test('an import that runs no turn of its own is still announced when its Tab names it', () => {
  imported();
  announceImportLanding('/private-project');
  expect(notices).toHaveLength(1);
  expect(notices[0]).toMatchObject({ kind: 'ready' });
  expect(MockNotification.instances).toEqual([]);
});

test('an import the person opened straight away gets its landing toast, and its turns stay quiet', () => {
  activeProject = true;
  imported();
  announceImportLanding('/private-project');
  expect(notices).toHaveLength(1);
  expect(notices[0]).toMatchObject({ repository: 'onlook-dev/test', kind: 'ready' });
  /* Every later turn in the Project the person is looking at stays silent, as any other's does. */
  observeNotificationEvent(ended());
  expect(notices).toHaveLength(1);
});

test('an import that lands while the window is away says so natively, naming the repository', () => {
  focused = false;
  saveNotificationSettings({ enabled: true, invitation: 'dismissed', delivery: 'unconfirmed' });
  imported();
  announceImportLanding('/private-project');
  expect(MockNotification.instances).toHaveLength(1);
  expect(MockNotification.instances[0]!.options).toMatchObject({ body: 'onlook-dev/test is ready for you' });
});

/* The landing is the import's, so an agent turn is never spent on it and never speaks in its place. */
test('a turn in an imported Project keeps its own words beside the landing', () => {
  imported();
  announceImportLanding('/private-project');
  observeNotificationEvent(ended());
  expect(notices).toHaveLength(2);
  expect(notices[0]).toMatchObject({ kind: 'ready' });
  expect(notices[1]).toMatchObject({ repository: 'onlook-dev/test', kind: 'finished' });
});

test('a landing nobody could be shown stays pending until someone can be', () => {
  focused = false;
  imported();
  announceImportLanding('/private-project');
  expect(MockNotification.instances).toEqual([]);
  expect(notices).toEqual([]);
  focused = true;
  announceImportLanding('/private-project');
  expect(notices).toHaveLength(1);
  expect(notices[0]).toMatchObject({ kind: 'ready' });
});

test('an import whose Project has no Tab announces nothing and keeps its claim', () => {
  imported();
  located = false;
  announceImportLanding('/private-project');
  expect(notices).toEqual([]);
  located = true;
  announceImportLanding('/private-project');
  expect(notices).toHaveLength(1);
  expect(notices[0]).toMatchObject({ kind: 'ready' });
});

test('a Project whose import announcement survives a relaunch is announced by its repository, once', () => {
  imported();
  resetWorkspaceCache();
  announceImportLanding('/private-project');
  expect(notices[0]).toMatchObject({ repository: 'onlook-dev/test', kind: 'ready' });
  resetWorkspaceCache();
  announceImportLanding('/private-project');
  expect(notices).toHaveLength(1);
});

test('a sibling Project of the same repository keeps its own toast and its own name', () => {
  imported();
  register('/private-sibling', 'brave-otter', 'github.com/onlook-dev/test');
  observeNotificationEvent({ ...ended(), cwd: '/private-sibling' });
  expect(notices).toHaveLength(1);
  expect(notices[0]?.repository).toBeUndefined();
  expect(notices[0]?.kind).toBe('finished');
});

test('a landing older than the window is let go, and the Project keeps its repository name', () => {
  register('/private-project', 'slate-swift', 'github.com/onlook-dev/test');
  importedProject('/private-project', 'onlook-dev/test', Date.now() - ANNOUNCEMENT_WINDOW_MS - 1);
  announceImportLanding('/private-project');
  expect(notices).toEqual([]);
  observeNotificationEvent(ended());
  expect(notices).toHaveLength(1);
  expect(notices[0]).toMatchObject({ repository: 'onlook-dev/test', kind: 'finished' });
});

test('a Project Studio did not import keeps its own name and claims no repository', () => {
  returning();
  observeNotificationEvent({ ...ended(), cwd: '/private-project-1' });
  expect(notices[0]?.repository).toBeUndefined();
  expect(notices[0]?.name).toBe('Project A');
});

test('permission invitation snoozes for seven days and dismissal survives a state reload', async () => {
  focused = false;
  returning();
  observeNotificationEvent(ended());
  expect(notificationSettings().invitation).toBe('pending');
  await applyNotificationAction({ kind: 'snooze' });
  const snoozed = notificationSettings();
  expect(snoozed.snoozedUntil! - Date.now()).toBeGreaterThan(6.99 * 24 * 60 * 60 * 1000);
  observeNotificationEvent(ended());
  expect(notificationSettings().invitation).toBe('snoozed');
  await applyNotificationAction({ kind: 'dismiss' });
  resetSettingsCache();
  expect(notificationSettings().invitation).toBe('dismissed');
});

test('native delivery failures remain discoverable without saving the native error or message', () => {
  focused = false;
  saveNotificationSettings({ enabled: true, invitation: 'dismissed', delivery: 'unconfirmed' });
  observeNotificationEvent(ended());
  MockNotification.instances[0]!.emit('failed', {}, 'Private native error');
  expect(notificationSettings().delivery).toBe('failed');
  expect(JSON.stringify(notificationSettings())).not.toContain('Private');
});

test('a first launch leaves the invitation unseen (ONL-2995)', () => {
  focused = false;
  observeNotificationEvent(ended());
  expect(notificationSettings().invitation).toBe('unseen');
});

test('a third project makes the invitation pending (ONL-2995)', () => {
  focused = false;
  returning();
  observeNotificationEvent(ended());
  expect(notificationSettings().invitation).toBe('pending');
});

test('a dismissed invitation is never pending again on a returning launch (ONL-2995)', async () => {
  focused = false;
  returning();
  await applyNotificationAction({ kind: 'dismiss' });
  observeNotificationEvent(ended());
  expect(notificationSettings().invitation).toBe('dismissed');
});
