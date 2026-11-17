import { stubImageDecoder } from '../testing/dom.js';
import { describe, expect, it, mock } from 'bun:test';
import { act, useState, type ReactElement, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import * as chatUi from '@studio/chat-ui';
import * as toastUi from '@astryxdesign/core/Toast';
import { CLAUDE_LOGIN_COMMAND, emptyState, type AttachmentBytes, type CanvasDoc, type ChatFileRef, type ComposerDraft, type ElementEvidence, type SkillAttachment, type TranscriptItem } from '@studio/events';
import type { AgentSessionHandle } from './useAgentSession.js';
import { NO_LIVE_ERRORS } from './limitCopy.js';
import { deferred, installBridge } from '../testing/bridge.js';
import { seedFlags } from '../flags/store.js';
import { useSettingsStore } from '../settings/store.js';
import { useProjectsStore } from '../projects/store.js';
import { useAgentSetupStore } from '../agent-setup/store.js';

const showToast = mock(() => {});
mock.module('@astryxdesign/core/Toast', () => ({ ...toastUi, useToast: () => showToast }));

Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get: () => null });

const items: TranscriptItem[] = Array.from({ length: 6 }, (_, index) => ({
  kind: 'user',
  id: `u${index}`,
  text: `prompt ${index}`,
  attachments: [{ kind: 'artifact', artifactId: `a${index}`, title: `Sketch ${index}` }],
}) as TranscriptItem);
const accepted = async () => ({ accepted: true }) as never;
const session: AgentSessionHandle = {
  state: { ...emptyState, items },
  connection: { status: 'ok' } as AgentSessionHandle['connection'],
  liveErrors: NO_LIVE_ERRORS,
  sessionCwd: '/project',
  send: accepted,
  interrupt: () => {},
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
let updateSession: (next: AgentSessionHandle) => void;
mock.module('./useAgentSession.js', () => ({ useAgentSession: () => {
  const [handle, setHandle] = useState(session);
  updateSession = setHandle;
  return handle;
} }));

let previewRenders = 0;
mock.module('../canvas/artifact/ArtifactChipPreview.js', () => ({
  ArtifactChipPreview: ({ children }: { children: ReactNode }) => {
    previewRenders += 1;
    return <>{children}</>;
  },
}));

let panel: chatUi.ChatPanelProps | undefined;
const RealChatPanel = chatUi.ChatPanel;
mock.module('@studio/chat-ui', () => ({
  ...chatUi,
  ChatPanel: (props: chatUi.ChatPanelProps) => {
    panel = props;
    return <RealChatPanel {...props} />;
  },
}));

const listen = () => () => {};
const pending = () => new Promise<never>(() => {});
installBridge({
  onAgentWorkingFrames: listen,
  draftState: pending,
  onChatFocus: listen,
});

async function mountSwitchDraft() {
  const { ChatRegion } = await import('./ChatRegion.js');
  const { useWorkspaceStore } = await import('../workspace/store.js');
  const { useCanvasStore } = await import('../canvas/store.js');
  const beforeWorkspace = useWorkspaceStore.getState();
  const beforeCanvas = useCanvasStore.getState();
  const beforeSetup = useAgentSetupStore.getState();
  const beforeBridge = window.studio;
  const restoreDecoder = stubImageDecoder();
  const image: ChatFileRef = { id: 'draft-image', mediaType: 'image/png', name: 'hero.png', width: 8, height: 6 };
  const file: ChatFileRef = { kind: 'file', id: 'draft-file', mediaType: 'text/plain', name: 'notes.txt', originalSize: 5 };
  const pdf: ChatFileRef = { kind: 'file', id: 'draft-pdf', mediaType: 'application/pdf', name: 'brief.pdf', originalSize: 5 };
  const latestFile: ChatFileRef = { kind: 'file', id: 'latest-file', mediaType: 'text/plain', name: 'latest.txt', originalSize: 6 };
  const skill: SkillAttachment = { kind: 'skill', name: 'design', description: 'Design', agent: 'claude', path: '/skills/design/SKILL.md' };
  const artifact = { kind: 'artifact' as const, artifactId: 'draft-sketch', title: 'Sketch', pagePath: 'pages/header.html' };
  const draft: ComposerDraft = { text: 'Use /design My draft', images: [image, file, pdf], skills: [skill], artifacts: [artifact] };
  const evidence: ElementEvidence = { kind: 'element', id: 'draft-element', tag: 'h1', domPath: 'h1:nth-of-type(1)', outerHtmlSnippet: '<h1>Header</h1>', textContent: 'Header', classes: ['hero'], frameUrl: 'http://localhost:3000/' };
  const doc: CanvasDoc = {
    schemaVersion: 2, docId: 'switch-draft', revision: 1,
    pages: { page: { id: 'page', name: 'Page', order: 0 } },
    nodes: Object.fromEntries(['frame-a', 'frame-b'].map((id, order) => [id, { id, kind: 'browser' as const, pageId: 'page', name: id, x: order * 400, y: 0, width: 320, height: 240, order, content: { homeUrl: evidence.frameUrl } }])),
  };
  const acceptance = deferred<{ accepted: boolean }>();
  const command = mock(() => acceptance.promise);
  const send = mock<AgentSessionHandle['send']>(accepted);
  const source: AgentSessionHandle = { ...session, announcedSessionId: 'source', switchAgent: command, send, state: { ...session.state, harnessId: 'claude', skills: [skill] }, connection: { status: 'ok', harness: 'claude' } };
  const destination: AgentSessionHandle = { ...source, announcedSessionId: 'destination', connection: { status: 'ok', harness: 'codex' }, state: { ...emptyState, harnessId: 'codex' } };
  const attachmentBytes = mock(async ({ id }: { id: string }): Promise<AttachmentBytes | null> => {
    const ref = [image, file, pdf, latestFile].find((candidate) => candidate.id === id);
    return ref ? { bytes: new Uint8Array([1, 2, 3, 4, 5]), mediaType: ref.mediaType } : null;
  });
  installBridge({
    onAgentWorkingFrames: listen, onChatFocus: listen,
    draftState: async ({ cwd }) => cwd === '/project' ? draft : { text: 'Other project draft', images: [] },
    draftSave: () => {}, attachmentBytes,
    artifactRead: async () => ({ id: artifact.artifactId, title: artifact.title, pagePath: artifact.pagePath, updatedAt: '', readOnly: false }),
    registerAttachment: async () => ({ ok: true, ref: latestFile }),
    telemetryEvent: () => {}, codexSignIn: pending, codexSignInCancel: accepted,
  });
  useAgentSetupStore.setState({ claude: { status: 'signed-in', command: CLAUDE_LOGIN_COMMAND }, codex: { status: 'ready' } });
  useWorkspaceStore.setState({ workspace: { workspacePath: '/project' } as never, session: { kind: 'none' } });
  useCanvasStore.setState({ doc, currentPageId: 'page', selectedNodeIds: [], elementSelections: [], nodes: [], mode: 'design', leftPanelView: 'designs' });
  useCanvasStore.getState().selectFrame('frame-a', false);
  useCanvasStore.getState().addElementSelection(evidence, 'frame-a', true);
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const unmount = async (): Promise<void> => {
    await act(async () => root.unmount());
    container.remove();
    restoreDecoder();
    useCanvasStore.setState(beforeCanvas);
    useWorkspaceStore.setState(beforeWorkspace);
    useAgentSetupStore.setState(beforeSetup);
    window.studio = beforeBridge;
  };
  try {
    await act(async () => root.render(<ChatRegion />));
    await act(async () => updateSession(source));
    expect(panel?.composerAttachments).toHaveLength(6);
    expect(panel?.composerAttachments).toEqual(expect.arrayContaining([image, file, pdf, evidence, { kind: 'frame', name: 'frame-a' }, artifact]));
    expect(panel?.hasComposerSkill).toBe(true);
    expect(container.querySelectorAll('[data-astryx-token-value="/design"]')).toHaveLength(1);
  } catch (error) {
    await unmount();
    throw error;
  }
  return {
    container, acceptance, command, send, source, destination, attachmentBytes, image, file, pdf, latestFile, skill, artifact, evidence, useWorkspaceStore, useCanvasStore,
    switchFromMenu: async () => {
      await act(async () => container.querySelector<HTMLButtonElement>('[data-testid="chat-model-effort"]')?.click());
      const action = document.querySelector<HTMLElement>('[data-testid="chat-switch-agent"]');
      expect(action).not.toBeNull();
      await act(async () => action?.click());
    },
    unmount,
  };
}

describe('ChatRegion', () => {
  it.each(['command-first', 'announcement-first'] as const)('keeps the latest manual draft unsent across a switch: %s', async (order) => {
    const fixture = await mountSwitchDraft();
    const { container, acceptance, command, send, source, destination, useCanvasStore } = fixture;
    try {
      await fixture.switchFromMenu();
      expect(command).toHaveBeenCalledTimes(1);
      expect(command).toHaveBeenCalledWith('codex', 'menu');
      expect(panel?.isAgentSwitching).toBe(true);
      await act(async () => panel?.onSwitchAgent?.('codex', true));
      expect(command).toHaveBeenCalledTimes(1);
      const latestEvidence: ElementEvidence = { ...fixture.evidence, id: 'latest-element', tag: 'h2', outerHtmlSnippet: '<h2>Latest heading</h2>', textContent: 'Latest heading' };
      await act(async () => {
        panel?.onComposerChange('Use /design My latest draft');
        const canvas = useCanvasStore.getState();
        canvas.selectFrame('frame-b', false);
        canvas.clearElementSelections('escape');
        expect(canvas.addElementSelection(latestEvidence, 'frame-b', true)).toBe('added');
        useCanvasStore.getState().setElementStale(latestEvidence.id, true);
      });
      const latestFile = new File(['latest'], 'latest.txt', { type: 'text/plain' });
      await act(async () => panel?.onComposerFiles?.([latestFile]));
      const latestAttachments = panel?.composerAttachments;
      expect(latestAttachments).toHaveLength(7);
      expect(latestAttachments).toEqual(expect.arrayContaining([fixture.image, fixture.file, fixture.pdf, fixture.latestFile, latestEvidence, { kind: 'frame', name: 'frame-b' }, fixture.artifact]));
      const readsBeforeRestore = fixture.attachmentBytes.mock.calls.length;
      if (order === 'announcement-first') await act(async () => updateSession(destination));
      await act(async () => acceptance.settle({ accepted: true }));
      if (order === 'command-first') {
        expect(panel?.isAgentSwitching).toBe(true);
        await act(async () => updateSession({ ...source, announcedSessionId: undefined }));
        expect(panel?.isAgentSwitching).toBe(true);
        await act(async () => updateSession(destination));
      }
      expect(panel?.composerValue).toBe('Use /design My latest draft');
      expect(container.querySelector('[data-testid="chat-composer"] [role="textbox"]')?.textContent).toContain('My latest draft');
      expect(container.querySelectorAll('[data-astryx-token-value="/design"]')).toHaveLength(1);
      expect(panel?.hasComposerSkill).toBe(true);
      expect(panel?.composerAttachments).toEqual(latestAttachments);
      expect(panel?.composerStatus?.message).toContain('brief.pdf');
      expect(useCanvasStore.getState().selectedNodeIds).toEqual(['frame-b']);
      expect(useCanvasStore.getState().elementSelections).toEqual([{ evidence: latestEvidence, frameNodeId: 'frame-b', stale: true }]);
      expect(fixture.attachmentBytes).toHaveBeenCalledTimes(readsBeforeRestore);
      expect(panel?.isAgentSwitching).toBe(false);
      expect(send).not.toHaveBeenCalled();
      await act(async () => panel?.onSend('Use /design My latest draft'));
      expect(send).not.toHaveBeenCalled();
      await act(async () => panel?.onComposerChange('Use /design Now edited'));
      await act(async () => updateSession({ ...destination }));
      expect(panel?.composerValue).toBe('Use /design Now edited');
      expect(panel?.composerAttachments).toEqual(latestAttachments);
      await fixture.switchFromMenu();
      expect(command).toHaveBeenCalledTimes(2);
      expect(command).toHaveBeenLastCalledWith('claude', 'menu');
      await act(async () => updateSession({ ...source, announcedSessionId: 'returned' }));
      expect(panel?.composerValue).toBe('Use /design Now edited');
      expect(panel?.composerAttachments).toEqual(latestAttachments);
      expect(panel?.hasComposerSkill).toBe(true);
      expect(panel?.isAgentSwitching).toBe(false);
      expect(fixture.attachmentBytes).toHaveBeenCalledTimes(readsBeforeRestore);
      expect(send).not.toHaveBeenCalled();
      await act(async () => panel?.onSend('Use /design Now edited'));
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0]?.[0]).toBe('Use /design Now edited');
      const sentAttachments = send.mock.calls[0]?.[1];
      expect(sentAttachments).toHaveLength(8);
      expect(sentAttachments).toEqual(expect.arrayContaining([fixture.image, fixture.file, fixture.pdf, fixture.latestFile, { ...latestEvidence, stale: true }, { kind: 'frame', name: 'frame-b' }, fixture.artifact, fixture.skill]));
    } finally {
      await fixture.unmount();
    }
  });

  it.each(['command-first', 'announcement-first'] as const)('restores the failed prompt without sending it: %s', async (order) => {
    const fixture = await mountSwitchDraft();
    try {
      await act(async () => panel?.onSwitchAgent?.('codex', true, { text: 'Polish the notes layout.', attachments: [fixture.image], context: 'Previous provider context' }));
      expect(fixture.command).toHaveBeenCalledTimes(1);
      expect(fixture.command).toHaveBeenCalledWith('codex', 'failure');
      if (order === 'announcement-first') await act(async () => updateSession(fixture.destination));
      await act(async () => fixture.acceptance.settle({ accepted: true }));
      if (order === 'command-first') {
        await act(async () => updateSession({ ...fixture.source, announcedSessionId: undefined }));
        await act(async () => updateSession(fixture.destination));
      }
      expect(panel?.composerValue).toBe('Polish the notes layout.');
      expect(fixture.container.querySelector('[data-testid="chat-composer"] [role="textbox"]')?.textContent).toBe('Polish the notes layout.');
      expect(panel?.composerAttachments).toEqual([fixture.image]);
      expect(panel?.isAgentSwitching).toBe(false);
      expect(fixture.send).not.toHaveBeenCalled();
    } finally {
      await fixture.unmount();
    }
  });

  it.each(['refused', 'rejected'] as const)('reports a %s switch without losing the draft', async (outcome) => {
    const fixture = await mountSwitchDraft();
    const beforeAttachments = panel?.composerAttachments;
    const beforeElements = fixture.useCanvasStore.getState().elementSelections;
    showToast.mockClear();
    try {
      await act(async () => panel?.onComposerChange('Use /design Still mine'));
      await fixture.switchFromMenu();
      await act(async () => {
        if (outcome === 'refused') fixture.acceptance.settle({ accepted: false });
        else fixture.acceptance.refuse(new Error('offline'));
      });
      expect(panel?.composerValue).toBe('Use /design Still mine');
      expect(panel?.composerAttachments).toEqual(beforeAttachments);
      expect(panel?.hasComposerSkill).toBe(true);
      expect(fixture.useCanvasStore.getState().selectedNodeIds).toEqual(['frame-a']);
      expect(fixture.useCanvasStore.getState().elementSelections).toEqual(beforeElements);
      expect(panel?.isAgentSwitching).toBe(false);
      expect(fixture.send).not.toHaveBeenCalled();
      expect(showToast).toHaveBeenCalledWith({ body: 'Couldn’t switch agents. Try again.', type: 'info' });
    } finally {
      await fixture.unmount();
    }
  });

  it.each(['accepted', 'refused', 'rejected'] as const)('abandons the old Project switch before a late %s result', async (outcome) => {
    const fixture = await mountSwitchDraft();
    showToast.mockClear();
    try {
      await fixture.switchFromMenu();
      expect(panel?.isAgentSwitching).toBe(true);
      await act(async () => {
        fixture.useWorkspaceStore.setState({ workspace: { workspacePath: '/other-project' } as never });
        updateSession({ ...fixture.destination, announcedSessionId: 'other-project-session', sessionCwd: '/other-project' });
      });
      await act(async () => {
        panel?.onComposerChange('Other project draft');
        fixture.useCanvasStore.getState().clearElementSelections('escape');
        fixture.useCanvasStore.getState().selectFrame('frame-b', false);
      });
      const otherAttachments = panel?.composerAttachments;
      expect(panel?.isAgentSwitching).toBe(false);
      await act(async () => {
        if (outcome === 'rejected') fixture.acceptance.refuse(new Error('late rejection'));
        else fixture.acceptance.settle({ accepted: outcome === 'accepted' });
      });
      await act(async () => updateSession({ ...fixture.destination, announcedSessionId: 'other-project-session', sessionCwd: '/other-project' }));
      expect(panel?.composerValue).toBe('Other project draft');
      expect(panel?.composerAttachments).toEqual(otherAttachments);
      expect(fixture.useCanvasStore.getState().selectedNodeIds).toEqual(['frame-b']);
      expect(fixture.useCanvasStore.getState().elementSelections).toEqual([]);
      expect(panel?.isAgentSwitching).toBe(false);
      expect(fixture.command).toHaveBeenCalledTimes(1);
      expect(fixture.send).not.toHaveBeenCalled();
      expect(showToast).not.toHaveBeenCalled();
    } finally {
      await fixture.unmount();
    }
  });

  it('opens setup without switching or consuming the payload, then requires a ready action', async () => {
    const fixture = await mountSwitchDraft();
    const beforeAttachments = panel?.composerAttachments;
    try {
      await act(async () => useAgentSetupStore.setState({ codex: { status: 'signed-out' } }));
      await fixture.switchFromMenu();
      const dialog = document.querySelector('[data-testid="onboarding-dialog-codex"]');
      expect(dialog).not.toBeNull();
      expect(fixture.command).not.toHaveBeenCalled();
      expect(fixture.send).not.toHaveBeenCalled();
      expect(panel?.composerAttachments).toEqual(beforeAttachments);
      expect(panel?.hasComposerSkill).toBe(true);
      const close = dialog?.querySelector<HTMLButtonElement>('button[aria-label]');
      expect(close).not.toBeNull();
      await act(async () => close?.click());
      expect(document.querySelector('[data-testid="onboarding-dialog-codex"]')).toBeNull();
      await act(async () => useAgentSetupStore.setState({ codex: { status: 'ready' } }));
      expect(fixture.command).not.toHaveBeenCalled();
      expect(panel?.composerValue).toBe('Use /design My draft');
      expect(panel?.composerAttachments).toEqual(beforeAttachments);
      await fixture.switchFromMenu();
      expect(fixture.command).toHaveBeenCalledTimes(1);
      expect(fixture.command).toHaveBeenCalledWith('codex', 'menu');
      expect(panel?.isAgentSwitching).toBe(true);
      await act(async () => fixture.acceptance.settle({ accepted: false }));
      expect(panel?.composerAttachments).toEqual(beforeAttachments);
      expect(panel?.isAgentSwitching).toBe(false);
      expect(fixture.send).not.toHaveBeenCalled();
    } finally {
      await fixture.unmount();
    }
  });

  async function verifyConnectorsLayout(connectors: boolean): Promise<void> {
    const { ChatRegion } = await import('./ChatRegion.js');
    const previousSettings = useSettingsStore.getState();
    const previousWorkspaces = useProjectsStore.getState().workspaces;
    const project = (name: string) => ({ workspacePath: `/w/${name}`, name, editableName: name, branchName: name, repoIdentity: 'repo', lastOpenedAt: '', createdAt: '', missing: false, archived: false });
    useProjectsStore.setState({ workspaces: [{ repoIdentity: 'repo', name: 'repo', sourcePath: '/repo', lastOpenedAt: '', archived: false, projects: [project('one'), project('two'), project('three')] }] });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const setMode = mock(async () => ({ accepted: true }));
    seedFlags();
    useSettingsStore.setState({ isPrimed: true, connectorsNoticeDismissed: false });
    try {
      await act(async () => { root.render(<ChatRegion />); });
      await act(async () => { updateSession({ ...session, setPermissionMode: setMode, state: { ...session.state, harnessId: 'claude', permissionMode: 'default', permissionModes: ['default', 'acceptEdits', 'auto', 'plan'], connectors: { servers: [] }, models: [{ value: 'opus', displayName: 'Claude Opus' }], model: 'opus' } }); });
      expect(container.querySelectorAll('[data-testid="chat-connectors"]')).toHaveLength(0);
      expect(container.querySelectorAll('[data-testid="chat-connectors-notice"]')).toHaveLength(0);
      expect(container.querySelectorAll('[data-testid="chat-permission-mode-slot"]')).toHaveLength(1);
      const initialAddMenu = container.querySelector<HTMLButtonElement>('[data-testid="chat-add-menu"]');
      expect(initialAddMenu).not.toBeNull();
      await act(async () => { initialAddMenu?.click(); });
      expect([...document.querySelectorAll('[role="menuitem"]')].filter((row) => row.textContent === 'Connectors')).toHaveLength(0);
      await act(async () => { initialAddMenu?.click(); });
      expect(initialAddMenu?.getAttribute('aria-expanded')).toBe('false');
      await act(async () => { seedFlags({ sections: false, connectors, 'blank-first-moment': true }); });
      expect(container.querySelectorAll('[data-testid="chat-connectors"]')).toHaveLength(0);
      const addMenu = container.querySelector<HTMLButtonElement>('[data-testid="chat-add-menu"]');
      expect(addMenu).not.toBeNull();
      await act(async () => { addMenu?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); });
      expect(addMenu?.getAttribute('aria-expanded')).toBe('true');
      expect([...document.querySelectorAll('[role="menuitem"]')].filter((row) => row.textContent === 'Connectors')).toHaveLength(connectors ? 1 : 0);
      await act(async () => { document.querySelector('[role="menu"]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
      expect(addMenu?.getAttribute('aria-expanded')).toBe('false');
      expect(container.querySelectorAll('[data-testid="chat-connectors-notice"]')).toHaveLength(connectors ? 1 : 0);
      expect(container.querySelectorAll('[data-testid="chat-permission-mode-slot"]')).toHaveLength(connectors ? 0 : 1);
      const model = container.querySelector<HTMLButtonElement>('[data-testid="chat-model-effort"]');
      expect(model).not.toBeNull();
      await act(async () => { model?.click(); });
      expect(document.querySelectorAll('[data-testid="chat-permission-row"]')).toHaveLength(connectors ? 1 : 0);
      if (connectors) {
        await act(async () => { document.querySelector<HTMLButtonElement>('[data-testid="chat-permission-row"]')?.click(); });
      } else {
        await act(async () => { model?.click(); });
        await act(async () => { container.querySelector<HTMLButtonElement>('[data-testid="chat-permission-mode"]')?.click(); });
        const acceptEdits = Array.from(document.querySelectorAll<HTMLDivElement>('[data-testid="chat-permission-mode-row"]')).find((row) => row.textContent?.includes('Accept edits'));
        expect(acceptEdits).toBeDefined();
        await act(async () => { acceptEdits?.click(); });
      }
      expect(setMode).toHaveBeenCalledWith('acceptEdits');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
      seedFlags();
      useSettingsStore.setState(previousSettings);
      useProjectsStore.setState({ workspaces: previousWorkspaces });
    }
  }

  it('connectors flag off preserves composer permissions', () => verifyConnectorsLayout(false));
  it('connectors flag on adds Connectors to + and moves permissions after a late answer', () => verifyConnectorsLayout(true));

  it('keeps completed turns idle while the active reply streams with a queued prompt', async () => {
    const turns = 30;
    const { ChatRegion } = await import('./ChatRegion.js');
    const { useWorkspaceStore } = await import('../workspace/store.js');
    useWorkspaceStore.setState({ workspace: { workspacePath: '/project' } as never });
    const history: TranscriptItem[] = Array.from({ length: turns }, (_, index) => [
      { kind: 'user' as const, id: `history-user-${index}`, text: `Prompt ${index}`, attachments: [{ kind: 'artifact' as const, artifactId: `artifact-${index}`, title: 'Reference' }] },
      { kind: 'assistant-text' as const, id: `history-reply-${index}`, text: `Reply ${index}`, isStreaming: false },
    ]).flat();
    const active: TranscriptItem = { kind: 'user', id: 'active', text: 'Check the remaining sections' };
    const queued: TranscriptItem = { kind: 'user', id: 'queued', text: 'Then check the footer', delivery: 'waiting' };
    const nextState = (flush: number): AgentSessionHandle => ({
      ...session,
      state: {
        ...session.state,
        isStreaming: true,
        midTurn: 'steer',
        items: [...history, active, { kind: 'assistant-text', id: 'live-reply', text: `Checking section ${flush}`, isStreaming: true }, queued],
      },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<ChatRegion />); });
      await act(async () => { updateSession(nextState(0)); });
      const responder = panel?.onRespond;
      previewRenders = 0;
      for (let flush = 1; flush <= 5; flush += 1) {
        await act(async () => { updateSession(nextState(flush)); });
        expect(previewRenders).toBe(0);
        expect(panel?.onRespond).toBe(responder);
        expect(panel?.state.items.at(-2)).toMatchObject({ text: `Checking section ${flush}`, isStreaming: true });
        expect(container.textContent).toContain('Then check the footer');
      }
      const settled = nextState(5);
      settled.state = {
        ...settled.state,
        isStreaming: false,
        items: settled.state.items.map(item => item.kind === 'assistant-text' && item.isStreaming ? { ...item, isStreaming: false } : item),
      };
      await act(async () => { updateSession(settled); });
      expect(container.textContent).toContain('Checking section 5');
      expect(container.querySelectorAll('[data-testid="chat-message"]')).toHaveLength(turns * 2 + 3);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
      previewRenders = 0;
    }
  });

  it('streamed session updates re-render no unchanged transcript row', async () => {
    const { ChatRegion } = await import('./ChatRegion.js');
    const { useWorkspaceStore } = await import('../workspace/store.js');
    useWorkspaceStore.setState({ workspace: { workspacePath: '/project' } as never });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    previewRenders = 0;
    try {
      await act(async () => { root.render(<ChatRegion />); });
      expect(previewRenders).toBe(items.length);
      const onRespond = panel?.onRespond;
      previewRenders = 0;
      for (let flush = 0; flush < 3; flush += 1) {
        await act(async () => { updateSession({ ...session, state: { ...session.state, items: [...items] } }); });
        expect(previewRenders).toBe(0);
        expect(panel?.onRespond).toBe(onRespond);
      }
      const changedItems = items.map((item, index) => index === 0 ? { ...item, text: 'updated prompt' } : item);
      await act(async () => { updateSession({ ...session, state: { ...session.state, items: changedItems } }); });
      expect(previewRenders).toBe(1);
      expect(container.textContent).toContain('updated prompt');
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
      previewRenders = 0;
    }
  });

  it('permission responses use the current session responder after a session switch', async () => {
    const { ChatRegion } = await import('./ChatRegion.js');
    const { useWorkspaceStore } = await import('../workspace/store.js');
    useWorkspaceStore.setState({ workspace: { workspacePath: '/project' } as never });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const respond = mock(async () => ({ accepted: true }));
    try {
      await act(async () => { root.render(<ChatRegion />); });
      const previousRespond = panel?.onRespond;
      await act(async () => { updateSession({ ...session, sessionCwd: '/other-project', respond }); });
      expect(panel?.onRespond).not.toBe(previousRespond);
      const answers = { question: 'answer' };
      expect(await panel?.onRespond?.('request', 'allow', answers, 'tap', true)).toBe(true);
      expect(respond).toHaveBeenCalledWith('request', 'allow', answers, 'tap', true);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
      previewRenders = 0;
    }
  });

  it.each([
    ['setUpCodex', 'failed', 'setup-failed', 'try-again', 'idle'],
    ['setUpCodex', 'downloading', 'downloading', 'cancel', 'idle'],
    ['setUpCodex', 'downloading', 'downloading', 'cancel', 'ready'],
    ['setUpCodex', 'signed-out', 'not-signed-in', 'sign-in', 'idle'],
    ['signInCodex', 'signed-out', 'fallback', 'check-again', 'idle'],
  ] as const)('shows %s result %s (%s, %s) from %s', async (remedy, status, state, action, initial) => {
    const { ChatRegion } = await import('./ChatRegion.js');
    const { useAgentSetupStore } = await import('../agent-setup/store.js');
    const { useWorkspaceStore } = await import('../workspace/store.js');
    useWorkspaceStore.setState({ workspace: { workspacePath: '/project' } as never });
    const previousSetup = useAgentSetupStore.getState();
    session.connection = { status: remedy === 'setUpCodex' ? 'cli_missing' : 'unauthenticated', harness: 'codex' };
    useAgentSetupStore.setState({ codex: { status: initial }, codexSignInAttempted: false });
    const result = async () => {
      useAgentSetupStore.getState().applyCodex(status === 'signed-out'
        ? { status, message: 'Setup could not finish', command: 'codex login --device-auth' }
        : { status, message: 'Setup could not finish' });
      return { accepted: true };
    };
    installBridge({
      onAgentWorkingFrames: listen,
      draftState: pending,
      onChatFocus: listen,
      codexInstall: result,
      codexSignIn: result,
      codexSignInCancel: accepted,
      telemetryEvent: () => {},
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<ChatRegion />); });
      const button = container.querySelector<HTMLButtonElement>('[data-testid="chat-connection-remedy"]');
      expect(button).not.toBeNull();
      await act(async () => { button?.click(); });
      const dialog = document.querySelector('[data-testid="onboarding-dialog-codex"]');
      expect(dialog).not.toBeNull();
      expect(dialog?.getAttribute('data-state')).toBe(state);
      expect(dialog?.querySelector(`[data-testid="setup-action-${action}"]`)).not.toBeNull();
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
      session.connection = { status: 'ok' };
      useAgentSetupStore.setState(previousSetup);
      installBridge({ onAgentWorkingFrames: listen, draftState: pending, onChatFocus: listen });
      previewRenders = 0;
    }
  });

  it('keeps the setup sheet mounted across a Project switch', async () => {
    const { ChatRegion } = await import('./ChatRegion.js');
    const { useAgentSetupStore } = await import('../agent-setup/store.js');
    const { useWorkspaceStore } = await import('../workspace/store.js');
    useWorkspaceStore.setState({ workspace: { workspacePath: '/project' } as never, session: { kind: 'none' } });
    const previousSetup = useAgentSetupStore.getState();
    session.connection = { status: 'unauthenticated', harness: 'codex' };
    useAgentSetupStore.setState({ codex: { status: 'idle' }, codexSignInAttempted: false });
    installBridge({
      onAgentWorkingFrames: listen,
      draftState: pending,
      onChatFocus: listen,
      codexSignIn: pending,
      codexSignInCancel: accepted,
      telemetryEvent: () => {},
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<ChatRegion />); });
      await act(async () => { container.querySelector<HTMLButtonElement>('[data-testid="chat-connection-remedy"]')?.click(); });
      const opened = document.querySelector('[data-testid="onboarding-dialog-codex"]');
      expect(opened === null).toBe(false);
      // The unmount would cancel the sign-in still running in main (ONL-2743).
      await act(async () => { useWorkspaceStore.setState({ session: { kind: 'opening', covered: true } }); });
      // Identity, compared as a boolean: a mismatch of two DOM trees prints both.
      expect(document.querySelector('[data-testid="onboarding-dialog-codex"]') === opened).toBe(true);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
      session.connection = { status: 'ok' };
      useWorkspaceStore.setState({ session: { kind: 'none' } });
      useAgentSetupStore.setState(previousSetup);
      installBridge({ onAgentWorkingFrames: listen, draftState: pending, onChatFocus: listen });
      previewRenders = 0;
    }
  });

  it('a composer keystroke re-renders no transcript row', async () => {
    const { ChatRegion } = await import('./ChatRegion.js');
    const { useWorkspaceStore } = await import('../workspace/store.js');
    useWorkspaceStore.setState({ workspace: { workspacePath: '/project' } as never });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<ChatRegion />); });
    expect(previewRenders).toBe(items.length);

    previewRenders = 0;
    await act(async () => { panel?.onComposerChange('a'); });
    await act(async () => { panel?.onComposerChange('ab'); });
    expect(previewRenders).toBe(0);
    await act(async () => { root.unmount(); });
  });

  it('draws the notifications invitation in the chat once the invite tip is switched off (ONL-2995)', async () => {
    const { ChatRegion } = await import('./ChatRegion.js');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const inviteHidden = () => (panel?.notificationSlot as ReactElement<{ isHidden: boolean }> | undefined)?.props.isHidden;
    try {
      await act(async () => { seedFlags({ 'invite-tip': true }); });
      await act(async () => { root.render(<ChatRegion />); });
      expect(inviteHidden()).toBe(true);
      await act(async () => { seedFlags({ 'invite-tip': false }); });
      expect(inviteHidden()).toBe(false);
    } finally {
      await act(async () => { root.unmount(); });
      container.remove();
      seedFlags();
    }
  });
});
