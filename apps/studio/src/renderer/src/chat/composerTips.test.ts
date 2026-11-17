import { expect, test } from 'bun:test';
import { showsComposerTipsPill } from './composerTips.js';

const QUIET = { isDismissed: false, isHidden: false, isComposerEmpty: true, hasStatus: false, isSkillUnsettled: false, isComposerHeld: false, isQuestionOpen: false };

test('an empty, quiet composer offers the tips pill', () => {
  expect(showsComposerTipsPill(QUIET)).toBe(true);
});

test('the kill switch keeps the tips pill out of the composer however quiet it is (ONL-2995)', () => {
  expect(showsComposerTipsPill({ ...QUIET, isHidden: true })).toBe(false);
});

test('a status, a draft or a dismissal still outranks the pill (ONL-2744)', () => {
  expect(showsComposerTipsPill({ ...QUIET, hasStatus: true })).toBe(false);
  expect(showsComposerTipsPill({ ...QUIET, isComposerEmpty: false })).toBe(false);
  expect(showsComposerTipsPill({ ...QUIET, isDismissed: true })).toBe(false);
});

test('a notice holding the composer, or a waiting question, outranks the pill (ONL-2812)', () => {
  expect(showsComposerTipsPill({ ...QUIET, isComposerHeld: true })).toBe(false);
  expect(showsComposerTipsPill({ ...QUIET, isQuestionOpen: true })).toBe(false);
});
