import { describe, expect, it } from 'bun:test';
import { GIT_PILL_SHIPPED_DEFAULTS } from '@studio/events';
import { GIT_PILL_ACTIONABLE, GIT_PILL_STATES, isActionable, type GitPillState } from '@studio/git-ui';
import { pillStateOf } from '@studio/git-ui/derive';
import { PILL_FIXTURES } from '@studio/git-ui/fixtures';
import { MEASUREMENT_FIXTURES, row } from '@studio/git-ui/measurement-fixtures';
import { t } from '@studio/i18n';
import { pillCanSubmit } from '../topbar/EditorBarControls.js';
import { actionFor, drawsPill, isPressable, pickFor, promptKeyFor, tooltipFor } from './press.js';

const READY_OPEN = PILL_FIXTURES['ready-to-merge'] as Extract<GitPillState, { id: 'ready-to-merge' }>;
const READY_MERGE: Extract<GitPillState, { id: 'ready-to-merge' }> = { ...READY_OPEN, dropdownDefault: 'merge' };

it('shows a history-free project without offering to install Git', () => {
  const historyFree = row(MEASUREMENT_FIXTURES['no-git']);
  expect(drawsPill(historyFree)).toBe(true);
  expect(tooltipFor(historyFree)).toEqual([t('gitStatus.tooltip.no-git')]);
  expect(actionFor({ id: 'no-git' }, true)).toEqual({ kind: 'none' });
  expect(drawsPill(row(MEASUREMENT_FIXTURES['first-paint']))).toBe(false);
});

describe('actionFor', () => {
  it('opens the browser on Ready to Merge / Open in browser, ignoring canSubmit', () => {
    expect(actionFor(READY_OPEN, false)).toEqual({ kind: 'open-browser', url: READY_OPEN.pr.url });
    expect(actionFor(READY_OPEN, true)).toEqual({ kind: 'open-browser', url: READY_OPEN.pr.url });
  });

  it('sends the merge prompt on Ready to Merge / Merge when a turn can be submitted', () => {
    expect(actionFor(READY_MERGE, true)).toEqual({ kind: 'send', action: 'ready-to-merge', key: 'gitStatus.prompt.merge' });
  });

  it('sends nothing on Ready to Merge / Merge without a session that takes prompts', () => {
    expect(actionFor(READY_MERGE, false)).toEqual({ kind: 'none' });
  });

  it('every actionable state sends its prompt when submittable', () => {
    for (const id of GIT_PILL_ACTIONABLE) {
      const state = id === 'ready-to-merge' ? READY_MERGE : PILL_FIXTURES[id];
      const key = promptKeyFor(state);
      expect(key, id).toBeDefined();
      expect(actionFor(state, true), id).toEqual({ kind: 'send', action: id, key: key! });
    }
  });

  it('readouts never act, submittable or not', () => {
    for (const id of GIT_PILL_STATES) {
      if (isActionable(id)) continue;
      expect(actionFor(PILL_FIXTURES[id], true), id).toEqual({ kind: 'none' });
      expect(actionFor(PILL_FIXTURES[id], false), id).toEqual({ kind: 'none' });
    }
  });

  it('on the shipped defaults, a press on Ready to Merge opens the browser and never merges', () => {
    const state = pillStateOf(row(MEASUREMENT_FIXTURES['ready-to-merge']), GIT_PILL_SHIPPED_DEFAULTS, false);
    expect(actionFor(state, true).kind).toBe('open-browser');
  });
});

describe('pickFor', () => {
  it('opens the browser for Open in browser on Ready to Merge, ignoring canSubmit', () => {
    expect(pickFor(READY_OPEN, 'open-in-browser', false)).toEqual({ kind: 'open-browser', url: READY_OPEN.pr.url });
    expect(pickFor(READY_MERGE, 'open-in-browser', true)).toEqual({ kind: 'open-browser', url: READY_MERGE.pr.url });
  });

  it('Open in browser off Ready to Merge does nothing', () => {
    expect(pickFor(PILL_FIXTURES['create-pr'], 'open-in-browser', true)).toEqual({ kind: 'none' });
  });

  it('Create PR sends when submittable, nothing without a session', () => {
    expect(pickFor(PILL_FIXTURES['create-pr'], 'create-pr', true)).toEqual({
      kind: 'send',
      action: 'create-pr',
      key: 'gitStatus.prompt.create-pr',
    });
    expect(pickFor(PILL_FIXTURES['create-pr'], 'create-pr', false)).toEqual({ kind: 'none' });
  });

  it('Push sends when submittable', () => {
    expect(pickFor(PILL_FIXTURES.push, 'push', true)).toEqual({ kind: 'send', action: 'push', key: 'gitStatus.prompt.push' });
  });

  it('Merge picked on Ready to Merge sends when submittable', () => {
    expect(pickFor(READY_OPEN, 'merge', true)).toEqual({ kind: 'send', action: 'merge', key: 'gitStatus.prompt.merge' });
  });
});

describe('pillCanSubmit', () => {
  it('is the composer question (ONL-2379)', () => {
    expect(pillCanSubmit({ hasSession: true, connection: { status: 'ok' } })).toBe(true);
    expect(pillCanSubmit({ hasSession: false, connection: { status: 'ok' } })).toBe(false);
    expect(pillCanSubmit({ hasSession: true, connection: { status: 'unauthenticated' } })).toBe(false);
  });
});

describe('the chrome view\'s pill', () => {
  it('draws nothing for a row measured without git, and draws a row measured with git or not measured yet', () => {
    expect(drawsPill(row(MEASUREMENT_FIXTURES['first-paint']))).toBe(false);
    expect(drawsPill(row(MEASUREMENT_FIXTURES['create-pr']))).toBe(true);
    expect(drawsPill(undefined)).toBe(true);
  });

  it('presses only with a session that takes prompts', () => {
    expect(isPressable(PILL_FIXTURES['create-pr'], false)).toBe(false);
    expect(isPressable(PILL_FIXTURES['create-pr'], true)).toBe(true);
  });

  it('keeps Open in browser pressable with no session at all', () => {
    expect(isPressable(READY_OPEN, false)).toBe(true);
  });

  it('every actionable state presses while a turn runs, because the pen holds it (ONL-2379)', () => {
    for (const id of GIT_PILL_ACTIONABLE) {
      const state = id === 'ready-to-merge' ? READY_MERGE : PILL_FIXTURES[id];
      expect(isPressable(state, true), id).toBe(true);
    }
  });


  it('the hover line reads the branch and the counts from the row, and is absent without git or a row', () => {
    const lines = tooltipFor(row(MEASUREMENT_FIXTURES['fix-checks']));
    expect(lines?.[0]).toBe('feat/pricing-v2');
    expect(lines?.[1]).toBe(t('gitStatus.tooltip.aheadBehind', { ahead: 0, behind: 2 }));
    expect(tooltipFor(row(MEASUREMENT_FIXTURES['first-paint']))).toBeUndefined();
    expect(tooltipFor(undefined)).toBeUndefined();
  });
});
