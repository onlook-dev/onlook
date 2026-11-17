import type { OnlookProfile, StudioIdentity } from '@studio/events';

export interface KeptPicture {
  url: string;
  data: string;
}

export function profileFor(identity: StudioIdentity | null, kept: KeptPicture | null): OnlookProfile | null {
  if (identity === null) return null;
  // Matched against its URL: a fetch that started for one person must never publish against the next (ONL-2701).
  const picture = kept !== null && kept.url === identity.pictureUrl ? kept.data : null;
  return { name: identity.name ?? null, email: identity.email, picture };
}
