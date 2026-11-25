import type { GitCardStateId, GitPillStateId } from './state.js';

export interface GitPalette {
  hue: string;
  tint: string;
}

type Family = 'error' | 'ready' | 'upload' | 'download' | 'merged' | 'neutral';

const FAMILY: Record<Family, GitPalette> = {
  error: { hue: 'var(--studio-git-error-hue)', tint: 'var(--studio-git-error-tint)' },
  ready: { hue: 'var(--studio-git-ready-hue)', tint: 'var(--studio-git-ready-tint)' },
  upload: { hue: 'var(--studio-git-upload-hue)', tint: 'var(--studio-git-upload-tint)' },
  download: { hue: 'var(--studio-git-download-hue)', tint: 'var(--studio-git-download-tint)' },
  merged: { hue: 'var(--studio-git-merged-hue)', tint: 'var(--studio-git-merged-tint)' },
  neutral: { hue: 'var(--studio-git-neutral-hue)', tint: 'var(--studio-git-neutral-tint)' },
};

export const PRIMARY = {
  ink: 'var(--studio-git-primary-ink)',
  border: 'var(--studio-git-primary-border)',
  fill: 'var(--studio-git-primary-fill)',
} as const;

export const PILL_FAMILY: Record<GitPillStateId, Family | 'primary' | 'outline'> = {
  'no-git': 'neutral',
  'no-access': 'neutral',
  'connect-github': 'neutral',
  'local-only': 'neutral',
  'first-paint': 'outline',
  merged: 'merged',
  'pr-closed': 'neutral',
  'draft-pr': 'neutral',
  'resolve-conflicts': 'error',
  'fix-checks': 'error',
  'download-changes': 'download',
  'upload-changes': 'upload',
  'checks-running': 'neutral',
  'ready-to-merge': 'ready',
  'create-pr': 'primary',
  push: 'primary',
};

export const CARD_FAMILY: Record<Exclude<GitCardStateId, 'none'>, Family> = {
  'no-git': 'neutral',
  'checks-failed': 'error',
  conflicts: 'error',
  'checks-running': 'neutral',
  'updates-available': 'download',
  'not-uploaded': 'upload',
  'ready-to-merge': 'ready',
  merged: 'merged',
  'local-only': 'neutral',
};

export function familyPalette(family: Family): GitPalette {
  return FAMILY[family];
}
