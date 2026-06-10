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
