import { EMPTY_COMPOSER_DRAFT, type AgentCommandAcceptance, type ElementEvidence, type HarnessId, type ProviderNotice, type RateLimitWindow, type RendererTelemetryEventMap, type RetryPrompt, type SessionState, type TranscriptItem } from '@studio/events';
import { studio } from '../bridge.js';
import { ignoreRefusal } from '../refusal.js';
import { refillDue, switchAgent, type ManualComposerDraft, type PendingRefill } from './agentSwitch.js';
import type { ComposerRequest } from './composerRequest.js';
import { artifactChipId, planDraftRestore, restoreArtifactReferences, type ComposerSnapshot } from './draftRestore.js';
import { limitCardReports, nextLimitReset, type LiveErrors } from './limitCopy.js';
import { draftAfterTake, focusesOnTake, penReturnStep, withoutWorkspace, type PenReceipt, type PenReturnRead } from './penRow.js';
import { silenceReport, type SilenceReport } from './silenceReport.js';
import { shouldClearComposerText, shouldClearElementPicks } from './submissionSettlement.js';
import type { PromptSubmitResult } from './submitPrompt.js';
import type { ChatSubmitRequest } from './submitRegistry.js';
import type { AttachmentsHandle } from './useAttachments.js';
import type { PromptRecallHandle } from './usePromptRecall.js';
import type { SkillComposerHandle } from './useSkillComposer.js';

/** One prompt at a time, from any surface: `sending` from the submit until main's answer (ONL-2455). */
type SendPhase = 'idle' | 'sending';

/** `request` until main answers the switch, `restore` while the refill it held puts the draft back. */
type SwitchPhase = 'idle' | 'request' | 'restore';

/** What the panel renders from. Written by the session alone; a render reads the one it was given. */
export interface ChatSessionState {
  composerValue: string;
  send: SendPhase;
  sendRejected: boolean;
  /** Held until the restore settles: a save before it would clear the very draft being read (ONL-2207). */
  restoredFor: string | undefined;
  switch: SwitchPhase;
  /** Held from main's acceptance until the new chat is announced. */
  pendingRefill: PendingRefill | undefined;
  /** The crossing the provider notice was last due at; a re-render trigger, never an argument (ONL-2491). */
  noticeClock: number | undefined;
  /** Moves once a second while the turn is silent, so the notice's count stays true (ONL-2903). */
  silenceTick: number;
  /** Moves when a plan limit resets, so what is drawn from the limits is drawn again. */
  limitClock: number;
  dismissedNotices: ReadonlySet<string>;
  /** The failed turn whose sign-in card was set aside. */
  signInSetAsideTurn: string | undefined;
}

export const INITIAL_CHAT_SESSION: ChatSessionState = { composerValue: '', send: 'idle', sendRejected: false, restoredFor: undefined, switch: 'idle', pendingRefill: undefined, noticeClock: undefined, silenceTick: 0, limitClock: 0, dismissedNotices: new Set(), signInSetAsideTurn: undefined };

/** What a keystroke reaches outside the session. */
interface EditSurfaces {
  recall: Pick<PromptRecallHandle, 'end' | 'clearMissing'>;
  attachments: Pick<AttachmentsHandle, 'dismissFailureOnKeystroke'>;
  skill: Pick<SkillComposerHandle, 'onTextChange'>;
}

/** The chat a switch was asked from, and where its outcome shows. */
export interface SwitchSurfaces {
  /** This render's project and whether the chat is busy, read again when main answers. */
  facts: { readonly current: { workspacePath: string | undefined; busy: boolean } };
  manualDraft: { readonly current: ManualComposerDraft };
  command: (harness: HarnessId, source: 'menu' | 'failure') => Promise<AgentCommandAcceptance>;
  announcedSessionId: string | undefined;
  workspacePath: string | undefined;
  openSetup: (harness: HarnessId) => void;
  refused: () => void;
}

/** The chat as the refill finds it. */
interface RefillChat {
  announcedSessionId: string | undefined;
  workspacePath: string | undefined;
  harnessId: HarnessId | undefined;
}

/** What a take reads when main answers, and where the prompt it lifted lands. */
export interface PenSurfaces {
  /** The composer as last rendered: text typed during the round trip is kept (ONL-2519). */
  composer: { readonly current: string };
  workspace: { readonly current: string | undefined };
  focus: () => void;
  restoreImages: AttachmentsHandle['restore'];
  setSkill: SkillComposerHandle['setSelected'];
}

/** The picks and chips a walk through earlier prompts returns to (ONL-2509). */
type RecallSnapshot = Pick<ManualComposerDraft, 'elements' | 'selectedNodeIds' | 'artifacts'>;

/** Where a stored draft lands. */
export interface DraftSurfaces {
  focus: () => void;
  attachments: Pick<AttachmentsHandle, 'restore'>;
  skill: Pick<SkillComposerHandle, 'setSelected'>;
  recall: Pick<PromptRecallHandle, 'setArtifacts' | 'markSaved'>;
}

/** The canvas as a send leaves it; the session imports nothing of the canvas. */
interface SendCanvas {
  dismissGatherRefusal: () => void;
  setPicking: (isPicking: boolean) => void;
  closeInlineChat: (evidence: readonly ElementEvidence[]) => void;
  removeElement: (id: string) => void;
}

/** The render the send was pressed in: what it carries is that render's, and so is what it clears. */
export interface SendSurfaces {
  unsupportedPdf: string | undefined;
  skill: Pick<SkillComposerHandle, 'standing' | 'selected' | 'setSelected' | 'onSendSettled' | 'onSendFailed'>;
  attachments: Pick<AttachmentsHandle, 'refs' | 'remove' | 'dismissFailure'>;
  recall: Pick<PromptRecallHandle, 'artifacts' | 'setArtifacts' | 'clearMissing'>;
  submit: (request: ChatSubmitRequest) => Promise<PromptSubmitResult>;
  canvas: SendCanvas;
}

export interface ChatSession {
  /** A surface outside chat asked the composer to hold some text. */
  ask: (request: ComposerRequest, focus: () => void) => void;
  edit: (value: string, surfaces: EditSurfaces) => void;
  /** Kept from the walk's first step, and dropped with the chat it was taken in (ONL-2509). */
  holdRecallDraft: (snapshot: RecallSnapshot | undefined) => void;
  /** One recalled step's text is in the composer; answers with the snapshot a step back to the draft returns to. */
  recalled: (prompt: RetryPrompt, isDraft: boolean) => RecallSnapshot | undefined;
  /** Text placed with no revision: a send in flight still clears it. */
  put: (value: string) => void;
  send: (text: string, surfaces: SendSurfaces) => Promise<void>;
  /** One prompt at a time, and none while the agent is being switched. */
  submit: (run: (inFlight: { current: boolean }) => Promise<PromptSubmitResult>) => Promise<PromptSubmitResult>;
  /** Asks main for the other agent; a second ask, or one while the chat is busy, is dropped. An agent that is not ready opens its setup. */
  switchTo: (harness: HarnessId, ready: boolean, failed: RetryPrompt | undefined, manual: boolean, surfaces: SwitchSurfaces) => void;
  /** While main is asked, the draft a manual switch carries is the latest one rendered. */
  followDraft: (phase: SwitchPhase, draft: ManualComposerDraft) => void;
  /** The project changed: the switch in flight is abandoned and its late answer is dropped. */
  leave: () => void;
  /** Puts the held draft back once the new chat is announced (ONL-2509). */
  refill: (pending: PendingRefill | undefined, chat: RefillChat, recall: Pick<PromptRecallHandle, 'restore' | 'restoreDraft'>) => void;
  /** The refill's reads are back: the switch is over. */
  settleSwitch: (phase: SwitchPhase, isRestoring: boolean) => void;
  /** The project landed: reads its stored draft into the composer as it stood then. The release retires the read, and a retired read restores nothing. */
  land: (workspacePath: string, composer: ComposerSnapshot, surfaces: DraftSurfaces) => () => void;
  /** The pen's own return takes no focus and reports itself as one; a press of Edit does the opposite (ONL-2519). */
  takePen: (penId: number, by: 'pen' | 'designer', surfaces: PenSurfaces) => void;
  /** Returns a held prompt to the composer once per pen, when nothing else holds the composer (ONL-2519). */
  returnPen: (read: PenReturnRead, take: (penId: number) => void) => void;
  /** One timer at the crossing, never a poll: a healthy turn re-renders the transcript no extra times (ONL-2491). */
  watchNotice: (dueAt: number | undefined) => (() => void) | undefined;
  /** Runs while the silence notice shows; a healthy turn never reaches it (ONL-2903). */
  countSilence: () => () => void;
  /** Latched per turn: a hung turn emits no `result`, so nothing else measures it (ONL-2491). */
  reportSilence: (
    notice: ProviderNotice | undefined,
    session: Pick<SessionState, 'sessionId' | 'harnessId' | 'turnStartedAt' | 'silentSince'>,
    projectFields: () => Omit<RendererTelemetryEventMap['agent_silence_shown'], keyof SilenceReport['properties']>,
  ) => void;
  /** Waits for the next plan limit to reset; nothing to wait for is no watch. */
  watchLimits: (limits: readonly RateLimitWindow[]) => (() => void) | undefined;
  /** Each limit card is reported the first time it is shown, once. */
  reportLimits: (items: readonly TranscriptItem[], agent: HarnessId, sessionId: string | undefined, live: LiveErrors) => void;
  dismissNotice: (errorId: string) => void;
  setSignInAside: (turnId: string) => void;
  /** Dropped the moment the waiting prompt leaves by any route but a take (ONL-2294). */
  dropHeldPicks: (removeElement: (id: string) => void) => void;
}

/** Owns the chat's composer and what is in flight on it. `commit` receives every changed state, and nothing when a write changes nothing. */
export function createChatSession(commit: (state: ChatSessionState) => void): ChatSession {
  let state = INITIAL_CHAT_SESSION;
  /** Moves on every write that makes the text someone's own, so a late answer can tell it was overtaken. */
  let revision = 0;
  /** The picks a waiting prompt carried: kept while it waits so a take can rebuild its context from the live selection (ONL-2294). */
  let heldPicks: string[] = [];
  let penReturned: PenReceipt = {};
  let reportedSilence: number | undefined;
  const reportedLimits = new Set<string>();
  let recallDraft: RecallSnapshot | undefined;
  /** Every ask for a switch takes the next run; `switching` is the one in force, and an answer for any other is dropped. */
  let switchRun = 0;
  let switching: number | undefined;
  let switchingDraft: ManualComposerDraft | undefined;
  /** The draft read in force; a landing or a release moves it, and an answer from an older one stops there. */
  let restoreRun = 0;

  const set = (patch: Partial<ChatSessionState>): void => {
    const keys = Object.keys(patch) as (keyof ChatSessionState)[];
    if (keys.every((key) => Object.is(state[key], patch[key]))) return;
    state = { ...state, ...patch };
    commit(state);
  };

  const write = (value: string): void => {
    revision += 1;
    set({ composerValue: value });
  };

  const dropHeldPicks = (removeElement: (id: string) => void): void => {
    const ids = heldPicks.splice(0);
    for (const id of ids) removeElement(id);
  };

  const inFlight = {
    get current(): boolean {
      return state.send === 'sending';
    },
    set current(value: boolean) {
      set({ send: value ? 'sending' : 'idle' });
    },
  };

  return {
    ask: (request, focus) => {
      // Focus precedes the value, as in the draft restore: the caret lands at the end only when the editable already holds focus.
      focus();
      revision += 1;
      if (request.text !== undefined) set({ composerValue: request.append === true ? [state.composerValue, request.text].filter(Boolean).join('\n\n') : request.text });
    },
    edit: (value, { recall, attachments, skill }) => {
      // The keystroke makes it the user's draft, so a pass still reading must not land on it.
      recall.end('edit');
      write(value);
      set({ sendRejected: false });
      attachments.dismissFailureOnKeystroke();
      skill.onTextChange(value);
      recall.clearMissing();
    },
    holdRecallDraft: (snapshot) => {
      recallDraft = snapshot;
    },
    recalled: (prompt, isDraft) => {
      const saved = isDraft ? recallDraft : undefined;
      write(prompt.text);
      set({ sendRejected: false });
      return saved;
    },
    put: (value) => set({ composerValue: value }),
    send: async (text, { unsupportedPdf, skill, attachments, recall, submit, canvas }) => {
      if (unsupportedPdf !== undefined) return;
      if (skill.standing === 'gone') { set({ sendRejected: true }); return; }
      skill.onSendSettled();
      const submittedRevision = revision;
      set({ sendRejected: false });
      // The refusal steps aside for the send it would outrank, however the send
      // lands: a rejected one never reaches the disarm below (ONL-2482).
      canvas.dismissGatherRefusal();
      // `insertToken` leaves a no-break space after the token; the prompt carries a plain one.
      const result = await submit({ text: text.replaceAll(' ', ' '), images: attachments.refs(), skills: skill.selected ? [skill.selected] : [], artifacts: recall.artifacts, answersQuestion: true });
      if (result.outcome !== 'accepted') {
        skill.onSendFailed();
        if (result.outcome === 'rejected' || result.outcome === 'failed') set({ sendRejected: true });
        return;
      }
      // The prompt it qualified is gone; what it could not restore is no longer the composer's news.
      recall.clearMissing();

      // Revision, not value equality: the same text retyped while IPC is pending must survive.
      if (shouldClearComposerText(submittedRevision, revision)) set({ composerValue: '' });
      // The mode ends where the composer says it does, and sending is one of those
      // places: without this the next canvas click is another chip (ONL-2455).
      canvas.setPicking(false);
      // A send that carried the open surface's anchor closes it first, or the
      // removal below is refused and the surface is left pointing at a sent
      // element with no control that can clear it (ONL-2455).
      canvas.closeInlineChat(result.submitted.evidence);
      // Only the submitted snapshots; attachments admitted while pending stay in the next draft.
      for (const ref of result.submitted.images) attachments.remove(ref.id);
      skill.setSelected((current) => result.submitted.skills?.[0] === current ? undefined : current);
      const sentArtifacts = new Set((result.submitted.artifacts ?? []).map(artifactChipId));
      recall.setArtifacts((refs) => refs.filter((artifact) => !sentArtifacts.has(artifactChipId(artifact))));
      if (shouldClearElementPicks(result.held)) {
        // Any earlier waiting prompt was joined into this one, so its picks go too.
        dropHeldPicks(canvas.removeElement);
        for (const item of result.submitted.evidence) canvas.removeElement(item.id);
      } else {
        const ids = result.submitted.evidence.map((item) => item.id);
        heldPicks = [...new Set([...heldPicks, ...ids])];
      }
      attachments.dismissFailure();
    },
    submit: (run) => switching !== undefined ? Promise.resolve({ outcome: 'in-flight' }) : run(inFlight),
    switchTo: (harness, ready, failed, manual, surfaces) => {
      if (switching !== undefined || surfaces.facts.current.busy) return;
      if (!ready) {
        surfaces.openSetup(harness);
        return;
      }
      switchRun += 1;
      const run = switchRun;
      switching = run;
      switchingDraft = manual ? surfaces.manualDraft.current : undefined;
      set({ switch: 'request' });
      const refuse = (): void => {
        if (switching !== run) return;
        switching = undefined;
        switchingDraft = undefined;
        set({ switch: 'idle' });
        surfaces.refused();
      };
      void switchAgent(harness, failed, surfaces.announcedSessionId, {
        command: (next) => surfaces.command(next, manual ? 'menu' : 'failure'),
        workspacePath: surfaces.workspacePath,
        ...(manual ? { captureManual: () => switchingDraft ?? surfaces.manualDraft.current } : {}),
        hold: (pending) => {
          if (switching === run && surfaces.facts.current.workspacePath === surfaces.workspacePath) set({ pendingRefill: pending });
        },
      }).then((accepted) => { if (!accepted) refuse(); }, refuse);
    },
    followDraft: (phase, draft) => {
      if (phase === 'request' && switchingDraft !== undefined) switchingDraft = draft;
    },
    leave: () => {
      switching = undefined;
      switchingDraft = undefined;
      set({ switch: 'idle', pendingRefill: undefined });
    },
    refill: (pending, chat, recall) => {
      const refill = refillDue(pending, chat.announcedSessionId, chat.workspacePath, chat.harnessId);
      if (refill === undefined) return;
      set({ pendingRefill: undefined });
      if (refill.kind === 'manual') {
        const draft = switchingDraft ?? refill.draft;
        recallDraft = draft;
        recall.restoreDraft(draft.prompt);
        recallDraft = undefined;
      } else if (refill.kind === 'failed') {
        recall.restore(refill.prompt, false);
      }
      switchingDraft = undefined;
      set({ switch: 'restore' });
    },
    settleSwitch: (phase, isRestoring) => {
      if (phase !== 'restore' || isRestoring) return;
      switching = undefined;
      set({ switch: 'idle' });
    },
    land: (workspacePath, composer, { focus, attachments, skill, recall }) => {
      restoreRun += 1;
      const run = restoreRun;
      const restoreRevision = revision;
      void studio()
        .draftState({ cwd: workspacePath })
        .catch(() => EMPTY_COMPOSER_DRAFT)
        .then(async (stored) => {
          const artifacts = await restoreArtifactReferences(stored.artifacts ?? [], (artifactId) => studio().artifactRead({ artifactId }));
          if (restoreRun !== run) return;
          const unchanged = revision === restoreRevision;
          const restore = unchanged ? planDraftRestore(stored, composer) : null;
          if (restore !== null) {
            // Focus precedes the value: the composer puts the caret at the end of an external override only when the editable already holds focus.
            focus();
            write(restore.text);
          }
          // The chips too, or a cooled tab comes back with its text and none of its work (ONL-2207).
          if (stored.images.length > 0) attachments.restore(stored.images);
          if (unchanged) skill.setSelected(stored.skills?.[0]);
          recall.setArtifacts(artifacts);
          // Seeded with what was read: the save would otherwise land an empty draft in the gap before the chips are admitted.
          recall.markSaved(workspacePath, stored);
          set({ restoredFor: workspacePath });
        });
      return () => {
        restoreRun += 1;
      };
    },
    takePen: (penId, by, { composer, workspace, focus, restoreImages, setSkill }) => {
      // Forgotten before the call, never after: the pen's absence arrives on its own channel, and
      // the composer owns these picks from here (ONL-2294).
      const picks = heldPicks;
      heldPicks = [];
      void studio()
        .agentCommand({ type: 'pen.take', penId, auto: by === 'pen' })
        .then((acceptance) => {
          // Never assumes it got the text: a retired id answers with no take and the composer is left alone.
          // Read at resolve time, so text typed during the round trip is kept (ONL-2519).
          const draft = draftAfterTake(composer.current, acceptance.taken);
          if (draft === null) {
            heldPicks = picks;
            // Not recorded as returned, so a later state change can try again (ONL-2519).
            penReturned = withoutWorkspace(penReturned, workspace.current);
            return;
          }
          // Focus precedes the value: the composer puts the caret at the end of an external override only when the editable already holds focus.
          if (focusesOnTake(by)) focus();
          write(draft.text);
          if (draft.images.length > 0) restoreImages(draft.images);
          // Unconditional: a pen that returned no skill clears the one standing (ONL-2047).
          setSkill(draft.skills?.[0]);
        })
        .catch(ignoreRefusal('chat', 'pen take'));
    },
    returnPen: (read, take) => {
      const step = penReturnStep(read, penReturned);
      // Written before the take is issued: the pen stays published until the take lands, and a
      // keystroke re-runs this effect in the meantime (ONL-2519).
      penReturned = step.receipt;
      if (step.take !== undefined) take(step.take.penId);
    },
    watchNotice: (dueAt) => {
      if (dueAt === undefined) {
        set({ noticeClock: undefined });
        return undefined;
      }
      const wait = dueAt - Date.now();
      if (wait <= 0) {
        set({ noticeClock: dueAt });
        return undefined;
      }
      set({ noticeClock: undefined });
      const id = setTimeout(() => set({ noticeClock: dueAt }), wait);
      return () => clearTimeout(id);
    },
    countSilence: () => {
      const id = setInterval(() => set({ silenceTick: state.silenceTick + 1 }), 1_000);
      return () => clearInterval(id);
    },
    reportSilence: (notice, session, projectFields) => {
      const report = silenceReport(notice, session, Date.now(), reportedSilence);
      if (report === undefined) return;
      reportedSilence = report.turn;
      studio().telemetryEvent({
        event: 'agent_silence_shown',
        properties: { ...projectFields(), ...report.properties },
      });
    },
    watchLimits: (limits) => {
      const now = Date.now();
      const reset = nextLimitReset(limits, now);
      if (reset === undefined) return undefined;
      const refresh = (): void => set({ limitClock: state.limitClock + 1 });
      const timer = setTimeout(refresh, Math.min(reset - now, 2147483647));
      // A Mac that slept past the reset fires the timer late (ONL-2903).
      window.addEventListener('focus', refresh);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('focus', refresh);
      };
    },
    reportLimits: (items, agent, sessionId, live) => {
      const reports = limitCardReports(items, agent, sessionId, live, reportedLimits);
      for (const report of reports) studio().telemetryEvent({ event: 'rate_limit_card_shown', properties: report });
    },
    dismissNotice: (errorId) => set({ dismissedNotices: new Set(state.dismissedNotices).add(errorId) }),
    setSignInAside: (turnId) => set({ signInSetAsideTurn: turnId }),
    dropHeldPicks,
  };
}
