import { expect, test } from 'bun:test';
import { createOnboardingWalk } from './walk.js';

test('a screen behind the sign-in gate is not shown until the gate lifts, and then once (ONL-3259)', () => {
  const walk = createOnboardingWalk();
  expect(walk.shownEvent('found', true)).toBeUndefined();
  expect(walk.shownEvent('found', true)).toBeUndefined();
  expect(walk.shownEvent('found', false)).toEqual({ screen: 'found', visit: 1 });
  expect(walk.shownEvent('found', false)).toBeUndefined();
});

test('Back counts a second showing of the screen it returns to (ONL-3259)', () => {
  const walk = createOnboardingWalk();
  const shown = (['found', 'agent', 'found', 'agent', 'import', 'agent'] as const).map((screen) => walk.shownEvent(screen, false));
  expect(shown).toEqual([
    { screen: 'found', visit: 1 },
    { screen: 'agent', visit: 1 },
    { screen: 'found', visit: 2 },
    { screen: 'agent', visit: 2 },
    { screen: 'import', visit: 1 },
    { screen: 'agent', visit: 3 },
  ]);
});

test('the machine check is a screen of its own only in a walk that draws it (ONL-3259)', () => {
  const without = createOnboardingWalk();
  expect(['agent', 'import'].map((screen) => without.shownEvent(screen as 'agent' | 'import', false)?.screen)).toEqual(['agent', 'import']);
  const withCheck = createOnboardingWalk();
  expect((['agent', 'machine', 'import'] as const).map((screen) => withCheck.shownEvent(screen, false)?.screen)).toEqual(['agent', 'machine', 'import']);
});
