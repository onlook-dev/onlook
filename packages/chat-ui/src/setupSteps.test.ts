import { describe, expect, it } from 'bun:test';
import type { ProjectSetupSnapshot, ToolCallView, TranscriptItem } from '@studio/events';
import { placeSetupSteps, shownCalls } from './setupSteps.js';

let seq = 0;
function call(name: string, extra: Partial<ToolCallView> = {}): ToolCallView {
  seq += 1;
  return { toolCallId: `c${String(seq)}`, name, kind: 'other', title: name, status: 'completed', displayStatus: 'completed', startedAt: 0, ...extra };
}
const studio = (name: string, extra: Partial<ToolCallView> = {}): ToolCallView => call(`mcp__studio__${name}`, extra);
const user = (id: string, text: string, origin?: 'studio'): TranscriptItem => ({ kind: 'user', id, text, ...(origin ? { origin } : {}) });
const tools = (id: string, calls: ToolCallView[]): TranscriptItem => ({ kind: 'tools', id, calls });

const names = (calls: ToolCallView[]): string[] => calls.map((c) => c.name.replace('mcp__studio__', ''));

describe('where the setup checklist sits', () => {
  it('sits under the Studio prompt from the moment it is sent, its line running', () => {
    const placed = placeSetupSteps([user('u1', 'set up', 'studio')], true);
    expect(placed.cards.get('u1')?.steps[0]?.status).toBe('running');
    expect(placed.runningPromptId).toBe('u1');
  });

  it('claims every tools row of its turn', () => {
    const items = [user('u1', 'set up', 'studio'), tools('t1', [studio('get_project_setup')]), tools('t2', [call('Bash')])];
    const placed = placeSetupSteps(items, true);
    expect([...placed.cards.keys()]).toEqual(['u1']);
    expect([...placed.setupTurnItems]).toEqual(['t1', 't2']);
  });

  it('ends the running line with the turn', () => {
    expect(placeSetupSteps([user('u1', 'set up', 'studio')], false).runningPromptId).toBeUndefined();
    expect(placeSetupSteps([user('u1', 'set up', 'studio'), user('u2', 'make it teal')], true).runningPromptId).toBeUndefined();
  });

  it('keeps the line running and the card live through a message sent into the setup turn (ONL-2961)', () => {
    const running: ProjectSetupSnapshot = { saved: null, verified: null, state: 'running', failure: null };
    const items: TranscriptItem[] = [
      user('u1', 'set up', 'studio'),
      tools('t1', [studio('run_project_setup', { status: 'in_progress' })]),
      { kind: 'user', id: 'u2', text: 'make it teal', joinsTurn: true },
    ];
    const placed = placeSetupSteps(items, true, { snapshot: running, livePorts: [] });
    expect(placed.runningPromptId).toBe('u1');
    expect([...placed.cards.keys()]).toEqual(['u1']);
    expect(placed.cards.get('u1')?.outcome).toBe('done');
  });

  it('hands the live machine only to the last turn while it streams', () => {
    const running: ProjectSetupSnapshot = { saved: null, verified: null, state: 'running', failure: null };
    const items = [user('u1', 'set up', 'studio'), tools('t1', [studio('run_project_setup', { status: 'in_progress' })])];
    expect(placeSetupSteps(items, true, { snapshot: running, livePorts: [] }).cards.get('u1')?.outcome).toBe('done');
    expect(placeSetupSteps(items, false, { snapshot: running, livePorts: [] }).cards.get('u1')?.outcome).toBe('incomplete');
    const later = [...items, user('u2', 'make it teal')];
    expect(placeSetupSteps(later, true, { snapshot: running, livePorts: [] }).cards.get('u1')?.outcome).toBe('incomplete');
  });
});

describe('which checklist waits on the canvas', () => {
  const running: ProjectSetupSnapshot = { saved: null, verified: null, state: 'running', failure: null };
  const ranOk = (): ToolCallView => studio('run_project_setup', { result: JSON.stringify({ ok: true, snapshot: running }) });
  const items: TranscriptItem[] = [
    user('u1', 'set up', 'studio'),
    tools('t1', [ranOk()]),
    user('u2', 'start the app', 'studio'),
    tools('t2', [ranOk()]),
  ];

  it('leaves an earlier ended setup turn done while no Frame is live', () => {
    expect(placeSetupSteps(items, false, undefined, { liveFramePorts: [] }).cards.get('u1')?.outcome).toBe('done');
  });

  it('keeps the latest ended turn waiting on its Frame only while the import still waits', () => {
    expect(placeSetupSteps(items, false, undefined, { liveFramePorts: [] }).cards.get('u2')?.outcome).toBe('done');
    expect(placeSetupSteps(items, false, undefined, { liveFramePorts: [], latestWaits: true }).cards.get('u2')?.outcome).toBe('incomplete');
  });
});

describe('which rows the checklist stands in for', () => {
  const setupMachine = ['get_project_setup', 'save_project_setup', 'run_project_setup'].map((name) => studio(name));

  it('hides exactly the three setup-machine rows in a setup turn', () => {
    const others = [call('Read'), call('Bash'), call('Edit'), studio('server_running')];
    expect(names(shownCalls([...setupMachine, ...others], true))).toEqual(['Read', 'Bash', 'Edit', 'server_running']);
  });

  it('never hides a call waiting on the person', () => {
    const asking = studio('run_project_setup', { permission: { requestId: 'r', options: [] } });
    expect(shownCalls([asking], true)).toEqual([asking]);
  });

  it('hides an answered approval once it is stale', () => {
    const answered = studio('run_project_setup', { permission: { requestId: 'r', options: [], stale: true } });
    expect(shownCalls([answered], true)).toEqual([]);
  });

  it('hides nothing outside a setup turn', () => {
    expect(names(shownCalls(setupMachine, false))).toEqual(['get_project_setup', 'save_project_setup', 'run_project_setup']);
  });
});
