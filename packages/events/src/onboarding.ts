import type { HarnessId } from './models.js';

export interface OnboardingState {
  hasOnboarded: boolean;
  /** Absent is common and resolves to Claude; reading it as consent moved every pre-existing user onto codex (ONL-2120). */
  harness?: HarnessId;
}

/** An object, not a bare optional: "finished, chose nothing" must differ from an older renderer that sends nothing. */
export interface OnboardingCompletion {
  harness?: HarnessId;
}

export const ONBOARDING_SCREENS = ['role', 'found', 'agent', 'machine', 'import'] as const;
export type OnboardingScreen = (typeof ONBOARDING_SCREENS)[number];

/** How the import screen handed off: a folder to copy, a worktree Studio already holds, or a blank project. */
export const ONBOARDING_IMPORT_CHOICES = ['new', 'existing', 'blank'] as const;
export type OnboardingImportChoice = (typeof ONBOARDING_IMPORT_CHOICES)[number];

export const FOUND_US_QUESTION = 'found_us@v1';
export const FOUND_US_OPTIONS = ['x', 'linkedin', 'instagram', 'tiktok', 'facebook', 'youtube', 'reddit', 'google', 'ai', 'github', 'friend', 'article', 'other'] as const;
export type FoundUsOption = (typeof FOUND_US_OPTIONS)[number];

export function isFoundUsOption(value: unknown): value is FoundUsOption {
  return (FOUND_US_OPTIONS as readonly unknown[]).includes(value);
}

export const ROLE_QUESTION = 'role@v1';
export const ROLE_OPTIONS = ['designer', 'pm', 'engineer', 'founder', 'student', 'other'] as const;
export type RoleOption = (typeof ROLE_OPTIONS)[number];

export function isRoleOption(value: unknown): value is RoleOption {
  return (ROLE_OPTIONS as readonly unknown[]).includes(value);
}

/** `answer` is an option key, never display copy; a new option set is a new `question` version (`found_us@v2`). */
export interface SurveyAnswer {
  question: string;
  answer: string;
  detail?: string;
}
