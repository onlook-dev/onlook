import { describe, expect, it } from 'bun:test';
import { DEFAULT_NOTIFICATIONS } from '@studio/events';
import { invitationArrives, INVITATION_MIN_PROJECTS } from './invitation.js';

const LAUNCH = Date.parse('2026-11-03T12:00:00.000Z');
const NOW = LAUNCH + 60_000;
const UNSEEN = DEFAULT_NOTIFICATIONS;

describe('when the notification invite arrives (ONL-2995)', () => {
  it('arrives once the person has made enough projects', () => {
    expect(invitationArrives({ preference: UNSEEN, now: NOW, projectCount: () => INVITATION_MIN_PROJECTS })).toBe(true);
  });

  it('waits while the person is new, however the invite is shown', () => {
    expect(invitationArrives({ preference: UNSEEN, now: NOW, projectCount: () => INVITATION_MIN_PROJECTS - 1 })).toBe(false);
  });

  it('never arrives again once dismissed, even on a returning launch', () => {
    expect(invitationArrives({ preference: { ...UNSEEN, invitation: 'dismissed' }, now: NOW, projectCount: () => INVITATION_MIN_PROJECTS })).toBe(false);
  });

  it('never arrives with notifications already on', () => {
    expect(invitationArrives({ preference: { ...UNSEEN, enabled: true }, now: NOW, projectCount: () => INVITATION_MIN_PROJECTS })).toBe(false);
  });
});
