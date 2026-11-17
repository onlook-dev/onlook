export type BackgroundEventKind = 'finished' | 'failed' | 'question' | 'approval';

/** `ready` is an import's own landing, which no agent turn reports (ONL-3182). */
export type NoticeKind = BackgroundEventKind | 'ready';

export interface TabNotice {
  id: string;
  tabId: string;
  name: string;
  /** The GitHub repository the Project was cloned from, named and pictured instead of the Project's code name. */
  repository?: string;
  kind: NoticeKind;
}

export interface NotificationPreference {
  enabled: boolean;
  invitation: 'unseen' | 'pending' | 'snoozed' | 'dismissed';
  snoozedUntil?: number;
  delivery: 'unconfirmed' | 'delivered' | 'failed';
}

export type NotificationAction = { kind: 'enable' | 'disable' | 'snooze' | 'dismiss' | 'open-settings' } | { kind: 'open'; id: string };

export const DEFAULT_NOTIFICATIONS: NotificationPreference = { enabled: false, invitation: 'unseen', delivery: 'unconfirmed' };

export function notificationPreference(value: unknown): NotificationPreference {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_NOTIFICATIONS };
  const state = value as Record<string, unknown>;
  const invitation = state['invitation'];
  const delivery = state['delivery'];
  const snoozedUntil = state['snoozedUntil'];
  return {
    enabled: state['enabled'] === true,
    invitation: invitation === 'pending' || invitation === 'snoozed' || invitation === 'dismissed' ? invitation : 'unseen',
    delivery: delivery === 'delivered' || delivery === 'failed' ? delivery : 'unconfirmed',
    ...(typeof snoozedUntil === 'number' && Number.isFinite(snoozedUntil) && snoozedUntil > 0 ? { snoozedUntil } : {}),
  };
}

export function notificationInvitationAsks(preference: NotificationPreference): boolean {
  return !preference.enabled && preference.invitation === 'pending';
}

export function notificationInvitationDue(preference: NotificationPreference, now: number): boolean {
  return !preference.enabled && (preference.invitation === 'unseen' || (preference.invitation === 'snoozed' && now >= (preference.snoozedUntil ?? 0)));
}
