import { describe, expect, it } from 'bun:test';

import { ApplyCodeChangeRisk, assessCodeChange, shouldBlockApply } from '../src/apply';

const originalCode = `export interface User {
  id: string;
  name: string;
}

export async function fetchUserData(userId: string): Promise<User> {
  const response = await fetch('/api/users/' + userId);
  return response.json();
}`;

describe('apply code quality assessment', () => {
    it('scores a focused applied change as low risk', () => {
        const appliedCode = `export interface User {
  id: string;
  name: string;
  email?: string;
}

export async function fetchUserData(userId: string): Promise<User> {
  const response = await fetch('/api/users/' + userId);
  if (!response.ok) {
    throw new Error('Failed to fetch user: ' + response.status);
  }
  return response.json();
}`;

        const assessment = assessCodeChange(
            originalCode,
            `Add email?: string to User and add fetch response error handling.`,
            'Add email to User and return a typed fetch response with error handling',
            appliedCode,
        );

        expect(assessment.score).toBeGreaterThanOrEqual(80);
        expect(assessment.risk).toBe(ApplyCodeChangeRisk.LOW);
        expect(assessment.blockingConcerns).toEqual([]);
        expect(shouldBlockApply(assessment)).toBe(false);
    });

    it('blocks applied code that leaves fast-apply placeholders behind', () => {
        const appliedCode = `export interface User {
  id: string;
  name: string;
  // other fields
}

export async function fetchUserData(userId: string): Promise<User> {
  // ... existing code
}`;

        const assessment = assessCodeChange(
            originalCode,
            'Add email and error handling',
            'Add email to User and return a typed fetch response with error handling',
            appliedCode,
        );

        expect(assessment.risk).not.toBe(ApplyCodeChangeRisk.LOW);
        expect(assessment.stats.placeholders).toContain('// other fields');
        expect(assessment.blockingConcerns.some((concern) => concern.includes('Placeholder'))).toBe(
            true,
        );
        expect(shouldBlockApply(assessment)).toBe(true);
    });

    it('surfaces exported symbols that disappear from the applied result', () => {
        const appliedCode = `export interface User {
  id: string;
  name: string;
  email?: string;
}`;

        const assessment = assessCodeChange(
            originalCode,
            'Add email to User only.',
            'Add email to User without changing fetchUserData',
            appliedCode,
        );

        expect(assessment.stats.missingOriginalSymbols).toContain('fetchUserData');
        expect(assessment.blockingConcerns).toContain(
            'Possible dropped original symbol: fetchUserData',
        );
        expect(shouldBlockApply(assessment)).toBe(true);
    });

    it('does not treat default export internal names as stable exported symbols', () => {
        const originalDefaultExport = `export default function UserCard() {
  return null;
}`;
        const appliedDefaultExport = `export default function ProfileCard() {
  return null;
}`;

        const assessment = assessCodeChange(
            originalDefaultExport,
            'Rename the default component implementation.',
            'Rename the component used by the default export',
            appliedDefaultExport,
        );

        expect(assessment.stats.missingOriginalSymbols).toEqual([]);
        expect(assessment.blockingConcerns).not.toContain(
            'Possible dropped original symbol: UserCard',
        );
    });

    it('respects disabled missing-symbol blocking when filtering concerns', () => {
        const appliedCode = `export interface User {
  id: string;
  name: string;
}`;

        const assessment = assessCodeChange(
            originalCode,
            'Keep only the User interface.',
            'Remove fetchUserData for an exploratory edit',
            appliedCode,
        );

        expect(assessment.stats.missingOriginalSymbols).toContain('fetchUserData');
        expect(
            shouldBlockApply(assessment, {
                minimumScore: 0,
                blockHighRisk: true,
                blockOnMissingSymbols: false,
            }),
        ).toBe(false);
    });

    it('ignores local symbols when checking exported API preservation', () => {
        const codeWithLocal = `export function renderUser(id: string) {
  const temporaryLabel = id.toUpperCase();
  return temporaryLabel;
}`;
        const appliedCode = `export function renderUser(id: string) {
  return id.toLowerCase();
}`;

        const assessment = assessCodeChange(
            codeWithLocal,
            'Simplify the label formatting',
            'Simplify renderUser',
            appliedCode,
        );

        expect(assessment.stats.missingOriginalSymbols).toEqual([]);
        expect(assessment.blockingConcerns).not.toContain(
            'Possible dropped original symbol: temporaryLabel',
        );
    });

    it('only reports placeholders newly introduced by the applied code', () => {
        const codeWithExistingTodo = `export function renderUser(id: string) {
  // TODO: preserve legacy fallback
  return id;
}`;
        const appliedCode = `export function renderUser(id: string) {
  // TODO: preserve legacy fallback
  return id.toLowerCase();
}`;

        const assessment = assessCodeChange(
            codeWithExistingTodo,
            'Lowercase the rendered user id',
            'Lowercase renderUser output',
            appliedCode,
        );

        expect(assessment.stats.placeholders).toEqual([]);
        expect(assessment.blockingConcerns.some((concern) => concern.includes('Placeholder'))).toBe(
            false,
        );
    });

    it('lets callers use a softer review gate for exploratory edits', () => {
        const preflight = assessCodeChange(
            originalCode,
            `export interface User {
  id: string;
  email?: string;
}`,
            'Experiment with an email-only user type',
        );

        expect(
            shouldBlockApply(preflight, {
                minimumScore: 30,
                blockHighRisk: false,
                blockOnMissingSymbols: false,
            }),
        ).toBe(false);
    });
});
