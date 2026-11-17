import { describe, expect, it } from 'bun:test';
import { railStatusFor } from './EditorBarControls.js';

const CLOSED = { isRightRailHidden: true, isTurnRunning: false, needsAttention: false };

describe('the status the band publishes for the chat-panel toggle (ONL-2455)', () => {
  it('is working while a turn runs behind the closed panel', () => {
    expect(railStatusFor({ ...CLOSED, isTurnRunning: true })).toBe('working');
  });

  it('is waiting while a request is parked, and waiting outranks a running turn', () => {
    expect(railStatusFor({ ...CLOSED, needsAttention: true })).toBe('waiting');
    expect(railStatusFor({ ...CLOSED, isTurnRunning: true, needsAttention: true })).toBe('waiting');
  });

  it('is nothing while the panel is open, whatever the session is doing', () => {
    for (const isTurnRunning of [false, true]) {
      for (const needsAttention of [false, true]) {
        expect(
          railStatusFor({ isRightRailHidden: false, isTurnRunning, needsAttention }),
          `${String(isTurnRunning)}/${String(needsAttention)}`,
        ).toBeUndefined();
      }
    }
  });

  it('is nothing on an idle session behind the closed panel', () => {
    expect(railStatusFor(CLOSED)).toBeUndefined();
  });

  it('never says done: any end of streaming publishes it, so the one signal a closed panel leaves would call a dead turn finished', () => {
    for (const isRightRailHidden of [false, true]) {
      for (const isTurnRunning of [false, true]) {
        for (const needsAttention of [false, true]) {
          expect(railStatusFor({ isRightRailHidden, isTurnRunning, needsAttention })).not.toBe('done');
        }
      }
    }
  });
});
