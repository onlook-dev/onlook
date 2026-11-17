import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { resetTipBeats, startTipBeat, useTipBeatStore } from '../sidebar/footStore.js';
import { clearTipRecords } from './early.js';
import { arriveAtProject, claimTipMoment, endTipMoment, leaveProject, momentAllows, momentGate, OPEN_MOMENT, resetTipMoments, useTipMomentStore } from './moment.js';

const GAP = 1_000;
const moment = (path: string) => useTipMomentStore.getState().moments[path];

beforeEach(() => {
  resetTipMoments();
  resetTipBeats();
});
afterAll(resetTipBeats);

describe('a tip moment opens each time a person sits down to a project (ONL-2960)', () => {
  it('opens on a project the launch has not shown yet', () => {
    arriveAtProject('/a', 100, GAP);
    expect(moment('/a')).toStrictEqual({ openedAt: 100, seenAt: 100, claim: null, isOver: false });
  });

  it('carries on when the person switches away and back within the gap', () => {
    arriveAtProject('/a', 100, GAP);
    claimTipMoment('/a', 'onboarding', 150);
    leaveProject('/a', 200);
    arriveAtProject('/b', 200, GAP);
    leaveProject('/b', 300);
    arriveAtProject('/a', 300 + GAP - 101, GAP);
    expect(moment('/a')).toMatchObject({ openedAt: 100, claim: 'onboarding' });
  });

  it('opens afresh when the person comes back after the gap', () => {
    arriveAtProject('/a', 100, GAP);
    claimTipMoment('/a', 'feature', 150);
    endTipMoment('/a', 160);
    leaveProject('/a', 200);
    arriveAtProject('/a', 200 + GAP, GAP);
    expect(moment('/a')).toStrictEqual({ openedAt: 200 + GAP, seenAt: 200 + GAP, claim: null, isOver: false });
  });

  it('runs the opening beat again in a new moment, and not in one that carries on', () => {
    arriveAtProject('/a', 100, GAP);
    useTipBeatStore.setState({ over: { '/a': true } });
    arriveAtProject('/a', 500, GAP);
    expect(useTipBeatStore.getState().over['/a']).toBe(true);
    arriveAtProject('/a', 500 + GAP, GAP);
    expect(useTipBeatStore.getState().over['/a']).toBeUndefined();
    startTipBeat('/a', 60_000);
    expect(useTipBeatStore.getState().over['/a']).toBeUndefined();
  });

  it('is claimed by the first tip on screen and keeps that claim', () => {
    arriveAtProject('/a', 100, GAP);
    claimTipMoment('/a', 'onboarding', 110);
    claimTipMoment('/a', 'feature', 120);
    expect(moment('/a')?.claim).toBe('onboarding');
  });

  it('is forgotten by Reset tips', () => {
    arriveAtProject('/a', 100, GAP);
    endTipMoment('/a', 110);
    clearTipRecords();
    expect(moment('/a')).toBeUndefined();
  });
});

describe('what a moment lets first appear (ONL-2960)', () => {
  it('lets either kind claim an open moment', () => {
    expect(momentAllows(OPEN_MOMENT, 'onboarding')).toBe(true);
    expect(momentAllows(OPEN_MOMENT, 'feature')).toBe(true);
  });

  it('keeps feature tips out of an onboarding moment, and onboarding tips out of a feature moment', () => {
    expect(momentAllows({ ...OPEN_MOMENT, claim: 'onboarding' }, 'onboarding')).toBe(true);
    expect(momentAllows({ ...OPEN_MOMENT, claim: 'onboarding' }, 'feature')).toBe(false);
    expect(momentAllows({ ...OPEN_MOMENT, claim: 'feature' }, 'onboarding')).toBe(false);
  });

  it('lets nothing appear once Not now ended the moment', () => {
    arriveAtProject('/a', 100, GAP);
    endTipMoment('/a', 110);
    const gate = momentGate(moment('/a'), false);
    expect(momentAllows(gate, 'onboarding')).toBe(false);
    expect(momentAllows(gate, 'feature')).toBe(false);
  });

  it('treats every moment as onboarding under the dev override', () => {
    const gate = momentGate(undefined, true);
    expect(momentAllows(gate, 'onboarding')).toBe(true);
    expect(momentAllows(gate, 'feature')).toBe(false);
  });
});
