import type { OnlookState, StudioIdentity } from '@studio/events';

type SessionSubject = Pick<StudioIdentity, 'email' | 'subject'>;

export function createSessionEpoch() {
  let epoch = 0;
  let previousSession: OnlookState['session'] | undefined;
  let previousEmail: string | null = null;
  let previousUserId: string | undefined;
  return (session: OnlookState['session'], subject: SessionSubject | null): number => {
    const currentSubject = session === 'signed-in' ? subject : null;
    const sameSession = session === previousSession;
    const sameSubject = currentSubject === null ? previousEmail === null : previousEmail !== null && (
      previousUserId !== undefined && currentSubject.subject !== undefined
        ? previousUserId === currentSubject.subject
        : previousEmail === currentSubject.email
    );
    if (!sameSession || !sameSubject) epoch += 1;
    previousUserId = currentSubject?.subject ?? (sameSession && sameSubject ? previousUserId : undefined);
    previousEmail = currentSubject?.email ?? null;
    previousSession = session;
    return epoch;
  };
}
