import { expect, test } from 'bun:test';
import { notificationInvitationDue, notificationPreference } from './notifications.js';

test('notification preferences normalize malformed persistence and expire a snooze at seven days', () => {
  const cold = notificationPreference({ enabled: 'yes', invitation: 'unexpected', delivery: 'unexpected', snoozedUntil: NaN });
  expect(cold).toEqual({ enabled: false, invitation: 'unseen', delivery: 'unconfirmed' });
  expect(notificationInvitationDue(cold, 1000)).toBe(true);
  const snoozed = notificationPreference({ invitation: 'snoozed', snoozedUntil: 7 * 24 * 60 * 60 * 1000 });
  expect(notificationInvitationDue(snoozed, 1000)).toBe(false);
  expect(notificationInvitationDue(snoozed, 7 * 24 * 60 * 60 * 1000)).toBe(true);
  expect(notificationInvitationDue({ ...cold, invitation: 'dismissed' }, 999_999_999)).toBe(false);
});
