// Not in cut-dmg.ts: importing that runs a whole cut.

export type Tier = 'notarized' | 'signed-unnotarized' | 'unsigned';

export const TIER_RANK: Record<Tier, number> = {
  notarized: 2,
  'signed-unnotarized': 1,
  unsigned: 0,
};

export function signingGuidance(tier: Tier): string {
  switch (tier) {
    case 'notarized': return 'Developer ID signed and notarized by Apple.';
    case 'signed-unnotarized': return 'macOS may block opening this app.\nFor an app you trust, see System Settings > Privacy & Security.';
    case 'unsigned': return 'Ad-hoc signed for use on your own Mac, not as a trusted download.\nIf macOS blocks it, see the Privacy & Security guidance in SOURCE_BUILD.md.';
  }
}

export function minimumTier(requireNotarized: boolean): Tier {
  return requireNotarized ? 'notarized' : 'signed-unnotarized';
}

export function meetsMinimum(observed: Tier, requireNotarized: boolean): boolean {
  return TIER_RANK[observed] >= TIER_RANK[minimumTier(requireNotarized)];
}
