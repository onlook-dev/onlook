// Not in cut-dmg.ts: importing that runs a whole cut.

export type Tier = 'notarized' | 'signed-unnotarized' | 'unsigned';

export const TIER_RANK: Record<Tier, number> = {
  notarized: 2,
  'signed-unnotarized': 1,
  unsigned: 0,
};

// The degrade to signed-unnotarized needs a person reading the banner; an unwatched release passes --require-notarized.
// Unsigned reads to the recipient as "damaged, move to Trash" with no bypass, while every command exits 0.
export function minimumTier(requireNotarized: boolean): Tier {
  return requireNotarized ? 'notarized' : 'signed-unnotarized';
}

export function meetsMinimum(observed: Tier, requireNotarized: boolean): boolean {
  return TIER_RANK[observed] >= TIER_RANK[minimumTier(requireNotarized)];
}
