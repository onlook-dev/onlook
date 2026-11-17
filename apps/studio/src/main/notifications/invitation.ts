import { notificationInvitationDue, type NotificationPreference } from '@studio/events';

export const INVITATION_MIN_PROJECTS = 3;

export function invitationArrives(input: { preference: NotificationPreference; now: number; projectCount: () => number }): boolean {
  if (!notificationInvitationDue(input.preference, input.now)) return false;
  return input.projectCount() >= INVITATION_MIN_PROJECTS;
}
