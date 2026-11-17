import { describe, expect, it } from 'bun:test';
import { ownerForExit, tabHealthAfter } from './health.js';

describe('tabHealthAfter', () => {
  it('a dead renderer is gone whatever the reason', () => {
    expect(tabHealthAfter(undefined, { kind: 'render-process-gone', reason: 'crashed' })).toBe('gone');
    expect(tabHealthAfter(undefined, { kind: 'render-process-gone', reason: 'oom' })).toBe('gone');
  });

  it('a main-frame load failure is failed; a sub-frame or an aborted one changes nothing', () => {
    expect(tabHealthAfter(undefined, { kind: 'did-fail-load', errorCode: -105, isMainFrame: true })).toBe('failed');
    expect(tabHealthAfter(undefined, { kind: 'did-fail-load', errorCode: -105, isMainFrame: false })).toBeUndefined();
    expect(tabHealthAfter(undefined, { kind: 'did-fail-load', errorCode: -3, isMainFrame: true })).toBeUndefined();
    expect(tabHealthAfter('gone', { kind: 'did-fail-load', errorCode: -3, isMainFrame: true })).toBe('gone');
  });

  it('a finished load clears whatever was there', () => {
    expect(tabHealthAfter('gone', { kind: 'did-finish-load' })).toBeUndefined();
    expect(tabHealthAfter('failed', { kind: 'did-finish-load' })).toBeUndefined();
  });
});

describe('ownerForExit', () => {
  it('a crash is ours, an OOM kill is the environment, a clean exit is nobody', () => {
    expect(ownerForExit('crashed')).toBe('ours');
    expect(ownerForExit('launch-failed')).toBe('ours');
    expect(ownerForExit('oom')).toBe('environment');
    expect(ownerForExit('killed')).toBe('environment');
    expect(ownerForExit('clean-exit')).toBeUndefined();
  });
});
