import { shell } from 'electron';
import { handle } from '../ipc/bridge.js';
import { IPC_INVOKE, type NotificationAction, type StudioEvent, type TabNotice, type SettingsState } from '@studio/events';
import { BackgroundActivity, backgroundDestination } from './activity.js';
import { notificationSettings, saveNotificationSettings } from '../settings/state.js';
import { broadcastSettingsChanged, settingsState } from '../settings/changed.js';
import { capture } from '../telemetry/index.js';
import { t } from '@studio/i18n';
import { notificationLine } from '@studio/i18n/notifications';
import { log } from '../log/index.js';
import { proofSwitchOn } from '../diagnostics/gate.js';
import { notificationPresenter, setNotifierFactory, type NotificationPresenter } from './presenter.js';
import { recordingNotifier } from './recording-presenter.js';
import { invitationArrives } from './invitation.js';
import { projectCount, registeredProject } from '../workspace/store.js';
import { importedRepository, importLandingPending, takeImportLanding } from '../github-import/announced.js';
import { isMac } from '../env/platform.js';

interface NotificationHost {
  locate(cwd: string): { tabId: string; name: string; focused: boolean; activeProject: boolean } | undefined;
  toast(notice: TabNotice): void;
  open(tabId: string): boolean;
}

const logger = log('notifications');
const activity = new BackgroundActivity();
const notices = new Map<string, TabNotice>();
const native = new Map<string, NotificationPresenter>();
let host: NotificationHost | undefined;
let authorizationPresenter: NotificationPresenter | undefined;

export function setNotificationHost(next: NotificationHost): void {
  host = next;
}

function remember(notice: TabNotice): void {
  notices.set(notice.id, notice);
  if (notices.size > 512) {
    const first = notices.keys().next().value;
    if (first !== undefined) {
      native.get(first)?.close();
      native.delete(first);
      notices.delete(first);
    }
  }
}

function saveDelivery(delivery: 'delivered' | 'failed'): void {
  try {
    saveNotificationSettings({ ...notificationSettings(), delivery });
    broadcastSettingsChanged();
  } catch (error) {
    logger.error('notification delivery preference could not be saved', { error });
  }
}

function openNotice(id: string, method: 'notification' | 'toast'): void {
  const notice = notices.get(id);
  if (notice === undefined) return;
  if (host?.open(notice.tabId)) capture(method === 'notification' ? 'notification_clicked' : 'notification_toast_opened', { event_kind: notice.kind });
  native.get(id)?.close();
  native.delete(id);
  notices.delete(id);
}

/** The repository a Project was cloned from, which names it in every notice about it. */
function repositoryOf(cwd: string): string | undefined {
  const workspacePath = registeredProject(cwd)?.workspacePath;
  return workspacePath === undefined ? undefined : importedRepository(workspacePath);
}

/** `announce` runs only where the notice is handed over, so a claim nobody could be shown stays unspent. */
function deliver(notice: TabNotice, destination: 'toast' | 'notification', announce: () => void, invite: boolean): void {
  if (destination === 'toast') {
    announce();
    remember(notice);
    host?.toast(notice);
    capture('notification_shown', { event_kind: notice.kind, focused: true });
    return;
  }
  const preference = notificationSettings();
  if (!preference.enabled) {
    if (invite && invitationArrives({ preference, now: Date.now(), projectCount })) {
      try {
        saveNotificationSettings({ ...preference, invitation: 'pending' });
        broadcastSettingsChanged();
      } catch (error) {
        logger.error('notification invitation could not be saved', { error });
      }
    }
    return;
  }
  announce();
  remember(notice);
  try {
    const notification = notificationPresenter({ id: notice.id, title: t('app.name'), body: notificationLine(notice.kind, notice.repository ?? notice.name), silent: true });
    native.set(notice.id, notification);
    notification.once('click', () => openNotice(notice.id, 'notification'));
    notification.once('show', () => {
      saveDelivery('delivered');
      capture('notification_shown', { event_kind: notice.kind, focused: false });
    });
    notification.once('failed', () => {
      saveDelivery('failed');
      native.delete(notice.id);
    });
    notification.once('close', () => native.delete(notice.id));
    notification.show();
  } catch {
    saveDelivery('failed');
    native.delete(notice.id);
  }
}

/* A clone's landing is the import's own moment, which no agent turn reports: it is announced as soon
   as the Project has a Tab to name, exactly once, wherever the person is looking. An agent's turn is
   never spent on it, so nothing a turn would have said is swallowed (ONL-3182). */
export function announceImportLanding(workspacePath: string): void {
  if (!importLandingPending(workspacePath)) return;
  const repository = importedRepository(workspacePath);
  const owner = host?.locate(workspacePath);
  if (repository === undefined || owner === undefined) return;
  deliver({ id: `landing:${workspacePath}`, tabId: owner.tabId, name: owner.name, repository, kind: 'ready' },
    owner.focused ? 'toast' : 'notification', () => takeImportLanding(workspacePath), false);
}

export function observeNotificationEvent(event: StudioEvent): void {
  const outcome = activity.observe(event);
  if (outcome.waitedMs !== undefined && outcome.waitingKind !== undefined) capture('notification_wait_answered', { event_kind: outcome.waitingKind, waited_ms: outcome.waitedMs });
  if (outcome.kind === undefined || event.cwd === undefined) return;
  const owner = host?.locate(event.cwd);
  if (owner === undefined) return;
  const destination = backgroundDestination(owner.focused, owner.activeProject);
  if (destination === undefined) return;
  const repository = repositoryOf(event.cwd);
  const notice: TabNotice = { id: `${event.sessionId}:${event.eventId}`, tabId: owner.tabId, name: owner.name, ...(repository === undefined ? {} : { repository }), kind: outcome.kind };
  deliver(notice, destination, () => undefined, outcome.kind === 'finished' || outcome.kind === 'failed');
}

export async function applyNotificationAction(action: NotificationAction): Promise<SettingsState> {
  if (action === null || typeof action !== 'object') throw new Error('Invalid notification action');
  const preference = notificationSettings();
  switch (action.kind) {
    case 'open':
      if (typeof action.id !== 'string') throw new Error('Invalid notification id');
      openNotice(action.id, 'toast');
      break;
    case 'open-settings':
      if (isMac()) await shell.openExternal('x-apple.systempreferences:com.apple.Notifications-Settings.extension');
      break;
    case 'enable':
      saveNotificationSettings({ ...preference, enabled: true, invitation: 'dismissed', delivery: 'unconfirmed' });
      try {
        authorizationPresenter ??= notificationPresenter({ title: t('app.name'), silent: true });
      } catch {
        saveDelivery('failed');
      }
      break;
    case 'disable':
      saveNotificationSettings({ ...preference, enabled: false, invitation: 'dismissed' });
      break;
    case 'dismiss':
      saveNotificationSettings({ ...preference, invitation: 'dismissed' });
      break;
    case 'snooze':
      saveNotificationSettings({ ...preference, invitation: 'snoozed', snoozedUntil: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      break;
    default:
      throw new Error('Invalid notification action');
  }
  const state = settingsState();
  broadcastSettingsChanged(state);
  return state;
}

export function registerNotificationHandlers(): void {
  if (proofSwitchOn('STUDIO_NOTIFICATION_PROOF')) {
    const recording = recordingNotifier();
    setNotifierFactory(recording.factory);
    Object.assign(globalThis, { __studioNotificationProof: recording });
  }
  handle(IPC_INVOKE.notificationAction, (_event, action: NotificationAction) => applyNotificationAction(action));
}
