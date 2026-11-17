import '../testing/dom.js';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { act, useState, type ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import * as chatUi from '@studio/chat-ui';
import * as toastUi from '@astryxdesign/core/Toast';
import { emptyState, type CanvasDoc, type ChatFileRef, type ComposerDraft, type ElementEvidence, type SkillAttachment, type StudioBridge, type TranscriptItem } from '@studio/events';
import type { AgentSessionHandle } from './useAgentSession.js';
import { NO_LIVE_ERRORS } from './limitCopy.js';
import { deferred } from '../testing/bridge.js';
import { submitChatPrompt } from './submitRegistry.js';
import { useAgentSetupStore } from '../agent-setup/store.js';
import { useNextTasksOfferStore } from '../sidebar/footStore.js';
import { useSetupTurnStore } from '../create/setupProgress.js';

/** Everything the chat does that something outside it can see, in the order it happened. */
const trace: string[] = [];

mock.module('@astryxdesign/core/Toast', () => ({ ...toastUi, useToast: () => (toast: { body: string }) => { trace.push(`toast ${toast.body}`); } }));

if (document.fonts === undefined) Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } });
Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get: () => null });
const realFocus = HTMLElement.prototype.focus;
HTMLElement.prototype.focus = function focus(this: HTMLElement, ...args: []): void {
  if (this.getAttribute('role') === 'textbox') trace.push('focus composer');
  realFocus.apply(this, args);
};

const accepted = async () => ({ accepted: true }) as never;
const base: AgentSessionHandle = {
  state: emptyState,
  connection: { status: 'ok', harness: 'claude' } as AgentSessionHandle['connection'],
  liveErrors: NO_LIVE_ERRORS,
  sessionCwd: '/project',
  announcedSessionId: 'chat-1',
  send: accepted,
  interrupt: () => { trace.push('session.interrupt'); },
  dismissQuestion: () => Promise.resolve({ accepted: true }),
  resume: accepted,
  newChat: accepted,
  switchAgent: accepted,
  respond: accepted,
  startSession: () => {},
  setModel: accepted,
  setEffort: () => {},
  setPermissionMode: accepted,
};
let current = base;
let updateSession: (next: AgentSessionHandle) => void;
mock.module('./useAgentSession.js', () => ({ useAgentSession: () => {
  const [handle, setHandle] = useState(current);
  updateSession = (next) => { current = next; setHandle(next); };
  return handle;
} }));

let panel: chatUi.ChatPanelProps | undefined;
const RealChatPanel = chatUi.ChatPanel;
mock.module('@studio/chat-ui', () => ({
  ...chatUi,
  ChatPanel: (props: chatUi.ChatPanelProps) => {
    panel = props;
    return <RealChatPanel {...props} />;
  },
}));

type Answers = { [K in keyof StudioBridge]?: (...args: never[]) => unknown };
const QUIET = new Set(['attachmentBytes', 'artifactRead']);
function wire(answers: Answers): void {
  window.studio = new Proxy({}, {
    get: (_, name: string) => (...args: unknown[]) => {
      if (/^on[A-Z]/.test(name)) return () => {};
      if (!QUIET.has(name)) trace.push(`bridge ${name} ${name === 'telemetryEvent' ? (args[0] as { event: string }).event : JSON.stringify(args[0])}`);
      const answer = (answers as Record<string, ((...rest: unknown[]) => unknown) | undefined>)[name];
      if (answer === undefined) throw new Error(`this test did not wire window.studio.${name}`);
      return answer(...args);
    },
  }) as StudioBridge;
}

const file: ChatFileRef = { kind: 'file', id: 'stored-file', mediaType: 'text/plain', name: 'notes.txt', originalSize: 5 };
const skill: SkillAttachment = { kind: 'skill', name: 'design', description: 'Design', agent: 'claude', path: '/skills/design/SKILL.md' };
const evidence: ElementEvidence = { kind: 'element', id: 'el-1', tag: 'h1', domPath: 'h1:nth-of-type(1)', outerHtmlSnippet: '<h1>Header</h1>', textContent: 'Header', classes: ['hero'], frameUrl: 'http://localhost:3000/' };
const doc: CanvasDoc = {
  schemaVersion: 2, docId: 'session-test', revision: 1,
  pages: { page: { id: 'page', name: 'Page', order: 0 } },
  nodes: Object.fromEntries(['frame-a', 'frame-b'].map((id, order) => [id, { id, kind: 'browser' as const, pageId: 'page', name: id, x: order * 400, y: 0, width: 320, height: 240, order, content: { homeUrl: evidence.frameUrl } }])),
};
const EMPTY_DRAFT: ComposerDraft = { text: '', images: [] };
const bytes = async () => ({ bytes: new Uint8Array([1, 2, 3, 4, 5]), mediaType: 'text/plain' });

interface Mounted {
  container: HTMLElement;
  set: (patch: Partial<AgentSessionHandle>) => Promise<void>;
  state: (patch: Partial<AgentSessionHandle['state']>) => Promise<void>;
  type: (text: string) => Promise<void>;
}
let teardown: (() => Promise<void>) | undefined;

async function mount(options: { session?: Partial<AgentSessionHandle>; bridge?: Answers; canvas?: boolean } = {}): Promise<Mounted> {
  const { ChatRegion } = await import('./ChatRegion.js');
  const { useWorkspaceStore } = await import('../workspace/store.js');
  const { useCanvasStore } = await import('../canvas/store.js');
  const beforeWorkspace = useWorkspaceStore.getState();
  const beforeCanvas = useCanvasStore.getState();
  const beforeSetup = useAgentSetupStore.getState();
  const beforeBridge = window.studio;
  trace.length = 0;
  panel = undefined;
  current = { ...base, ...options.session };
  wire({ draftState: async () => EMPTY_DRAFT, draftSave: () => {}, telemetryEvent: () => {}, attachmentBytes: bytes, ...options.bridge });
  useWorkspaceStore.setState({ workspace: { workspacePath: '/project' } as never, session: { kind: 'none' } });
  if (options.canvas === true) {
    useCanvasStore.setState({ doc, currentPageId: 'page', selectedNodeIds: [], elementSelections: [], nodes: [], mode: 'design', leftPanelView: 'designs' });
    useCanvasStore.getState().addElementSelection(evidence, 'frame-a', true);
  }
  const stops = [
    useCanvasStore.subscribe((now, was) => {
      if (now.elementSelections !== was.elementSelections) trace.push(`canvas elements [${now.elementSelections.map((selection) => selection.evidence.id).join()}]`);
      if (now.selectedNodeIds !== was.selectedNodeIds) trace.push(`canvas frames [${now.selectedNodeIds.join()}]`);
      if (now.isPicking !== was.isPicking) trace.push(`canvas picking ${String(now.isPicking)}`);
      if (now.gatherRefusal !== was.gatherRefusal) trace.push(`canvas refusal ${String(now.gatherRefusal)}`);
    }),
    useNextTasksOfferStore.subscribe((now) => trace.push(`foot nextTasks ${String(now.isOpen)}`)),
    useSetupTurnStore.subscribe((now) => trace.push(`setup turn ${now.turn === undefined ? 'none' : 'steps'} failed=${String(now.agentFailed)}`)),
  ];
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  teardown = async () => {
    await act(async () => root.unmount());
    container.remove();
    for (const stop of stops) stop();
    useCanvasStore.setState(beforeCanvas);
    useWorkspaceStore.setState(beforeWorkspace);
    useAgentSetupStore.setState(beforeSetup);
    window.studio = beforeBridge;
  };
  await act(async () => root.render(<ChatRegion />));
  return {
    container,
    set: (patch) => act(async () => updateSession({ ...current, ...patch })),
    state: (patch) => act(async () => updateSession({ ...current, state: { ...current.state, ...patch } })),
    type: (text) => act(async () => panel?.onComposerChange(text)),
  };
}

afterEach(async () => {
  await teardown?.();
  teardown = undefined;
});

/** What every mount does before the first step. */
const OPENED = ['bridge draftState {"cwd":"/project"}', 'setup turn none failed=false'];
const beat = (ms: number): Promise<void> => act(async () => { await new Promise((done) => setTimeout(done, ms)); });
const saved = (draft: ComposerDraft): string => `bridge draftSave ${JSON.stringify({ cwd: '/project', draft })}`;

describe('ChatRegion: send', () => {
  it('sends once, holds the composer while it is in flight, and clears what went out', async () => {
    const answer = deferred<{ accepted: boolean }>();
    const send = mock<AgentSessionHandle['send']>((...args) => { trace.push(`session.send ${JSON.stringify(args)}`); return answer.promise as never; });
    const chat = await mount({ session: { send }, canvas: true });
    await chat.type('Hello there');
    expect(panel?.isAgentSwitching).toBe(false);
    let first: Promise<void> | void;
    await act(async () => { first = panel?.onSend('Hello there'); });
    expect(panel?.isAgentSwitching).toBe(true);
    expect(panel?.composerValue).toBe('Hello there');
    // A second send, and a send from another surface, while the first is in the air.
    await act(async () => { await panel?.onSend('Hello there'); });
    expect(await submitChatPrompt({ text: 'From the canvas' })).toEqual({ outcome: 'in-flight' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(panel?.composerStatus).toBeUndefined();
    await act(async () => { answer.settle({ accepted: true }); await first; });
    expect(panel?.isAgentSwitching).toBe(false);
    expect(panel?.composerValue).toBe('');
    expect(panel?.composerAttachments).toEqual([]);
    expect(trace).toEqual([
      ...OPENED,
      saved({ text: 'Hello there', images: [] }),
      `session.send ${JSON.stringify(['Hello there', [{ ...evidence, stale: false }], 'The selected elements were picked in canvas frame "frame-a" (id frame-a).', { answersQuestion: true }])}`,
      'canvas elements []',
      saved({ text: '', images: [] }),
    ]);
  });

  it('keeps text retyped while the send was in flight', async () => {
    const answer = deferred<{ accepted: boolean }>();
    const chat = await mount({ session: { send: () => answer.promise as never } });
    await chat.type('Same words');
    let first: Promise<void> | void;
    await act(async () => { first = panel?.onSend('Same words'); });
    await chat.type('Same words');
    await act(async () => { answer.settle({ accepted: true }); await first; });
    expect(panel?.composerValue).toBe('Same words');
  });

  it.each(['rejected', 'failed'] as const)('says so when the send is %s, keeps the draft, and a keystroke clears the notice', async (outcome) => {
    const send = outcome === 'rejected' ? async () => ({ accepted: false }) as never : async () => { throw new Error('offline'); };
    const chat = await mount({ session: { send } });
    await chat.type('Keep me');
    await act(async () => { await panel?.onSend('Keep me'); });
    expect(panel?.composerValue).toBe('Keep me');
    expect(panel?.composerStatus).toEqual({ type: 'error', message: 'That didn’t send. Your message is still here — press send to try again.' });
    expect(panel?.isAgentSwitching).toBe(false);
    await chat.type('Keep me!');
    expect(panel?.composerStatus).toBeUndefined();
  });

  it('a held send keeps its picks until the waiting prompt leaves', async () => {
    const chat = await mount({ session: { send: async () => ({ accepted: true, held: true }) as never }, canvas: true });
    await chat.type('Wait for the turn');
    await act(async () => { await panel?.onSend('Wait for the turn'); });
    expect(panel?.composerValue).toBe('');
    expect(trace.filter((line) => line.startsWith('canvas'))).toEqual([]);
    await chat.state({ pen: { penId: 1, text: 'Wait for the turn' } });
    expect(trace.filter((line) => line.startsWith('canvas'))).toEqual([]);
    await chat.state({ pen: undefined });
    expect(trace.filter((line) => line.startsWith('canvas'))).toEqual(['canvas elements []']);
  });

  it('retires the gather refusal and the pick mode with the send', async () => {
    const { useCanvasStore } = await import('../canvas/store.js');
    const chat = await mount({});
    await act(async () => useCanvasStore.setState({ gatherRefusal: 'count-cap', isPicking: true }));
    expect(panel?.composerStatus?.type).toBe('warning');
    await chat.type('Go');
    trace.length = 0;
    await act(async () => { await panel?.onSend('Go'); });
    expect(panel?.composerStatus).toBeUndefined();
    expect(trace).toEqual(['canvas refusal null', 'canvas picking false', saved({ text: '', images: [] })]);
  });

  it('an answer that lands after the project changed leaves the new composer alone', async () => {
    const { useWorkspaceStore } = await import('../workspace/store.js');
    const answer = deferred<{ accepted: boolean }>();
    const chat = await mount({ session: { send: () => answer.promise as never } });
    await chat.type('For the first project');
    let first: Promise<void> | void;
    await act(async () => { first = panel?.onSend('For the first project'); });
    await act(async () => useWorkspaceStore.setState({ workspace: { workspacePath: '/other' } as never }));
    await chat.type('For the other project');
    await act(async () => { answer.settle({ accepted: true }); await first; });
    expect(panel?.composerValue).toBe('For the other project');
    expect(panel?.isAgentSwitching).toBe(false);
  });
});

describe('ChatRegion: draft restore', () => {
  it('restores the stored draft, focus first, and never writes it back', async () => {
    await mount({ bridge: { draftState: async () => ({ text: 'Stored words', images: [file], skills: [skill] }) }, session: { state: { ...emptyState, skills: [skill] } } });
    expect(panel?.composerValue).toBe('Stored words');
    expect(panel?.composerAttachments).toEqual([file]);
    expect(panel?.hasComposerSkill).toBe(true);
    expect(trace).toEqual([...OPENED, 'focus composer']);
  });

  it('a keystroke before the read lands wins: text and skill stay, the chips still come back', async () => {
    const stored = deferred<ComposerDraft>();
    const chat = await mount({ bridge: { draftState: () => stored.promise }, session: { state: { ...emptyState, skills: [skill] } } });
    await chat.type('Typed first');
    expect(trace).toEqual([...OPENED]);
    await act(async () => stored.settle({ text: 'Stored words', images: [file], skills: [skill] }));
    expect(panel?.composerValue).toBe('Typed first');
    expect(panel?.hasComposerSkill).toBe(false);
    expect(panel?.composerAttachments).toEqual([file]);
    expect(trace).toEqual([...OPENED, saved({ text: 'Typed first', images: [file] })]);
  });

  it('a read that lands after the project changed restores nothing', async () => {
    const { useWorkspaceStore } = await import('../workspace/store.js');
    const first = deferred<ComposerDraft>();
    await mount({ bridge: { draftState: ({ cwd }: { cwd: string }) => cwd === '/project' ? first.promise : Promise.resolve({ text: 'Other draft', images: [] }) } });
    await act(async () => useWorkspaceStore.setState({ workspace: { workspacePath: '/other' } as never }));
    expect(panel?.composerValue).toBe('Other draft');
    await act(async () => first.settle({ text: 'First draft', images: [file] }));
    expect(panel?.composerValue).toBe('Other draft');
    expect(panel?.composerAttachments).toEqual([]);
    expect(trace).toEqual([...OPENED, 'bridge draftState {"cwd":"/other"}', 'focus composer']);
  });

  it('a stored draft never lands on text asked into the composer', async () => {
    const { requestComposerText } = await import('./composerRequest.js');
    const stored = deferred<ComposerDraft>();
    await mount({ bridge: { draftState: () => stored.promise } });
    await act(async () => requestComposerText('Asked in'));
    expect(panel?.composerValue).toBe('Asked in');
    await act(async () => stored.settle({ text: 'Stored words', images: [] }));
    expect(panel?.composerValue).toBe('Asked in');
    expect(trace).toEqual([...OPENED, 'focus composer', saved({ text: 'Asked in', images: [] })]);
  });
});

describe('ChatRegion: pen return', () => {
  const hold = { penId: 3, text: 'Waiting words', verdict: 'hold' as const };

  it('takes a held prompt back once, joins it to what was typed meanwhile, and takes no focus', async () => {
    const take = deferred<{ accepted: boolean; taken?: { text: string; attachments?: unknown[] } }>();
    const chat = await mount({ bridge: { agentCommand: () => take.promise } });
    await chat.state({ pen: hold });
    await chat.type('Mine');
    await chat.state({ pen: { ...hold } });
    await act(async () => take.settle({ accepted: true, taken: { text: 'Waiting words', attachments: [file, skill] } }));
    expect(panel?.composerValue).toBe('Mine\n\nWaiting words');
    expect(panel?.composerAttachments).toEqual([file]);
    await chat.state({ pen: { ...hold } });
    expect(trace).toEqual([
      ...OPENED,
      'bridge agentCommand {"type":"pen.take","penId":3,"auto":true}',
      saved({ text: 'Mine', images: [] }),
      // The text and the skill land a render before the chip is read back.
      saved({ text: 'Mine\n\nWaiting words', images: [], skills: [skill] }),
      saved({ text: 'Mine\n\nWaiting words', images: [file], skills: [skill] }),
    ]);
  });

  it('a take that answers with nothing leaves the composer alone and is tried again', async () => {
    const chat = await mount({ bridge: { agentCommand: async () => ({ accepted: false }) } });
    await chat.type('Mine');
    await chat.state({ pen: hold });
    expect(panel?.composerValue).toBe('Mine');
    await chat.state({ pen: { ...hold } });
    expect(trace.filter((line) => line.includes('pen.take'))).toHaveLength(2);
  });

  it('waits for the draft restore and for a send in flight', async () => {
    const stored = deferred<ComposerDraft>();
    const answer = deferred<{ accepted: boolean }>();
    const chat = await mount({ bridge: { draftState: () => stored.promise, agentCommand: async () => ({ accepted: true, taken: { text: 'Waiting words' } }) }, session: { send: () => answer.promise as never } });
    await chat.state({ pen: hold });
    expect(trace.filter((line) => line.includes('pen.take'))).toHaveLength(0);
    await chat.type('Going out');
    let first: Promise<void> | void;
    await act(async () => { first = panel?.onSend('Going out'); });
    await act(async () => stored.settle(EMPTY_DRAFT));
    expect(trace.filter((line) => line.includes('pen.take'))).toHaveLength(0);
    await act(async () => { answer.settle({ accepted: true }); await first; });
    expect(trace.filter((line) => line.includes('pen.take'))).toHaveLength(1);
    expect(panel?.composerValue).toBe('Waiting words');
  });

  it('a press of Edit takes with focus, and Discard sends the discard', async () => {
    await mount({ bridge: { agentCommand: async (command: { type: string }) => command.type === 'pen.take' ? { accepted: true, taken: { text: 'Edited words' } } : { accepted: true } } });
    await act(async () => panel?.penActions?.onTake(7));
    expect(panel?.composerValue).toBe('Edited words');
    await act(async () => panel?.penActions?.onDiscard(8));
    expect(trace).toEqual([
      ...OPENED,
      'bridge agentCommand {"type":"pen.take","penId":7,"auto":false}',
      'focus composer',
      saved({ text: 'Edited words', images: [] }),
      'bridge agentCommand {"type":"pen.discard","penId":8}',
    ]);
  });
});

describe('ChatRegion: recall', () => {
  const earlier = { text: 'Earlier prompt', attachments: [file] };

  it('a walk step fills the composer and holds it; a keystroke cancels the read still in the air', async () => {
    const read = deferred<{ bytes: Uint8Array; mediaType: string }>();
    const chat = await mount({ bridge: { attachmentBytes: () => read.promise }, canvas: true });
    await chat.type('My draft');
    await act(async () => { panel?.onRecallStart?.(); panel?.onRecallStateChange?.(true); panel?.onRestoreComposer?.(earlier, false); });
    expect(panel?.composerValue).toBe('Earlier prompt');
    expect(panel?.isComposerRestoring).toBe(true);
    await chat.type('Earlier prompt, edited');
    expect(panel?.isComposerRestoring).toBe(false);
    await act(async () => read.settle({ bytes: new Uint8Array([1]), mediaType: 'text/plain' }));
    expect(panel?.composerAttachments).toEqual([]);
    expect(panel?.composerValue).toBe('Earlier prompt, edited');
    expect(trace).toEqual([
      ...OPENED,
      saved({ text: 'My draft', images: [] }),
      'canvas elements []',
      'canvas frames []',
      saved({ text: 'Earlier prompt, edited', images: [] }),
    ]);
  });

  it('a settled step brings its chips; stepping back to the draft puts the picks back', async () => {
    const chat = await mount({ canvas: true });
    await chat.type('My draft');
    await act(async () => { panel?.onRecallStart?.(); panel?.onRecallStateChange?.(true); panel?.onRestoreComposer?.(earlier, false); });
    expect(panel?.isComposerRestoring).toBe(false);
    expect(panel?.composerAttachments).toEqual([file]);
    await act(async () => { panel?.onRestoreComposer?.({ text: 'My draft' }, true); });
    expect(panel?.composerValue).toBe('My draft');
    expect(panel?.composerAttachments).toEqual([evidence]);
    await act(async () => panel?.onRecallStateChange?.(false));
    expect(trace).toEqual([
      ...OPENED,
      saved({ text: 'My draft', images: [] }),
      'canvas elements []',
      'canvas frames []',
      'canvas frames []',
      'canvas elements [el-1]',
    ]);
  });

  it('names what a recalled prompt could not bring back, until the next keystroke', async () => {
    const chat = await mount({});
    await act(async () => { panel?.onRestoreComposer?.({ text: 'Earlier prompt', attachments: [evidence] }, false); });
    expect(panel?.composerStatus).toEqual({ type: 'warning', message: expect.stringContaining('h1') });
    await chat.type('Earlier prompt.');
    expect(panel?.composerStatus).toBeUndefined();
  });
});

describe('ChatRegion: agent switch', () => {
  it('holds sends while the switch is in flight and hands the draft to the new chat unsent', async () => {
    const acceptance = deferred<{ accepted: boolean }>();
    const send = mock<AgentSessionHandle['send']>(accepted);
    const chat = await mount({ session: { send, switchAgent: (...args) => { trace.push(`session.switchAgent ${JSON.stringify(args)}`); return acceptance.promise as never; } } });
    await chat.type('Carry me over');
    await act(async () => panel?.onSwitchAgent?.('codex', true));
    expect(panel?.isAgentSwitching).toBe(true);
    expect(await submitChatPrompt({ text: 'From the canvas' })).toEqual({ outcome: 'in-flight' });
    await act(async () => { await panel?.onSend('Carry me over'); });
    expect(send).not.toHaveBeenCalled();
    expect(panel?.composerStatus).toBeUndefined();
    await act(async () => acceptance.settle({ accepted: true }));
    expect(panel?.isAgentSwitching).toBe(true);
    await chat.set({ announcedSessionId: 'chat-2', connection: { status: 'ok', harness: 'codex' } as never, state: { ...emptyState, harnessId: 'codex' } });
    expect(panel?.isAgentSwitching).toBe(false);
    expect(panel?.composerValue).toBe('Carry me over');
    expect(trace).toEqual([
      ...OPENED,
      saved({ text: 'Carry me over', images: [] }),
      'session.switchAgent ["codex","failure"]',
    ]);
  });

  it('an agent that is not set up opens its setup and switches nothing', async () => {
    const switchAgent = mock<AgentSessionHandle['switchAgent']>(accepted);
    await mount({ session: { switchAgent } });
    await act(async () => panel?.onSwitchAgent?.('codex', false));
    expect(switchAgent).not.toHaveBeenCalled();
    expect(panel?.isAgentSwitching).toBe(false);
    expect(document.querySelector('[data-testid="onboarding-dialog-codex"]')).not.toBeNull();
  });

  it('refuses to switch while a send is in flight', async () => {
    const answer = deferred<{ accepted: boolean }>();
    const switchAgent = mock<AgentSessionHandle['switchAgent']>(accepted);
    const chat = await mount({ session: { send: () => answer.promise as never, switchAgent } });
    await chat.type('Going out');
    let first: Promise<void> | void;
    await act(async () => { first = panel?.onSend('Going out'); });
    await act(async () => panel?.onSwitchAgent?.('codex', true));
    expect(switchAgent).not.toHaveBeenCalled();
    await act(async () => { answer.settle({ accepted: true }); await first; });
  });
});

describe('ChatRegion: setup turn and what the sidebar is told', () => {
  it('publishes the turn’s failure and takes it back on unmount', async () => {
    const chat = await mount({});
    await chat.state({ failedTurn: { turnId: 'turn-1', code: 'unknown' } as never });
    expect(useSetupTurnStore.getState().agentFailed).toBe(true);
    await teardown?.();
    teardown = undefined;
    expect(useSetupTurnStore.getState()).toMatchObject({ turn: undefined, agentFailed: false, askedFailure: null });
    expect(trace).toEqual([...OPENED, 'setup turn none failed=true', 'setup turn none failed=false']);
  });

  it('stopping a turn interrupts it once', async () => {
    const chat = await mount({});
    await chat.state({ isStreaming: true });
    await act(async () => panel?.onInterrupt?.());
    expect(trace).toEqual([...OPENED, 'session.interrupt']);
  });
});

describe('ChatRegion: notices', () => {
  it('shows the retry notice at its crossing and not before', async () => {
    const chat = await mount({});
    await chat.state({ isStreaming: true, retrying: { attempt: 2 } as never, retryingSince: Date.now() - 9_800 });
    expect(panel?.notice).toBeUndefined();
    await beat(400);
    expect(panel?.notice?.state).toBe('retrying');
    await chat.state({ isStreaming: false, retrying: undefined, retryingSince: undefined });
    expect(panel?.notice).toBeUndefined();
  });

  it('shows the silence notice at its crossing, counts it up, and reports it once per turn', async () => {
    const chat = await mount({});
    await chat.state({ isStreaming: true, sessionId: 'chat-1', harnessId: 'claude', turnStartedAt: 111, silentSince: Date.now() - 24_800 });
    expect(panel?.notice).toBeUndefined();
    await beat(400);
    expect(panel?.notice?.state).toBe('silent');
    const first = panel?.notice?.seconds ?? 0;
    await beat(1_200);
    expect(panel?.notice?.seconds).toBeGreaterThan(first);
    expect(trace).toEqual([...OPENED, 'bridge telemetryEvent agent_silence_shown']);
    await chat.state({ turnStartedAt: 222, silentSince: Date.now() - 26_000 });
    expect(trace.filter((line) => line.includes('agent_silence_shown'))).toHaveLength(2);
  });

  it('reports a limit card once', async () => {
    const error = { kind: 'error', id: 'error-1', code: 'billing_error', message: 'Out of credits' } as unknown as TranscriptItem;
    const chat = await mount({ session: { liveErrors: { sessionId: 'chat-1', ids: new Set(['error-1']) } } });
    await chat.state({ items: [error] });
    await chat.state({ items: [error, { kind: 'user', id: 'u1', text: 'Again' }] });
    expect(trace).toEqual([...OPENED, 'bridge telemetryEvent rate_limit_card_shown']);
  });

  it('remembers a dismissed notice and a sign-in set aside for its turn', async () => {
    const chat = await mount({ session: { connection: { status: 'unauthenticated', harness: 'claude' } as never } });
    await act(async () => useAgentSetupStore.setState({ claude: { status: 'signed-out' } as never }));
    await chat.state({ failedTurn: { turnId: 'turn-1', code: 'unauthenticated' } as never });
    expect(panel?.dismissedNotices?.has('error-1')).toBe(false);
    await act(async () => panel?.onDismissNotice?.('error-1'));
    expect(panel?.dismissedNotices?.has('error-1')).toBe(true);
    expect(panel?.isSignInSetAside).toBe(false);
    const card = panel?.signInSlot as ReactElement<{ onNotNow?: () => void }> | undefined;
    await act(async () => card?.props.onNotNow?.());
    expect(panel?.isSignInSetAside).toBe(true);
    await chat.state({ failedTurn: { turnId: 'turn-2', code: 'unauthenticated' } as never });
    expect(panel?.isSignInSetAside).toBe(false);
  });

  it('tells the sidebar when next tasks are on offer, and takes it back on unmount', async () => {
    await mount({});
    expect(useNextTasksOfferStore.getState().isOpen).toBe(false);
    await teardown?.();
    teardown = undefined;
    expect(useNextTasksOfferStore.getState().isOpen).toBe(false);
  });
});
