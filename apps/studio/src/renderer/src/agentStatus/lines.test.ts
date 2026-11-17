import { describe, expect, it } from 'bun:test';
import type { FrameChange, TranscriptItem } from '@studio/events';
import { workingRowCopy } from '../chat/workingRow.js';
import {
  agentStatusReducer,
  INITIAL_AGENT_STATUS,
  isSetupTurnStart,
  isStatusListShown,
  collapsedCount,
  statusLines,
  statusSubject,
  type AgentStatusAction,
  type AgentStatusState,
  type StatusSubject,
} from './lines.js';

const NAMES: Record<string, string> = { fr_1: 'Home', fr_2: 'Pricing', fr_3: 'About', fr_4: 'Contact' };
const frameName = (id: string): StatusSubject | undefined => (NAMES[id] === undefined ? undefined : { name: NAMES[id], noun: 'browser' });
const frameOf = (line: { target: { kind: string; frameId?: string } }): string | undefined => line.target.frameId;

function run(...actions: AgentStatusAction[]): AgentStatusState {
  return actions.reduce(agentStatusReducer, INITIAL_AGENT_STATUS);
}

const start = (isSetupTurn = false): AgentStatusAction => ({ type: 'streaming', isStreaming: true, isSetupTurn });
const end: AgentStatusAction = { type: 'streaming', isStreaming: false, isSetupTurn: false };
const change = (frameId: string, what = 'headline'): FrameChange => ({ frameId, done: 'Rewrote', what });
const frames = (...frameIds: string[]): AgentStatusAction => ({ type: 'frames', frameIds, changes: frameIds.map((id) => change(id)) });
const marked = (frameIds: string[], changes: FrameChange[]): AgentStatusAction => ({ type: 'frames', frameIds, changes });

describe('statusLines', () => {
  it("a parked question says what it waits on in the agent's words, and keeps today's line when it gave none", () => {
    const asked = run(start(), { type: 'waitingOn', what: 'a font choice' });
    expect(statusLines(asked, 'question', frameName)[0]!.subject).toBe('a font choice');
    const silent = statusLines(run(start()), 'question', frameName)[0]!;
    expect(silent).toMatchObject({ state: 'needs-you', target: { kind: 'chat', place: 'question' } });
    expect(silent.subject).not.toBe('a font choice');
  });

  it("a block keeps today's line whatever the agent said it waits on", () => {
    const asked = run(start(), { type: 'waitingOn', what: 'a font choice' });
    expect(statusLines(asked, 'approval', frameName)[0]!.subject).not.toBe('a font choice');
  });

  it('the words for a question leave when the next turn starts', () => {
    expect(run(start(), { type: 'waitingOn', what: 'a font choice' }, end, start()).waitingOn).toBeUndefined();
  });

  it('a frame the agent added reads as added under its own name, with no count of the changes it then made to it', () => {
    const added: FrameChange = { kind: 'created', frameId: 'fr_2', done: 'Added' };
    const ended = run(start(), marked(['fr_1', 'fr_2'], [change('fr_1'), added, change('fr_2', 'palette'), change('fr_2', 'menu')]), end);
    const [newest, edited] = statusLines(ended, undefined, frameName);
    expect(newest).toMatchObject({ state: 'done', target: { kind: 'frame', frameId: 'fr_2' }, subject: 'Pricing' });
    expect(newest!.before).toContain('Added');
    expect(newest!.after).not.toContain('palette');
    expect(frameOf(edited!)).toBe('fr_1');
  });

  it('a line for an added object names its kind, unless its name already does', () => {
    expect(statusSubject({ kind: 'browser', name: 'Pricing' })).toEqual({ name: 'Pricing', noun: 'browser' });
    expect(statusSubject({ kind: 'artifact', name: '', title: 'Pricing', artifactId: 'a1' })).toEqual({ name: 'Pricing', noun: 'artifact' });
    expect(statusSubject({ kind: 'text', name: '', text: 'Hello there' })).toEqual({ name: 'Hello there', noun: 'text' });
    expect(statusSubject({ kind: 'browser', name: '' }).noun).toBeUndefined();
    expect(statusSubject({ kind: 'image', name: '' }).noun).toBeUndefined();
    const added = run(start(), marked(['fr_2'], [{ kind: 'created', frameId: 'fr_2', done: 'Built' }]), end);
    const [kinded] = statusLines(added, undefined, () => ({ name: 'Pricing', noun: 'browser' }));
    const [bare] = statusLines(added, undefined, () => ({ name: 'Pricing' }));
    expect(kinded!.subject).toBe('Pricing');
    expect(`${kinded!.before}${kinded!.after}`).not.toBe(`${bare!.before}${bare!.after}`);
  });

  it('a frame the agent marked without saying what it changes draws no line', () => {
    expect(statusLines(run(start(), marked(['fr_1'], []), end), undefined, frameName)).toEqual([]);
  });

  it("a line takes the finished verb and the thing from the agent's own words", () => {
    const ended = run(start(), marked(['fr_1'], [{ frameId: 'fr_1', done: 'Recolored', what: 'Order button' }]), end);
    const [line] = statusLines(ended, undefined, frameName);
    expect(line).toMatchObject({ state: 'done', target: { kind: 'frame', frameId: 'fr_1' } });
    expect(line!.subject.startsWith('Home')).toBe(true);
    expect(line!.subject.length).toBeGreaterThan('Home'.length);
    expect(line!.before).toContain('Recolored');
    expect(line!.after).toContain('Order button');
  });

  it('several changes to one frame read as one line naming the first, the same line one change draws', () => {
    const several = statusLines(run(start(), marked(['fr_1'], [change('fr_1', 'headline'), change('fr_1', 'menu'), change('fr_1', 'button')]), end), undefined, frameName);
    const one = statusLines(run(start(), marked(['fr_1'], [change('fr_1', 'headline')]), end), undefined, frameName);
    expect(several).toStrictEqual(one);
  });

  it("the words outlive the turn's end and leave when the next turn starts", () => {
    const ended = run(start(), frames('fr_1'), end, { type: 'frames', frameIds: [], changes: [] });
    expect(ended.changes).toHaveLength(1);
    expect(agentStatusReducer(ended, start()).changes).toEqual([]);
  });

  it('a turn that marked no frame leaves the list empty once it ends', () => {
    expect(statusLines(run(start(), end), undefined, frameName)).toEqual([]);
  });

  it('shows no line for work in progress, and each marked frame as done once the turn ends, newest first', () => {
    const running = run(start(), frames('fr_1'), frames('fr_1', 'fr_2'));
    expect(statusLines(running, undefined, frameName)).toEqual([]);
    const ended = agentStatusReducer(running, end);
    expect(statusLines(ended, undefined, frameName).map((l) => [l.state, frameOf(l)])).toEqual([
      ['done', 'fr_2'],
      ['done', 'fr_1'],
    ]);
  });

  it('a parked question shows its waiting line, linked to the chat, and no line for the frames still in progress', () => {
    const lines = statusLines(run(start(), frames('fr_1', 'fr_2', 'fr_3', 'fr_4')), 'question', frameName);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ state: 'needs-you', target: { kind: 'chat', place: 'question' } });
  });

  it('a waiting line leaves with the turn it parked', () => {
    expect(statusLines(run(start(), frames('fr_1'), end), 'question', frameName).map((l) => l.state)).toEqual(['done']);
  });

  it('a setup turn shows nothing in the list, while the chat row still holds its frames', () => {
    const setup = run(start(true), frames('fr_1'));
    expect(statusLines(setup, 'approval', frameName)).toEqual([]);
    expect(workingRowCopy(agentStatusReducer(setup, end), (id) => ({ name: id, link: id }))).toBeDefined();
  });

  it('the turn after setup shows its frames again', () => {
    expect(statusLines(run(start(true), frames('fr_1'), end, start(), frames('fr_2'), end), undefined, frameName).map(frameOf)).toEqual(['fr_2']);
  });

  it('a frame no longer on the canvas drops its line', () => {
    expect(statusLines(run(start(), frames('fr_1', 'fr_gone'), end), undefined, frameName).map(frameOf)).toEqual(['fr_1']);
  });

  it('no line opens on its subject', () => {
    const lines = [
      ...statusLines(run(start(), frames('fr_1')), 'question', frameName),
      ...statusLines(run(start(), frames('fr_1')), 'approval', frameName),
      ...statusLines(run(start(), frames('fr_1'), end), undefined, frameName),
    ];
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line.before.trim()).not.toBe('');
  });

  it('the collapsed count is the other lines, and a single line has none', () => {
    const three = statusLines(run(start(), frames('fr_1', 'fr_2', 'fr_3'), end), undefined, frameName);
    expect(collapsedCount(three)).toBe(2);
    expect(collapsedCount(three.slice(0, 1))).toBe(0);
    expect(collapsedCount([])).toBe(0);
  });

  it('a new chat clears the list', () => {
    expect(statusLines(run(start(), frames('fr_1'), end, { type: 'reset' }), undefined, frameName)).toEqual([]);
  });
});

describe('isStatusListShown', () => {
  const shown = { isEnabled: true, leftHidden: false, leftPanelView: 'designs' as const, codeEnabled: true };

  it('shows in the Sidebar’s designs view', () => {
    expect(isStatusListShown(shown)).toBe(true);
  });

  it('is not shown, so the chat keeps its row, when the Sidebar is hidden or another view holds the panel', () => {
    expect(isStatusListShown({ ...shown, leftHidden: true })).toBe(false);
    expect(isStatusListShown({ ...shown, leftPanelView: 'code' })).toBe(false);
    expect(isStatusListShown({ ...shown, leftPanelView: 'artifacts' })).toBe(false);
  });

  it('a stored code view with the code panel turned off still draws the Sidebar', () => {
    expect(isStatusListShown({ ...shown, leftPanelView: 'code', codeEnabled: false })).toBe(true);
  });

  it('the kill switch off keeps the chat’s row everywhere', () => {
    expect(isStatusListShown({ ...shown, isEnabled: false })).toBe(false);
  });
});

describe('isSetupTurnStart', () => {
  const user = (id: string, text: string, origin?: 'studio'): TranscriptItem => ({ kind: 'user', id, text, ...(origin ? { origin } : {}) });

  it('a turn opened by Studio’s setup prompt is a setup turn', () => {
    expect(isSetupTurnStart([user('u1', 'Set up this project', 'studio')])).toBe(true);
  });

  it('a person’s prompt after setup is not', () => {
    expect(isSetupTurnStart([user('u1', 'Set up this project', 'studio'), user('u2', 'Make the headline warmer')])).toBe(false);
  });

  it('the resume nudge is not', () => {
    expect(isSetupTurnStart([user('u1', 'continue', 'studio')])).toBe(false);
  });
});
