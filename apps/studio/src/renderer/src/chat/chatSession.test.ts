import '../testing/dom.js';
import { afterEach, describe, expect, test } from 'bun:test';
import type { AgentCommandAcceptance, ChatFileRef, ComposerDraft, ElementEvidence, PenTake, ProviderNotice, RetryPrompt, SkillAttachment, StudioBridge, TranscriptItem } from '@studio/events';
import { deferred, installBridge } from '../testing/bridge.js';
import type { ManualComposerDraft } from './agentSwitch.js';
import { createChatSession, INITIAL_CHAT_SESSION, type ChatSession, type ChatSessionState, type DraftSurfaces, type PenSurfaces, type SendSurfaces, type SwitchSurfaces } from './chatSession.js';
import type { AssembledPrompt, PromptSubmitResult } from './submitPrompt.js';

const file: ChatFileRef = { kind: 'file', id: 'file-1', mediaType: 'text/plain', name: 'notes.txt', originalSize: 5 };
const skill: SkillAttachment = { kind: 'skill', name: 'design', description: 'Design', agent: 'claude', path: '/skills/design/SKILL.md' };
const element = (id: string): ElementEvidence => ({ kind: 'element', id, tag: 'h1', domPath: 'h1', outerHtmlSnippet: '<h1/>', textContent: '', classes: [], frameUrl: 'http://localhost:3000/' });
const submitted = (patch: Partial<AssembledPrompt> = {}): AssembledPrompt => ({ text: 'sent', attachments: [], context: '', images: [], evidence: [], ...patch });

/** A session with every commit it made and everything it did outside itself, in order. */
function open(): { chat: ChatSession; commits: ChatSessionState[]; now: () => ChatSessionState; did: string[] } {
  const commits: ChatSessionState[] = [];
  const chat = createChatSession((state) => commits.push(state));
  return { chat, commits, now: () => commits.at(-1) ?? INITIAL_CHAT_SESSION, did: [] };
}

const edits = (did: string[]) => ({
  recall: { end: (why: string) => { did.push(`recall.end ${why}`); }, clearMissing: () => { did.push('recall.clearMissing'); } },
  attachments: { dismissFailureOnKeystroke: () => { did.push('attachments.dismissFailureOnKeystroke'); } },
  skill: { onTextChange: (value: string) => { did.push(`skill.onTextChange ${value}`); } },
});

function sending(did: string[], submit: SendSurfaces['submit'], patch: Partial<SendSurfaces> = {}): SendSurfaces {
  return {
    unsupportedPdf: undefined,
    skill: { standing: 'present', selected: skill, setSelected: (next) => { did.push(`skill.setSelected ${String(typeof next === 'function' ? next(skill)?.name : next?.name)}`); }, onSendSettled: () => { did.push('skill.onSendSettled'); }, onSendFailed: () => { did.push('skill.onSendFailed'); } },
    attachments: { refs: () => [file], remove: (id) => { did.push(`attachments.remove ${id}`); }, dismissFailure: () => { did.push('attachments.dismissFailure'); } },
    recall: { artifacts: [], setArtifacts: () => { did.push('recall.setArtifacts'); }, clearMissing: () => { did.push('recall.clearMissing'); } },
    submit,
    canvas: {
      dismissGatherRefusal: () => { did.push('canvas.dismissGatherRefusal'); },
      setPicking: (isPicking) => { did.push(`canvas.setPicking ${String(isPicking)}`); },
      closeInlineChat: (evidence) => { did.push(`canvas.closeInlineChat ${evidence.map((item) => item.id).join()}`); },
      removeElement: (id) => { did.push(`canvas.removeElement ${id}`); },
    },
    ...patch,
  };
}

const drafts = (did: string[]): DraftSurfaces => ({
  focus: () => { did.push('focus'); },
  attachments: { restore: (refs) => { did.push(`attachments.restore ${refs.map((ref) => ref.id).join()}`); } },
  skill: { setSelected: (next) => { did.push(`skill.setSelected ${String(typeof next === 'function' ? 'fn' : next?.name)}`); } },
  recall: { setArtifacts: () => { did.push('recall.setArtifacts'); }, markSaved: (cwd) => { did.push(`recall.markSaved ${cwd}`); } },
});

const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 0));
const own = window.studio;
afterEach(() => { window.studio = own; });

describe('the composer', () => {
  test('a keystroke ends the walk first, takes the text, and retires the refused-send notice', async () => {
    const { chat, now, did } = open();
    await chat.send('x', sending(did, async () => ({ outcome: 'rejected' })));
    expect(now().sendRejected).toBe(true);
    did.length = 0;
    chat.edit('Hello', edits(did));
    expect(now()).toMatchObject({ composerValue: 'Hello', sendRejected: false });
    expect(did).toEqual(['recall.end edit', 'attachments.dismissFailureOnKeystroke', 'skill.onTextChange Hello', 'recall.clearMissing']);
  });

  test('a write that changes nothing commits nothing', () => {
    const { chat, commits, did } = open();
    chat.put('');
    chat.leave();
    chat.holdRecallDraft(undefined);
    expect(chat.watchNotice(undefined)).toBeUndefined();
    expect(commits).toEqual([]);
    chat.edit('a', edits(did));
    chat.edit('a', edits(did));
    expect(commits).toHaveLength(1);
  });

  test('text asked in from outside is focused first, and appended as its own paragraph', () => {
    const { chat, now, did } = open();
    chat.ask({ text: 'First', nonce: 1 }, () => { did.push(`focus over "${now().composerValue}"`); });
    chat.ask({ text: 'Second', append: true, nonce: 2 }, () => {});
    chat.ask({ nonce: 3 }, () => { did.push('focus alone'); });
    expect(now().composerValue).toBe('First\n\nSecond');
    expect(did).toEqual(['focus over ""', 'focus alone']);
  });
});

describe('send', () => {
  test('is `sending` from the submit to its answer, and a second submit meanwhile never runs', async () => {
    const { chat, commits, now } = open();
    const answer = deferred<PromptSubmitResult>();
    let runs = 0;
    const run = (inFlight: { current: boolean }): Promise<PromptSubmitResult> => {
      runs += 1;
      if (inFlight.current) return Promise.resolve({ outcome: 'in-flight' });
      inFlight.current = true;
      return answer.promise.finally(() => { inFlight.current = false; });
    };
    const first = chat.submit(run);
    expect(now().send).toBe('sending');
    expect(await chat.submit(run)).toEqual({ outcome: 'in-flight' });
    answer.settle({ outcome: 'empty' });
    await first;
    expect(commits.map((state) => state.send)).toEqual(['sending', 'idle']);
    expect(runs).toBe(2);
  });

  test('an accepted send clears exactly what went out, in order', async () => {
    const { chat, now, did } = open();
    chat.edit('Going out', edits([]));
    await chat.send('Going out', sending(did, async (request) => {
      did.push(`submit ${JSON.stringify([request.text, request.images?.length, request.skills?.length, request.answersQuestion])}`);
      return { outcome: 'accepted', held: false, submitted: submitted({ images: [file], skills: [skill], evidence: [element('el-1')] }) };
    }));
    expect(now()).toMatchObject({ composerValue: '', sendRejected: false });
    expect(did).toEqual([
      'skill.onSendSettled',
      'canvas.dismissGatherRefusal',
      'submit ["Going out",1,1,true]',
      'recall.clearMissing',
      'canvas.setPicking false',
      'canvas.closeInlineChat el-1',
      'attachments.remove file-1',
      'skill.setSelected undefined',
      'recall.setArtifacts',
      'canvas.removeElement el-1',
      'attachments.dismissFailure',
    ]);
  });

  test('text retyped while the send was in flight is kept: the revision moved, whatever the words', async () => {
    const { chat, now } = open();
    const answer = deferred<PromptSubmitResult>();
    chat.edit('Same', edits([]));
    const sent = chat.send('Same', sending([], () => answer.promise));
    chat.edit('Same', edits([]));
    answer.settle({ outcome: 'accepted', held: false, submitted: submitted() });
    await sent;
    expect(now().composerValue).toBe('Same');
  });

  test.each(['rejected', 'failed'] as const)('a %s send keeps the draft and says so; an empty or in-flight one says nothing', async (outcome) => {
    const { chat, now, did } = open();
    chat.edit('Keep', edits([]));
    await chat.send('Keep', sending(did, async () => ({ outcome })));
    expect(now()).toMatchObject({ composerValue: 'Keep', sendRejected: true });
    expect(did).toEqual(['skill.onSendSettled', 'canvas.dismissGatherRefusal', 'skill.onSendFailed']);
    await chat.send('Keep', sending([], async () => ({ outcome: 'in-flight' })));
    expect(now().sendRejected).toBe(false);
  });

  test('an unsupported PDF or a skill that is gone stops the send before anything is touched', async () => {
    const { chat, now, did } = open();
    const never = async (): Promise<PromptSubmitResult> => { throw new Error('must not submit'); };
    await chat.send('x', sending(did, never, { unsupportedPdf: 'brief.pdf' }));
    expect(now().sendRejected).toBe(false);
    await chat.send('x', sending(did, never, { skill: { ...sending(did, never).skill, standing: 'gone' } }));
    expect(now().sendRejected).toBe(true);
    expect(did).toEqual([]);
  });

  test('a held send keeps its picks until the waiting prompt leaves; the next delivered send takes them too', async () => {
    const { chat, did } = open();
    await chat.send('a', sending(did, async () => ({ outcome: 'accepted', held: true, submitted: submitted({ evidence: [element('held-1')] }) })));
    expect(did.filter((line) => line.startsWith('canvas.removeElement'))).toEqual([]);
    await chat.send('b', sending(did, async () => ({ outcome: 'accepted', held: false, submitted: submitted({ evidence: [element('now-1')] }) })));
    expect(did.filter((line) => line.startsWith('canvas.removeElement'))).toEqual(['canvas.removeElement held-1', 'canvas.removeElement now-1']);
    const dropped: string[] = [];
    chat.dropHeldPicks((id) => dropped.push(id));
    expect(dropped).toEqual([]);
  });
});

describe('draft restore', () => {
  const stored: ComposerDraft = { text: 'Stored', images: [file], skills: [skill] };
  const bridge = (draftState: StudioBridge['draftState']): void => installBridge({ draftState, artifactRead: async () => null as never });

  test('lands focus first, then the text, the chips, the skill and the mark, and only then is restored', async () => {
    const { chat, commits, did } = open();
    bridge(async () => stored);
    chat.land('/project', { text: '' }, drafts(did));
    expect(commits).toEqual([]);
    await settle();
    expect(did).toEqual(['focus', 'attachments.restore file-1', 'skill.setSelected design', 'recall.setArtifacts', 'recall.markSaved /project']);
    expect(commits.map((state) => [state.composerValue, state.restoredFor])).toEqual([['Stored', undefined], ['Stored', '/project']]);
  });

  test('a composer that held text as the project landed keeps it', async () => {
    const { chat, now, did } = open();
    bridge(async () => stored);
    chat.land('/project', { text: 'Already here' }, drafts(did));
    await settle();
    expect(now().composerValue).toBe('');
    expect(did).not.toContain('focus');
    expect(did).toContain('skill.setSelected design');
  });

  test('a keystroke before the answer wins the text and the skill; the chips and the mark still land', async () => {
    const { chat, now, did } = open();
    const answer = deferred<ComposerDraft>();
    bridge(() => answer.promise);
    chat.land('/project', { text: '' }, drafts(did));
    chat.edit('Typed', edits([]));
    answer.settle(stored);
    await settle();
    expect(now()).toMatchObject({ composerValue: 'Typed', restoredFor: '/project' });
    expect(did).toEqual(['attachments.restore file-1', 'recall.setArtifacts', 'recall.markSaved /project']);
  });

  test('a released read restores nothing, and neither does one a newer landing overtook', async () => {
    const { chat, now, did } = open();
    const first = deferred<ComposerDraft>();
    bridge(({ cwd }) => cwd === '/first' ? first.promise : Promise.resolve({ text: 'Second', images: [] }));
    const release = chat.land('/first', { text: '' }, drafts(did));
    release();
    chat.land('/second', { text: '' }, drafts(did));
    await settle();
    expect(now()).toMatchObject({ composerValue: 'Second', restoredFor: '/second' });
    did.length = 0;
    first.settle(stored);
    await settle();
    expect(did).toEqual([]);
    expect(now()).toMatchObject({ composerValue: 'Second', restoredFor: '/second' });
  });

  test('a refused read lands as an empty draft', async () => {
    const { chat, now, did } = open();
    bridge(async () => { throw new Error('refused'); });
    chat.land('/project', { text: '' }, drafts(did));
    await settle();
    expect(now()).toMatchObject({ composerValue: '', restoredFor: '/project' });
    expect(did).toEqual(['skill.setSelected undefined', 'recall.setArtifacts', 'recall.markSaved /project']);
  });
});

describe('agent switch', () => {
  const manualDraft: ManualComposerDraft = { prompt: { text: 'My draft' }, elements: [], selectedNodeIds: ['frame-a'], artifacts: [] };
  function asking(did: string[], answer: Promise<AgentCommandAcceptance>, patch: Partial<SwitchSurfaces> = {}): SwitchSurfaces {
    return {
      facts: { current: { workspacePath: '/project', busy: false } },
      manualDraft: { current: manualDraft },
      command: (harness, source) => { did.push(`command ${harness} ${source}`); return answer; },
      announcedSessionId: 'chat-1',
      workspacePath: '/project',
      openSetup: (harness) => { did.push(`openSetup ${harness}`); },
      refused: () => { did.push('refused'); },
      ...patch,
    };
  }
  const recall = (did: string[], chat: ChatSession) => ({
    restore: (prompt: RetryPrompt, isDraft: boolean) => { did.push(`recall.restore ${prompt.text} ${String(isDraft)}`); },
    restoreDraft: (prompt: RetryPrompt) => { did.push(`recall.restoreDraft ${prompt.text} with ${JSON.stringify(chat.recalled(prompt, true)?.selectedNodeIds)}`); },
  });
  const arrived = { announcedSessionId: 'chat-2', workspacePath: '/project', harnessId: 'codex' as const };

  test('request, then restore once the new chat is announced, then idle when the refill has settled', async () => {
    const { chat, commits, now, did } = open();
    chat.switchTo('codex', true, undefined, true, asking(did, Promise.resolve({ accepted: true })));
    expect(now().switch).toBe('request');
    expect(await chat.submit(async () => { throw new Error('must not send'); })).toEqual({ outcome: 'in-flight' });
    await settle();
    const pending = now().pendingRefill;
    expect(pending).toMatchObject({ fromSessionId: 'chat-1', workspacePath: '/project', harness: 'codex', refill: { kind: 'manual' } });
    // The old chat is still the one announced: nothing is due yet.
    chat.refill(pending, { ...arrived, announcedSessionId: 'chat-1' }, recall(did, chat));
    expect(now().switch).toBe('request');
    chat.refill(pending, arrived, recall(did, chat));
    expect(now()).toMatchObject({ switch: 'restore', pendingRefill: undefined });
    chat.settleSwitch('restore', true);
    expect(now().switch).toBe('restore');
    chat.settleSwitch('restore', false);
    expect(now().switch).toBe('idle');
    expect(did).toEqual(['command codex menu', 'recall.restoreDraft My draft with ["frame-a"]']);
    expect(chat.recalled({ text: 'later' }, true)).toBeUndefined();
    expect(commits.map((state) => state.switch).filter((phase, index, all) => phase !== all[index - 1])).toEqual(['request', 'restore', 'idle']);
    expect(await chat.submit(async () => ({ outcome: 'empty' }))).toEqual({ outcome: 'empty' });
  });

  test('a manual switch carries the draft last rendered while main was asked', async () => {
    const { chat, now, did } = open();
    const answer = deferred<AgentCommandAcceptance>();
    chat.switchTo('codex', true, undefined, true, asking(did, answer.promise));
    const latest: ManualComposerDraft = { ...manualDraft, prompt: { text: 'My latest draft' } };
    chat.followDraft('request', latest);
    chat.followDraft('idle', { ...manualDraft, prompt: { text: 'Not while idle' } });
    answer.settle({ accepted: true });
    await settle();
    chat.refill(now().pendingRefill, arrived, recall(did, chat));
    expect(did).toEqual(['command codex menu', 'recall.restoreDraft My latest draft with ["frame-a"]']);
  });

  test('a failed prompt is restored as a recalled one, never as the draft', async () => {
    const { chat, now, did } = open();
    chat.switchTo('codex', true, { text: 'Failed prompt', context: 'old' }, false, asking(did, Promise.resolve({ accepted: true })));
    chat.followDraft('request', manualDraft);
    await settle();
    chat.refill(now().pendingRefill, arrived, recall(did, chat));
    expect(did).toEqual(['command codex failure', 'recall.restore Failed prompt false']);
  });

  test.each(['refused', 'rejected'] as const)('a %s switch goes back to idle and says so once', async (outcome) => {
    const { chat, now, did } = open();
    chat.switchTo('codex', true, undefined, true, asking(did, outcome === 'refused' ? Promise.resolve({ accepted: false }) : Promise.reject(new Error('offline'))));
    await settle();
    expect(now()).toMatchObject({ switch: 'idle', pendingRefill: undefined });
    expect(did).toEqual(['command codex menu', 'refused']);
  });

  test('a second ask, an ask while busy, and an agent that is not ready ask main nothing', () => {
    const { chat, now, did } = open();
    chat.switchTo('codex', true, undefined, true, asking(did, new Promise(() => {}), { facts: { current: { workspacePath: '/project', busy: true } } }));
    chat.switchTo('codex', false, undefined, true, asking(did, new Promise(() => {})));
    expect(now().switch).toBe('idle');
    chat.switchTo('codex', true, undefined, true, asking(did, new Promise(() => {})));
    chat.switchTo('claude', true, undefined, true, asking(did, new Promise(() => {})));
    chat.switchTo('claude', false, undefined, true, asking(did, new Promise(() => {})));
    expect(did).toEqual(['openSetup codex', 'command codex menu']);
  });

  test.each(['accepted', 'refused', 'rejected'] as const)('after the project changed, a late %s answer holds nothing and says nothing', async (outcome) => {
    const { chat, now, did } = open();
    const answer = deferred<AgentCommandAcceptance>();
    chat.switchTo('codex', true, undefined, true, asking(did, answer.promise));
    chat.leave();
    expect(now().switch).toBe('idle');
    if (outcome === 'rejected') answer.refuse(new Error('late'));
    else answer.settle({ accepted: outcome === 'accepted' });
    await settle();
    expect(now()).toMatchObject({ switch: 'idle', pendingRefill: undefined });
    expect(did).toEqual(['command codex menu']);
  });

  test('a refill held for the project the chat then left is dropped with it', async () => {
    const { chat, now, did } = open();
    chat.switchTo('codex', true, undefined, true, asking(did, Promise.resolve({ accepted: true })));
    await settle();
    expect(now().pendingRefill).toBeDefined();
    chat.leave();
    expect(now()).toMatchObject({ switch: 'idle', pendingRefill: undefined });
  });

  test('an answer for an abandoned run never ends the run that replaced it', async () => {
    const { chat, now, did } = open();
    const first = deferred<AgentCommandAcceptance>();
    chat.switchTo('codex', true, undefined, true, asking(did, first.promise));
    chat.leave();
    chat.switchTo('codex', true, undefined, true, asking(did, new Promise(() => {})));
    first.settle({ accepted: false });
    await settle();
    expect(now().switch).toBe('request');
    expect(did).toEqual(['command codex menu', 'command codex menu']);
    first.refuse(new Error('already settled'));
  });

  test('an accepted answer is not held for a project the chat has left without a reset', async () => {
    const { chat, now, did } = open();
    const facts = { current: { workspacePath: '/project' as string | undefined, busy: false } };
    chat.switchTo('codex', true, undefined, true, asking(did, Promise.resolve({ accepted: true }), { facts }));
    facts.current = { workspacePath: '/other', busy: false };
    await settle();
    expect(now().pendingRefill).toBeUndefined();
  });
});

describe('recall', () => {
  test('a step back to the draft returns the snapshot taken as the walk began; any other step returns none', () => {
    const { chat, now } = open();
    const snapshot = { elements: [], selectedNodeIds: ['frame-a'], artifacts: [] };
    chat.holdRecallDraft(snapshot);
    expect(chat.recalled({ text: 'Earlier' }, false)).toBeUndefined();
    expect(now().composerValue).toBe('Earlier');
    expect(chat.recalled({ text: 'Mine' }, true)).toBe(snapshot);
    chat.holdRecallDraft(undefined);
    expect(chat.recalled({ text: 'Mine' }, true)).toBeUndefined();
  });

  test('a recalled step is its writer’s text: a send answered afterwards does not clear it', async () => {
    const { chat, now } = open();
    const answer = deferred<PromptSubmitResult>();
    const sent = chat.send('x', sending([], () => answer.promise));
    chat.recalled({ text: 'Earlier' }, false);
    answer.settle({ outcome: 'accepted', held: false, submitted: submitted() });
    await sent;
    expect(now().composerValue).toBe('Earlier');
  });
});

describe('pen return', () => {
  const hold = { penId: 3, text: 'Waiting', verdict: 'hold' as const };
  const ready = { pen: hold, workspacePath: '/project', isDraftRestored: true, isSubmitInFlight: false, isComposerRecalling: false };
  function taking(did: string[], composer = { current: '' }): PenSurfaces {
    return {
      composer,
      workspace: { current: '/project' },
      focus: () => { did.push('focus'); },
      restoreImages: (refs) => { did.push(`restoreImages ${refs.map((ref) => ref.id).join()}`); },
      setSkill: (next) => { did.push(`setSkill ${String(typeof next === 'function' ? 'fn' : next?.name)}`); },
    };
  }
  const answers = (take: (command: { type: string; penId?: number; auto?: boolean }) => Promise<{ accepted: boolean; taken?: PenTake }>): void =>
    installBridge({ agentCommand: take as never });

  test('a held pen is returned once, and again only after it has gone', () => {
    const { chat } = open();
    const taken: number[] = [];
    const take = (penId: number): void => { taken.push(penId); };
    chat.returnPen({ ...ready, isDraftRestored: false }, take);
    chat.returnPen({ ...ready, isSubmitInFlight: true }, take);
    chat.returnPen({ ...ready, isComposerRecalling: true }, take);
    chat.returnPen({ ...ready, pen: { ...hold, verdict: 'send' } }, take);
    expect(taken).toEqual([]);
    chat.returnPen(ready, take);
    chat.returnPen(ready, take);
    expect(taken).toEqual([3]);
    chat.returnPen({ ...ready, pen: undefined }, take);
    chat.returnPen(ready, take);
    expect(taken).toEqual([3, 3]);
  });

  test('the take joins what was typed during the round trip, and only a press of Edit takes focus', async () => {
    const { chat, now, did } = open();
    const answer = deferred<{ accepted: boolean; taken?: PenTake }>();
    const asked: unknown[] = [];
    answers((command) => { asked.push(command); return answer.promise; });
    const composer = { current: '' };
    chat.takePen(3, 'pen', taking(did, composer));
    composer.current = 'Typed meanwhile';
    answer.settle({ accepted: true, taken: { text: 'Waiting', attachments: [file, skill] } });
    await settle();
    expect(asked).toEqual([{ type: 'pen.take', penId: 3, auto: true }]);
    expect(now().composerValue).toBe('Typed meanwhile\n\nWaiting');
    expect(did).toEqual(['restoreImages file-1', 'setSkill design']);
    answers(async () => ({ accepted: true, taken: { text: 'Edited' } }));
    chat.takePen(4, 'designer', taking(did));
    await settle();
    expect(did.slice(2)).toEqual(['focus', 'setSkill undefined']);
  });

  test('a take that answers with nothing writes nothing, forgets the receipt, and puts the held picks back', async () => {
    const { chat, commits, did } = open();
    await chat.send('a', sending([], async () => ({ outcome: 'accepted', held: true, submitted: submitted({ evidence: [element('held-1')] }) })));
    commits.length = 0;
    const taken: number[] = [];
    answers(async () => ({ accepted: false }));
    chat.returnPen(ready, (penId) => { taken.push(penId); chat.takePen(penId, 'pen', taking(did)); });
    // Forgotten for the round trip: the composer owns the picks from the take on.
    const during: string[] = [];
    chat.dropHeldPicks((id) => during.push(id));
    await settle();
    chat.returnPen(ready, (penId) => { taken.push(penId); });
    const after: string[] = [];
    chat.dropHeldPicks((id) => after.push(id));
    expect({ taken, during, after, did, commits }).toEqual({ taken: [3, 3], during: [], after: ['held-1'], did: [], commits: [] });
  });

  test('a take that lands is the writer of the text: a send answered afterwards does not clear it', async () => {
    const { chat, now, did } = open();
    const answer = deferred<PromptSubmitResult>();
    const sent = chat.send('x', sending([], () => answer.promise));
    answers(async () => ({ accepted: true, taken: { text: 'Waiting' } }));
    chat.takePen(3, 'pen', taking(did));
    await settle();
    answer.settle({ outcome: 'accepted', held: false, submitted: submitted() });
    await sent;
    expect(now().composerValue).toBe('Waiting');
  });
});

describe('notices', () => {
  const wait = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

  test('the provider notice’s clock moves at the crossing, at once when it has passed, and never after the watch is released', async () => {
    const { chat, commits, now } = open();
    const past = Date.now() - 1;
    expect(chat.watchNotice(past)).toBeUndefined();
    expect(now().noticeClock).toBe(past);
    const due = Date.now() + 40;
    const release = chat.watchNotice(due);
    expect(now().noticeClock).toBeUndefined();
    await wait(80);
    expect(now().noticeClock).toBe(due);
    const later = Date.now() + 40;
    chat.watchNotice(later)?.();
    const count = commits.length;
    await wait(80);
    expect(commits).toHaveLength(count);
    expect(now().noticeClock).toBeUndefined();
    release?.();
  });

  test('silence is reported once per turn, and again for the next turn', () => {
    const { chat } = open();
    const sent: unknown[] = [];
    installBridge({ telemetryEvent: (event) => { sent.push(event); } });
    const notice: ProviderNotice = { state: 'silent', text: 'Quiet', seconds: 30 };
    const turn = { sessionId: 's1', harnessId: 'claude' as const, turnStartedAt: 100, silentSince: Date.now() - 30_000 };
    const fields = (): { worktreePath: string } => ({ worktreePath: '/project' });
    chat.reportSilence(undefined, turn, fields);
    chat.reportSilence({ state: 'retrying', text: 'Retrying' }, turn, fields);
    chat.reportSilence(notice, turn, fields);
    chat.reportSilence(notice, turn, fields);
    chat.reportSilence(notice, { ...turn, turnStartedAt: 200 }, fields);
    expect(sent).toHaveLength(2);
    expect(sent[0]).toMatchObject({ event: 'agent_silence_shown', properties: { worktreePath: '/project', agent_session_id: 's1', harness: 'claude' } });
  });

  test('the silence count moves once a second until it is released', async () => {
    const { chat, now } = open();
    const release = chat.countSilence();
    await wait(1_100);
    expect(now().silenceTick).toBe(1);
    release();
    await wait(1_100);
    expect(now().silenceTick).toBe(1);
  });

  test('a limit card is reported the first time it is shown and never again', () => {
    const { chat } = open();
    const sent: unknown[] = [];
    installBridge({ telemetryEvent: (event) => { sent.push(event); } });
    const items = [{ kind: 'error', id: 'error-1', code: 'billing_error', message: 'Out of credits' }] as unknown as TranscriptItem[];
    const live = { sessionId: 's1', ids: new Set(['error-1']) };
    chat.reportLimits(items, 'claude', 's1', live);
    chat.reportLimits([...items], 'claude', 's1', live);
    chat.reportLimits(items, 'claude', 'another-chat', live);
    expect(sent).toEqual([{ event: 'rate_limit_card_shown', properties: { agent: 'claude', window_kind: 'credits' } }]);
  });

  test('the limit clock moves on window focus while a reset is ahead, and not once released', () => {
    const { chat, now } = open();
    expect(chat.watchLimits([])).toBeUndefined();
    const release = chat.watchLimits([{ resetsAt: Math.floor(Date.now() / 1_000) + 3_600 } as never]);
    expect(release).toBeDefined();
    window.dispatchEvent(new Event('focus'));
    expect(now().limitClock).toBe(1);
    release?.();
    window.dispatchEvent(new Event('focus'));
    expect(now().limitClock).toBe(1);
  });

  test('a dismissed notice stays dismissed, and a sign-in card is set aside for one turn', () => {
    const { chat, now } = open();
    chat.dismissNotice('error-1');
    chat.dismissNotice('error-2');
    expect([...now().dismissedNotices]).toEqual(['error-1', 'error-2']);
    expect(INITIAL_CHAT_SESSION.dismissedNotices.size).toBe(0);
    chat.setSignInAside('turn-1');
    expect(now().signInSetAsideTurn).toBe('turn-1');
  });
});
