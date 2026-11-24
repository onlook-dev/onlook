import { DropdownMenu, DropdownMenuItem } from '@astryxdesign/core/DropdownMenu';
import { MENU_SURFACE } from '../menu/surface.js';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { HStack } from '@astryxdesign/core/Layout';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { usePopover } from '@astryxdesign/core/Popover';
import { usePermissionControl } from './usePermissionControl.js';
import { useFlag } from '../flags/store.js';
import { log } from '../log.js';
import { ConnectorsIcon } from '../icons/glyphs.js';
import { CAP_GLYPH } from '../icons/capGlyph.js';
import { CONNECTORS_MENU_EXIT_MS, CONNECTORS_MENU_WIDTH, ConnectorsMenu } from './connectors/ConnectorsMenu.js';
import { ConnectorsNotice } from './connectors/ConnectorsNotice.js';
import { showsConnectorsNotice } from './connectors/model.js';
import { useProjectsStore } from '../projects/store.js';
import { useRecentConnectors } from './connectors/useRecentConnectors.js';
import { useConnectorsMenuMaxHeight } from './connectors/useConnectorsMenuMaxHeight.js';
import { ChatComposerDrawer, type ChatComposerInputHandle } from '@astryxdesign/core/Chat';
import { useToast } from '@astryxdesign/core/Toast';
import { ChatPanel, isComposerConnected, isOfferingNextTasks, placeNextTasks, isSignInShaped, signInPlacement, type ChatStrings, type ComposerFacts, type ComposerSlots, type ComposerStatus, type ConnectionRemedy, type NextTaskPick, type ToolFrameLinks } from '@studio/chat-ui';
import { askedSetupFailure, notificationInvitationAsks, frameLinkMarkdown, parseFrameLink, parseTabLink, latestSetupTurnSteps, resendOfLastPrompt, retriesAsSetupAsk, setupTurnCards, type SetupStepsLive, type EffortLevel, type ResumeMethod, type HarnessId, type ModelRefusal, type QuestionAnswers, type RetryPrompt } from '@studio/events';
import { useLatestRef } from '../useLatestRef.js';
import { failedSetupLineKey, narrationFor, usePaintedCreateState } from '../create/projectCreate.js';
import { hasLiveEntry, useServerStore } from '../server/store.js';
import { AppRunNotice } from '../server/RunNotice.js';
import { runFeedback } from '../server/runFeedbackStore.js';
import { selectProjectSetupSnapshot, useProjectSetupStore } from '../project-setup/store.js';
import { SETUP_STEP_GLYPHS } from './setupStepGlyphs.js';
import { publishSetupTurn, useImportSetupProgress, useSetupCanvas } from '../create/setupProgress.js';
import { useSetupFailure } from '../canvas/useSetupFailureCard.js';
import { artifactFrameNames } from './artifactFrames.js';
import { ArtifactChipPreview } from '../canvas/artifact/ArtifactChipPreview.js';
import { useArtifactListing } from '../canvas/artifact/listing.js';
import { AttachmentChips } from './AttachmentChips.js';
import { ElementChips } from './ElementChips.js';
import { FrameChips } from './FrameChips.js';
import type { ArtifactAttachment, MessageAction, MessageActionRole, PromptAttachment, PromptRecallNextAction } from '@studio/events';
import { ChatPanelFrame } from './ChatPanelFrame.js';
import { NewChatDialog } from './NewChatDialog.js';
import { TouchedFilesCard } from './TouchedFilesCard.js';
import { newChatRefusalFor } from './newChatRefusal.js';
import { resolveCanvasImageRef } from './canvasImageRefs.js';
import { resolveImage } from './imageCache.js';
import { composerControls } from './composerControls.js';
import { planLimits } from './limitCopy.js';
import { chatStrings } from './chatStrings.js';
import { createChatSession, INITIAL_CHAT_SESSION } from './chatSession.js';
import { chatPanelProps, modelMenuFooter, PANEL_ICONS, setupNarration } from './panelProps.js';
import { composerStatusFor } from './composerStatus.js';
import { useAttachments } from './useAttachments.js';
import { pickNextTask, releaseNextTask, sendTappedTask, useNextTaskPicks } from './nextTaskPick.js';
import { BlankChatWelcome } from './BlankChatWelcome.js';
import { blankWelcomePrompt, type BlankWelcomeRow } from './blankWelcome.js';
import { appPictureLoads, useNextTaskPictures } from './NextTaskPicture.js';
import { useSkillComposer } from './useSkillComposer.js';
import type { AgentSkill, SkillAttachment } from '@studio/events';
import { useEditorImageDrop } from './useEditorImageDrop.js';
import { submitPrompt, type PromptSubmitResult } from './submitPrompt.js';
import { registerChatSubmit, type ChatSubmitRequest } from './submitRegistry.js';
import { artifactChipId, planRecalledElements, planRecalledFrames, restoredArtifactLabels } from './draftRestore.js';
import { usePromptRecall, type RecalledPayload } from './usePromptRecall.js';
import {
  ElementPickerIcon,
  PaperclipIcon,
  PlusIcon,
  RunShortcutIcon,
  SendArrowIcon,
  PlayGlyph,
  WindowGlyph,
} from '../icons/glyphs.js';
import { isRailHidden, useCanvasStore } from '../canvas/store.js';
import { frameFlowNodes, isLocalUrl } from '../canvas/model.js';
import { canvasNodeFacts, selectedObjects, soleNodeIdNamed } from '../canvas/selection.js';
import { closeInlineChatCarrying } from '../canvas/useInlineElementChat.js';
import { t } from '@studio/i18n';
import { ignoreRefusal } from '../refusal.js';
import { isBlankWorkspace, sessionCovered, telemetryProjectFields, useWorkspaceStore } from '../workspace/store.js';
import { chooseProjectSource } from '../workspace/sourceFolder.js';

import { useAgentSession } from './useAgentSession.js';
import { canStartSignIn, isSetAsideable, SignInNotice } from '@studio/onboarding-ui';
import { CARD_GLYPHS } from '../agent-setup/glyphs.js';
import { mappedSetupFor } from '../agent-setup/dialog.js';
import { makeSetupController, SetupDialogHost, setupStrings } from '../agent-setup/SetupDialogHost.js';
import { accountLink, openAccountLink } from '../agents/accountLinks.js';
import { isClaudeConnected, isCodexConnected } from '../agents/mapping.js';
import { useAgentSetupStore } from '../agent-setup/store.js';
import { playChime } from './chime.js';
import { useSettingsStore } from '../settings/store.js';
import { TipsPill } from './TipsPill.js';
import { showsComposerTipsPill } from './composerTips.js';
import { workingRowCopy, type ResolvedFrame } from './workingRow.js';
import { isSetupTurnStart, isStatusListShown, statusWaiting } from '../agentStatus/lines.js';
import { dispatchAgentStatus, setStatusWaiting, useAgentStatusStore } from '../agentStatus/store.js';
import { setNextTasksOffered } from '../sidebar/footStore.js';
import { requestStop, sendWithChime, settleStreaming, watchFrom } from './settleChime.js';
import { providerNotice, providerNoticeDueAt } from './providerNotice.js';
import type { ManualComposerDraft } from './agentSwitch.js';
import { requestComposerFocus, useComposerRequest } from './composerRequest.js';
import { NotificationInvitation, useNotificationControls } from '../notifications/NotificationSurfaces.js';
import { studio } from '../bridge.js';
import './chat.css';

const EMPTY_SKILLS: readonly AgentSkill[] = [];

const COMPOSER_ACTIONS_ANCHOR = { anchorName: '--chat-composer-actions' } as React.CSSProperties;
/* Above "+", flush with the composer's leading edge, and never past the window's edge less 8px (ONL-3193). */
const CONNECTORS_MENU_SEAT = {
  positioning: 'custom',
  style: { inset: 'auto', margin: 0, left: 'anchor(--chat-composer-actions left)', right: 8, bottom: 'anchor(top)', width: 'auto', maxWidth: CONNECTORS_MENU_WIDTH, '--connectors-exit': `${String(CONNECTORS_MENU_EXIT_MS)}ms` } as React.CSSProperties,
} as const;

// The `DEV` guard is load-bearing: Vite inlines `VITE_*` at build time, so without it a packaging-environment `VITE_STUDIO_TARGET_DIR` ships in every user's app; the agent host refuses a directory it did not register (ONL-1829).
const DEV_CWD = import.meta.env.DEV
  ? (import.meta.env.VITE_STUDIO_TARGET_DIR as string | undefined)
  : undefined;

function artifactRefsOf(objects: readonly { artifactId?: string; name: string; pagePath?: string }[]): ArtifactAttachment[] {
  return objects.flatMap((object) => object.artifactId === undefined
    ? []
    : [{ kind: 'artifact' as const, artifactId: object.artifactId, title: object.name, ...(object.pagePath === undefined ? {} : { pagePath: object.pagePath }) }]);
}

const RESEND_STOP_BOUND_MS = 10_000;

function wrapInArtifactPreview(attachment: Pick<ArtifactAttachment, 'artifactId' | 'pagePath' | 'title'>, pill: ReactNode): ReactNode {
  return (
    <ArtifactChipPreview artifactId={attachment.artifactId} {...(attachment.pagePath === undefined ? {} : { pagePath: attachment.pagePath })} title={attachment.title}>
      {pill}
    </ArtifactChipPreview>
  );
}

/** Read when a row renders, never subscribed: the panel would re-render the transcript on every canvas edit. */
function canvasNameOf(id: string): string | undefined {
  const doc = useCanvasStore.getState().doc;
  const node = doc?.nodes[id];
  if (node !== undefined) return node.name || undefined;
  const page = doc?.pages[id];
  if (page !== undefined) return page.name || undefined;
  return useArtifactListing.getState().records?.find((artifact) => artifact.id === id)?.title || undefined;
}

export function ChatRegion(): React.JSX.Element {
  const workspace = useWorkspaceStore((state) => state.workspace);
  const session = useAgentSession(workspace?.workspacePath);
  // Blank while a switch is in flight (ONL-2139); the hook stays mounted so nothing is missed.
  const isSwitching = useWorkspaceStore(sessionCovered);
  // The creation record gates the resting mock; the painted state (ONL-2179) feeds the narration line.
  const paintedCreating = usePaintedCreateState();
  const hasLiveServer = useServerStore((state) => hasLiveEntry(state.entries));
  const serverEntries = useServerStore((state) => state.entries);
  const setupSnapshot = useProjectSetupStore(selectProjectSetupSnapshot);
  const setupLive = useMemo<SetupStepsLive>(() => ({
    snapshot: setupSnapshot,
    livePorts: serverEntries.flatMap((entry) => entry.ports.filter((port) => port.measured === 'live').map((port) => port.port)),
  }), [setupSnapshot, serverEntries]);
  const setupCanvas = useSetupCanvas();
  const composerHandle = useRef<ChatComposerInputHandle | null>(null);
  const notificationControls = useNotificationControls();
  useEffect(() => studio().onChatFocus(() => {
    const canvas = useCanvasStore.getState();
    if (isRailHidden(canvas, 'right')) canvas.toggleRail('right');
    requestAnimationFrame(() => composerHandle.current?.focus());
  }), []);
  const [chat, setChat] = useState(INITIAL_CHAT_SESSION);
  // Committed through this render's own state setter, so a write batches with the hooks' writes around it exactly as a `useState` would.
  const [model] = useState(() => createChatSession(setChat));
  const composerValue = chat.composerValue;
  // Render state, or a return gated behind a submit waits for an unrelated keystroke (ONL-2519).
  const isSendInFlight = chat.send === 'sending';
  const sendRejected = chat.sendRejected;
  const [isNewChatOpen, setNewChatOpen] = useState(false);
  const attachmentAgent = session.state.harnessId ?? session.connection.harness ?? 'claude';
  const attachments = useAttachments(session.sessionCwd, workspace?.workspacePath, attachmentAgent);
  const skillComposer = useSkillComposer({
    text: composerValue,
    input: composerHandle,
    agent: attachmentAgent,
    skills: session.state.skills ?? EMPTY_SKILLS,
    heard: session.state.skills !== undefined,
    unavailable: session.state.skillsUnavailable === true,
    disabled: session.sessionCwd === undefined || !isComposerConnected(session.connection.status),
    onActed: attachments.dismissFailure,
  });
  const isPicking = useCanvasStore((state) => state.isPicking);
  const setPicking = useCanvasStore((state) => state.setPicking);
  // A pick the caps turned away with no bubble to say so: this composer is the surface (ONL-2482).
  const gatherRefusal = useCanvasStore((state) => state.gatherRefusal);
  const dismissGatherRefusal = useCanvasStore((state) => state.dismissGatherRefusal);
  const elementSelections = useCanvasStore((state) => state.elementSelections);
  const removeElementSelection = useCanvasStore((state) => state.removeElementSelection);
  // Names from the document, not the composed nodes, whose identity changes on every mid-drag hold.
  const selectedNodeIds = useCanvasStore((state) => state.selectedNodeIds);
  const canvasDoc = useCanvasStore((state) => state.doc);
  const artifacts = useArtifactListing((state) => state.records);
  const artifactTitles = useMemo(() => new Map((artifacts ?? []).map((artifact) => [artifact.id, artifact.title])), [artifacts]);
  const selectFrame = useCanvasStore((state) => state.selectFrame);
  // The gather-toggle on a selected member deselects it. Stable, or the composer's slot memo recomputes on every render.
  const deselectFrame = useCallback((id: string) => selectFrame(id, true), [selectFrame]);
  const workspacePath = workspace?.workspacePath;
  const restoredFor = chat.restoredFor;
  const recall = usePromptRecall({
    chat: { workspacePath, sessionId: session.announcedSessionId },
    attachments,
    canvas: { deselectFrame, removeElement: removeElementSelection },
    take: takeRecalledPrompt,
    // Read from an effect, never during a render: `frameSelections` below needs what this hook returns (ONL-2509).
    draft: () => {
      if (restoredFor !== workspacePath) return undefined;
      const chipped = artifactRefsOf(frameSelections);
      return { text: composerValue, images: attachments.refs(), ...(skillComposer.selected ? { skills: [skillComposer.selected] } : {}), ...(chipped.length === 0 ? {} : { artifacts: chipped }) };
    },
  });
  const frameSelections = useMemo(() => {
    // Every node, not the selected ones: a chip must carry the tag whether or not its twin is attached.
    const among = Object.values(canvasDoc?.nodes ?? {});
    const selected = selectedObjects(selectedNodeIds, (id) => canvasNodeFacts(canvasDoc?.nodes[id], t, among, artifactTitles));
    const current = new Set(selected.flatMap((object) => object.artifactId === undefined ? [] : [artifactChipId({ artifactId: object.artifactId, ...(object.pagePath === undefined ? {} : { pagePath: object.pagePath }) })]));
    const restoredLabels = restoredArtifactLabels(recall.artifacts, among.flatMap((node) => node.kind === 'artifact' ? [{ id: node.content.artifactId, title: node.content.title }] : []), artifactTitles);
    return [...selected, ...recall.artifacts.flatMap((artifact) => {
      if (current.has(artifactChipId(artifact))) return [];
      const title = artifactTitles.get(artifact.artifactId) ?? artifact.title;
      return [{id: artifactChipId(artifact), kind: 'artifact' as const, name: title, label: restoredLabels.get(artifact.artifactId) ?? title, artifactId: artifact.artifactId, ...(artifact.pagePath === undefined ? {} : {pagePath: artifact.pagePath})}];
    })];
  }, [selectedNodeIds, canvasDoc, recall.artifacts, artifactTitles]);
  const manualDraft = useLatestRef<ManualComposerDraft>({
    prompt: { text: composerValue, attachments: [...attachments.refs(), ...(skillComposer.selected ? [skillComposer.selected] : [])] },
    elements: [...elementSelections],
    selectedNodeIds: [...selectedNodeIds],
    artifacts: [...recall.artifacts],
  });
  // The same predicate the panel disables itself by; a looser one accepts chips into an input nobody can send from.
  const isImageDropActive = useEditorImageDrop(
    recall.payload.acceptFiles,
    session.sessionCwd !== undefined && isComposerConnected(session.connection.status),
  );
  const openLocalLink = useCanvasStore((state) => state.openLocalLink);
  const flyToFrame = useCanvasStore((state) => state.flyToFrame);
  const hoverNode = useCanvasStore((state) => state.hoverNode);
  const showToast = useToast();

  // An ambiguous name resolves to nothing: flying to the first of two same-named frames is a coin toss the user cannot see.
  const frameIdForName = useCallback(
    (name: string): string | undefined => soleNodeIdNamed(useCanvasStore.getState().doc?.nodes, name),
    [],
  );

  // Every page, never the composed one: a chip for a frame on another page keeps its artifact treatment (ONL-2488).
  const artifactNames = useCanvasStore((state) =>
    artifactFrameNames(Object.values(state.doc?.nodes ?? {}), t, artifactTitles),
  );
  const isFrameArtifact = useCallback(
    // An empty label names nothing, so it never matches.
    (name: string): boolean => name !== '' && artifactNames.split('\n').includes(name),
    [artifactNames],
  );

  // Hover must not move anything; the sidebar's scroll-into-view is keyed on the selected frame.
  const hoverFrameByName = useCallback(
    (name: string, isHovered: boolean): void => {
      if (!isHovered) {
        hoverNode(null);
        return;
      }
      const id = frameIdForName(name);
      if (id !== undefined) hoverNode(id);
    },
    [frameIdForName, hoverNode],
  );

  const toolFrameLinks = useMemo<ToolFrameLinks>(() => ({
    icon: WindowGlyph,
    onActivate: (frameId) => {
      if (!flyToFrame(frameId)) showToast({ body: t('chat.frameLink.gone'), type: 'info' });
    },
    onHover: (frameId, isHovered) => hoverNode(isHovered ? frameId : null),
  }), [flyToFrame, hoverNode, showToast]);

  const activateFrameByName = useCallback(
    (name: string): boolean => {
      const id = frameIdForName(name);
      if (id !== undefined && flyToFrame(id)) return true;
      // Silence on a dead chip reads as broken.
      showToast({ body: t('chat.frameLink.gone'), type: 'info' });
      return false;
    },
    [frameIdForName, flyToFrame, showToast],
  );

  /** A sent artifact chip centres the canvas on the first node showing that artifact on this page (ONL-2593). */
  const activateArtifact = useCallback(
    (artifactId: string, pagePath: string | undefined): boolean => {
      const canvas = useCanvasStore.getState();
      const node = Object.values(canvas.doc?.nodes ?? {}).find((candidate) =>
        candidate.kind === 'artifact' &&
        candidate.pageId === canvas.currentPageId &&
        candidate.content.artifactId === artifactId &&
        (pagePath === undefined || candidate.content.pagePath === undefined || candidate.content.pagePath === pagePath));
      if (node !== undefined && flyToFrame(node.id)) return true;
      showToast({ body: t('chat.artifactLink.gone'), type: 'info' });
      return false;
    },
    [flyToFrame, showToast],
  );

  const openLink = useCallback((href: string): void => {
    // Before the scheme gate, which would drop it; the identity guard keeps another project's link off this one's frame ids.
    const link = parseFrameLink(href);
    if (link !== null) {
      const isThisProject = link.repoIdentity === workspace?.repoIdentity;
      if (!isThisProject || !flyToFrame(link.frameId)) {
        showToast({ body: t('chat.frameLink.gone'), type: 'info' });
      }
      return;
    }

    // After the frame parser, which is the stricter of the two: a frame link carries a project prefix.
    const tabLink = parseTabLink(href);
    if (tabLink !== null) {
      void studio().revealTab(tabLink).then((revealed) => {
        if (!revealed) showToast({ body: t('chat.tabLink.gone'), type: 'info' });
      });
      return;
    }

    // This href is model output and `window.open` reaches `shell.openExternal` with no prompt; only http(s) passes.
    let scheme: string;
    try {
      scheme = new URL(href, window.location.href).protocol;
    } catch {
      return;
    }
    if (scheme !== 'http:' && scheme !== 'https:') return;
    if (isLocalUrl(href)) openLocalLink(href);
    else window.open(href, '_blank', 'noopener,noreferrer');
  }, [workspace?.repoIdentity, flyToFrame, openLocalLink, showToast]);

  useEffect(() => {
    if (DEV_CWD) session.startSession(DEV_CWD);
    // Once: re-starting per render tears the session down and re-settles permissions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const composerRequest = useComposerRequest((state) => state.request);
  useEffect(() => {
    if (composerRequest === null) return;
    model.ask(composerRequest, () => composerHandle.current?.focus());
    // Spent once read, or a later remount would type it again.
    useComposerRequest.setState({ request: null });
  }, [composerRequest, model]);

  // Keyed to the project landing, not to mount: this surface renders blank while switching, and the session cwd arrives later than the project.
  useEffect(() => {
    if (workspacePath === undefined) return;
    return model.land(workspacePath, { text: composerValue }, { focus: () => composerHandle.current?.focus(), attachments, skill: skillComposer, recall });
    // The composer as the project lands is the snapshot; a later keystroke must not re-read the draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspacePath]);

  // The snapshot a walk returns to belongs to the chat it was taken in (ONL-2509).
  useEffect(() => {
    model.holdRecallDraft(undefined);
  }, [model, workspacePath, session.announcedSessionId]);

  const workingRowState = useAgentStatusStore((state) => state.status);
  useEffect(
    () =>
      studio().onAgentWorkingFrames((event) => {
        dispatchAgentStatus({ type: 'frames', frameIds: event.frameIds, ...(event.changes ? { changes: event.changes } : {}) });
        if (event.waitingOn !== undefined) dispatchAgentStatus({ type: 'waitingOn', what: event.waitingOn });
      }),
    [],
  );
  // The announced session, not `state.sessionId`: that one fills at the first turn, mid-row (ONL-2556).
  useEffect(() => {
    dispatchAgentStatus({ type: 'reset' });
  }, [session.announcedSessionId]);
  const waitingOn = statusWaiting(session.state);
  useEffect(() => {
    setStatusWaiting(waitingOn);
  }, [waitingOn]);
  const offersNextTasks = useMemo(() => isOfferingNextTasks(placeNextTasks(session.state.items, session.state.isStreaming)), [session.state.items, session.state.isStreaming]);
  useEffect(() => {
    setNextTasksOffered(offersNextTasks);
  }, [offersNextTasks]);
  useEffect(() => () => setNextTasksOffered(false), []);
  const transcript = useLatestRef(session.state.items);
  const chimeWatch = useRef(watchFrom(session.state.isStreaming));
  const questionPending = useLatestRef(session.state.questionParkedSince !== undefined);
  useEffect(() => {
    const isStreaming = session.state.isStreaming;
    runFeedback.observeAgent(isStreaming);
    if (isStreaming === chimeWatch.current.wasStreaming) return;
    const settled = settleStreaming(chimeWatch.current, isStreaming, session.state.pen);
    chimeWatch.current = settled.watch;
    dispatchAgentStatus({ type: 'streaming', isStreaming, isSetupTurn: isStreaming && isSetupTurnStart(transcript.current) });
    if (settled.chimes) playChime(useSettingsStore.getState().notificationSound);
  }, [session.state.isStreaming, session.state.pen]);
  const { interrupt } = session;
  const stopTurn = useCallback(() => {
    chimeWatch.current = requestStop(chimeWatch.current);
    runFeedback.cancelAgentStart();
    interrupt();
  }, [interrupt]);
  const skipQuestion = useCallback(() => {
    chimeWatch.current = requestStop(chimeWatch.current);
    runFeedback.cancelAgentStart();
    interrupt('question.skip');
  }, [interrupt]);
  const dismissedNotices = chat.dismissedNotices;
  const dismissNotice = useCallback((errorId: string) => model.dismissNotice(errorId), [model]);
  const signInSetAsideTurn = chat.signInSetAsideTurn;
  const { dismissQuestion: dismissSessionQuestion } = session;
  const dismissQuestion = useCallback(() => {
    void dismissSessionQuestion()
      .then((acceptance) => { if (!acceptance.accepted) showToast({ body: t('chat.permission.notDelivered'), type: 'info' }); })
      .catch(() => showToast({ body: t('chat.permission.notDelivered'), type: 'info' }));
  }, [dismissSessionQuestion, showToast]);

  // The picks a waiting prompt carried: kept while it waits so a take can rebuild its context from
  // the live selection, and dropped the moment it leaves by any other route (ONL-2294).
  const dropHeldPicks = useCallback((): void => model.dropHeldPicks(removeElementSelection), [model, removeElementSelection]);
  const isPenWaiting = session.state.pen !== undefined;
  useEffect(() => {
    if (!isPenWaiting) dropHeldPicks();
  }, [isPenWaiting, dropHeldPicks]);

  const resolveWorkingFrame = useCallback(
    (frameId: string): ResolvedFrame | undefined => {
      const node = useCanvasStore.getState().nodes.find((n) => n.id === frameId);
      if (!node) return undefined;
      const name = node.data.name;
      if (workspace?.repoIdentity === undefined) return { name, link: name };
      return {
        name,
        link: frameLinkMarkdown({ repoIdentity: workspace.repoIdentity, frameId }, name),
      };
    },
    [workspace?.repoIdentity],
  );
  const isFootOn = useFlag('rail-foot');
  const leftHidden = useCanvasStore((state) => isRailHidden(state, 'left'));
  const leftPanelView = useCanvasStore((state) => state.leftPanelView);
  const codeEnabled = useSettingsStore((state) => state.experimentalCodePanel);
  const statusInSidebar = isStatusListShown({ isEnabled: isFootOn, leftHidden, leftPanelView, codeEnabled });
  const workingRow = useMemo(
    () => (statusInSidebar ? undefined : workingRowCopy(workingRowState, resolveWorkingFrame)),
    [statusInSidebar, workingRowState, resolveWorkingFrame],
  );

  // One timer at the crossing, never a poll: a healthy turn re-renders the transcript no extra times (ONL-2491).
  const noticeDueAt = providerNoticeDueAt(session.state);
  const noticeClock = chat.noticeClock;
  useEffect(() => model.watchNotice(noticeDueAt), [model, noticeDueAt]);
  // Once due, a once-a-second tick keeps the silence notice's count true; a healthy turn never reaches it (ONL-2903).
  const silenceTick = chat.silenceTick;
  const noticeAgent = (session.state.harnessId ?? session.connection.harness) === 'codex' ? t('agent.name.codex') : t('agent.name.claude');
  // `noticeClock` and the tick are re-render triggers, not arguments: the comparison reads the wall clock.
  const notice = useMemo(
    () => providerNotice(session.state, Date.now(), noticeAgent),
    [session.state, noticeClock, silenceTick, noticeAgent],
  );
  useEffect(() => {
    if (notice?.state !== 'silent') return;
    return model.countSilence();
  }, [model, notice?.state]);
  useEffect(() => {
    model.reportSilence(notice, session.state, telemetryProjectFields);
  }, [model, notice, session.state]);

  // The session's harness wins; the panel mounts before a session and `undefined` reads as Claude (ONL-2108).
  const harnessId = session.state.harnessId ?? session.connection.harness;
  const setupClaude = useAgentSetupStore((state) => state.claude);
  const setupCodex = useAgentSetupStore((state) => state.codex);
  const [setupOpen, setSetupOpen] = useState<HarnessId | null>(null);
  const otherHarness = harnessId === 'codex' ? 'claude' : 'codex';
  const otherReady = otherHarness === 'codex' ? isCodexConnected(setupCodex) : isClaudeConnected(setupClaude);
  const pendingRefill = chat.pendingRefill;
  const switchPhase = chat.switch;
  const isAgentSwitchBusy = session.state.isStreaming || isSendInFlight || isSwitching || recall.isRestoring;
  const switchFacts = useLatestRef({ workspacePath, busy: isAgentSwitchBusy });
  const isAgentSwitching = switchPhase !== 'idle';
  const { switchAgent: commandSwitch } = session;
  const announcedSessionId = session.announcedSessionId;
  const onSwitchAgent = useCallback((harness: HarnessId, ready: boolean, failed?: RetryPrompt, manual = false): void => {
    model.switchTo(harness, ready, failed, manual, {
      facts: switchFacts,
      manualDraft,
      command: commandSwitch,
      announcedSessionId,
      workspacePath,
      openSetup: setSetupOpen,
      refused: () => showToast({ body: t('chat.agentSwitch.refused'), type: 'info' }),
    });
  }, [model, commandSwitch, announcedSessionId, workspacePath, manualDraft, switchFacts, showToast]);
  useEffect(() => {
    model.followDraft(switchPhase, manualDraft.current);
  });
  useEffect(() => {
    model.leave();
  }, [model, workspacePath]);
  const refusal = newChatRefusalFor(session.state);
  const newChatRefusal =
    refusal === 'busy' ? t('chat.header.newBusy') : refusal === 'empty' ? t('chat.header.newEmpty') : undefined;

  const agent = harnessId === 'codex' ? t('agent.name.codex') : t('agent.name.claude');
  const limitClock = chat.limitClock;
  useEffect(() => model.watchLimits(session.state.limits ?? []), [model, session.state.limits, limitClock]);
  useEffect(() => {
    model.reportLimits(session.state.items, harnessId === 'codex' ? 'codex' : 'claude', session.announcedSessionId, session.liveErrors);
  }, [model, session.state.items, session.announcedSessionId, session.liveErrors, harnessId]);

  // Nothing to change yet while the canvas is empty on every page (ONL-2744).
  const isStartingFresh = useCanvasStore((state) => Object.keys(state.doc?.nodes ?? {}).length === 0);
  const strings = useMemo<ChatStrings>(
    () => chatStrings(agent, harnessId, isStartingFresh),
    // Not `[]`: the pen's working label names the runtime.
    [agent, harnessId, isStartingFresh],
  );

  // Optimistic echo across the IPC round-trip; confirmed values win, so a silent SDK downgrade shows.
  const [pendingChoice, setPendingChoice] = useState<{
    model?: { value: string; base: string | undefined };
    effort?: { value: EffortLevel | null; base: EffortLevel | null };
  }>({});
  useEffect(() => {
    // Settled means moved off the pick-time baseline; an exact-match settle never fires when the SDK answers with a different value.
    setPendingChoice((pending) => {
      const next = { ...pending };
      if (pending.model !== undefined && session.state.model !== pending.model.base) {
        delete next.model;
      }
      if (pending.effort !== undefined && (session.state.effort ?? null) !== pending.effort.base) {
        delete next.effort;
      }
      return next.model === pending.model && next.effort === pending.effort ? pending : next;
    });
  }, [session.state.model, session.state.effort]);

  const controls = useMemo(
    () =>
      composerControls({
        harness: harnessId ?? 'claude',
        models: session.state.models,
        model: pendingChoice.model?.value ?? session.state.model,
        effort:
          pendingChoice.effort !== undefined
            ? (pendingChoice.effort.value ?? undefined)
            : session.state.effort,
        setModel: (value) => {
          setPendingChoice((pending) => ({
            ...pending,
            model: { value, base: session.state.model },
          }));
          const rollback = (refusal?: ModelRefusal): void => {
            setPendingChoice((pending) => {
              if (pending.model?.value !== value) return pending;
              const { model: _refused, ...rest } = pending;
              return rest;
            });
            showToast({
              body: t(refusal === 'signed-out' ? 'chat.composer.model.refusedSignedOut' : 'chat.composer.model.refused'),
              type: 'info',
            });
          };
          void session
            .setModel(value)
            .then((acceptance) => {
              if (!acceptance.accepted) rollback(acceptance.modelRefusal);
            })
            .catch(() => rollback());
        },
        setEffort: (level) => {
          setPendingChoice((pending) => ({
            ...pending,
            effort: { value: level, base: session.state.effort ?? null },
          }));
          session.setEffort(level);
        },
      }),
    [
      harnessId,
      session.state.models,
      session.state.model,
      session.state.effort,
      session.setModel,
      session.setEffort,
      pendingChoice,
      showToast,
    ],
  );

  // Optimistic across the round trip like the model pick; a refusal takes the label back off (ONL-2190).
  // An answer that reached no held request must not read as a click that did nothing (ONL-2190).
  const respondToPermission = useCallback(
    (requestId: string, optionId: string, answers?: QuestionAnswers, input?: import('@studio/events').QuestionAnswerInput, wentBack?: boolean): Promise<boolean> => {
      return session
        .respond(requestId, optionId, answers, input, wentBack)
        .then((acceptance) => {
          if (!acceptance.accepted) showToast({ body: t('chat.permission.notDelivered'), type: 'info' });
          return acceptance.accepted;
        })
        // A refused bridge call is the same silence the toast exists to break.
        .catch(() => { showToast({ body: t('chat.permission.notDelivered'), type: 'info' }); return false; });
    },
    [session.respond, showToast],
  );

  const permissionControl = usePermissionControl({
    mode: session.state.permissionMode,
    offered: session.state.permissionModes,
    sessionKey: `${workspacePath ?? ''}:${session.announcedSessionId ?? ''}`,
    setMode: session.setPermissionMode,
  });
  const hasConnectors = useFlag('connectors');

  const addMenuAnchor = useRef<HTMLButtonElement>(null);
  const recentConnectorIds = useRecentConnectors(`${workspacePath ?? ''}:${harnessId}`, hasConnectors ? session.state.connectors : undefined);
  const [connectorsMenuGeneration, setConnectorsMenuGeneration] = useState(0);
  const restoreConnectorsFocus = useCallback(() => {
    const active = document.activeElement;
    if (active === document.body || active?.closest('[data-testid="chat-connectors-menu"]')) addMenuAnchor.current?.focus();
  }, []);
  const connectorsMenu = usePopover({ role: 'none', hasCloseButton: false, hasAutoFocus: false, hasLightDismiss: true, hasEscapeDismiss: true, hasSurface: false, onHide: restoreConnectorsFocus });
  /* Escape hands the keyboard back here: on hide the popover's own trap reads the focus as lost and returns it to the composer (ONL-3181). */
  const dismissConnectors = useCallback(() => {
    connectorsMenu.hide();
    addMenuAnchor.current?.focus();
  }, [connectorsMenu.hide]);
  const connectorsMenuMaxHeight = useConnectorsMenuMaxHeight(connectorsMenu.isOpen, addMenuAnchor);
  const dismissConnectorsNotice = useSettingsStore((state) => state.dismissConnectorsNotice);
  const retireConnectorsNotice = useCallback((): void => {
    void dismissConnectorsNotice().catch((error: unknown) => { log('chat').warn('connectors notice dismissal could not be saved', { error }); });
  }, [dismissConnectorsNotice]);
  const openConnectors = useCallback((source: 'add-menu' | 'notice' = 'add-menu'): void => {
    void studio().agentCommand({ type: 'connectors.open', source }).catch(() => { log('chat').warn('connector observation could not be sent'); });
    studio().telemetryEvent({ event: 'connector_action', properties: { action: source === 'add-menu' ? 'open-add-menu' : 'open-notice' } });
    retireConnectorsNotice();
    // Focus in the same frame as `show`, which is synchronous: a frame later the composer's own click handler has the keyboard (ONL-3181).
    requestAnimationFrame(() => {
      /* A fresh menu on every open, mounted before `show` so the focus below lands on it; a closing menu keeps what it showed. */
      flushSync(() => setConnectorsMenuGeneration((generation) => generation + 1));
      connectorsMenu.show();
      const menu = document.querySelector<HTMLElement>('[data-testid="chat-connectors-menu"]');
      (menu?.querySelector<HTMLElement>('[role="menuitem"]') ?? menu)?.focus();
    });
  }, [retireConnectorsNotice, connectorsMenu.show]);
  const addConnector = useCallback((featured: import('@studio/events').FeaturedConnector): void => {
    studio().telemetryEvent({ event: 'connector_action', properties: { action: featured === 'figma' ? 'add-figma' : 'add-mobbin' } });
    void studio().agentCommand({ type: 'connectors.add', provider: featured }).catch(() => {
      log('chat').warn('connector command could not be sent');
    });
  }, []);
  const actOnConnector = useCallback((id: string): void => {
    const featured = session.state.connectors?.servers.find((server) => server.id === id)?.featured;
    if (featured !== undefined) studio().telemetryEvent({ event: 'connector_action', properties: { action: featured === 'figma' ? 'add-figma' : 'add-mobbin' } });
    void studio().agentCommand({ type: 'connectors.act', id }).catch(() => { log('chat').warn('connector command could not be sent'); });
  }, [session.state.connectors]);

  const composerSlots = useMemo<ComposerSlots>(
    () => ({
      footer: modelMenuFooter({
        harness: harnessId,
        controls,
        permission: hasConnectors ? permissionControl : undefined,
        agentAction: { harness: otherHarness, ready: otherReady, isDisabled: isAgentSwitchBusy || isAgentSwitching, onClick: () => onSwitchAgent(otherHarness, otherReady, undefined, true) },
      }),
      actions: (
        <HStack gap={0.5} vAlign="center" style={COMPOSER_ACTIONS_ANCHOR}>
          {/* `inherit` at rest: a pinned glyph colour beats the ghost button's ink model and leaves the control inert on hover. */}
          <Tooltip
            content={isPicking ? t('chat.element.picking') : t('chat.element.pick')}
            placement="above"
          >
            <IconButton
              label={isPicking ? t('chat.element.picking') : t('chat.element.pick')}
              icon={
                <Icon
                  icon={ElementPickerIcon}
                  color={isPicking ? 'accent' : 'inherit'}
                  style={{ width: 18, height: 18 }}
                />
              }
              variant="ghost"
              size="md"
              style={isPicking ? { backgroundColor: 'var(--color-accent-muted)' } : undefined}
              isDisabled={session.sessionCwd === undefined}
              onClick={() => {
                // One band, one notice: arming retires a file error the gather's own
                // refusals would otherwise queue behind (ONL-2482).
                attachments.dismissFailure();
                setPicking(!isPicking);
              }}
              aria-pressed={isPicking}
              data-testid="chat-element-pick"
            />
          </Tooltip>
          {/* One "+" for what can be added to a prompt, in place of a lone paperclip (ONL-2744). */}
          <DropdownMenu
            hasChevron={false}
            placement="above"
            style={MENU_SURFACE}
            button={{
              ref: (button) => { addMenuAnchor.current = button; connectorsMenu.triggerRef(button); },
              label: t('chat.composer.add'),
              tooltip: t('chat.composer.add'),
              variant: 'ghost',
              size: 'md',
              isIconOnly: true,
              icon: <Icon icon={PlusIcon} color="inherit" style={{ width: 18, height: 18 }} />,
            }}
            data-testid="chat-add-menu"
          >
            {hasConnectors && <DropdownMenuItem label={t('chat.connectors.button')} icon={<Icon icon={ConnectorsIcon} color="inherit" style={CAP_GLYPH} />} onClick={() => openConnectors()} />}
            <DropdownMenuItem
              label={t('chat.composer.addFiles')}
              icon={<Icon icon={PaperclipIcon} color="inherit" style={CAP_GLYPH} />}
              // Gated on the host-announced cwd: `state.cwd` fills only at `session.started`, which the SDK withholds until the first prompt.
              isDisabled={session.sessionCwd === undefined}
              onClick={recall.payload.pickImages}
              data-testid="chat-attach"
            />
            <DropdownMenuItem
              label={t('chat.composer.slashCommands')}
              icon={<Icon icon={RunShortcutIcon} color="inherit" style={CAP_GLYPH} />}
              // One skill per message: with one chosen, the menu would never open.
              isDisabled={skillComposer.selected !== undefined}
              onClick={() => {
                const next = composerValue === '' || /\s$/.test(composerValue) ? `${composerValue}/` : `${composerValue} /`;
                model.put(next);
                skillComposer.onTextChange(next);
                // After the menu has closed and handed focus back to its "+", or the composer loses it again.
                requestAnimationFrame(() => requestAnimationFrame(requestComposerFocus));
              }}
              data-testid="chat-slash-commands"
            />
          </DropdownMenu>
          {hasConnectors && connectorsMenu.render(
            <ConnectorsMenu key={connectorsMenuGeneration} agent={harnessId ?? 'claude'} inventory={session.state.connectors} recentIds={recentConnectorIds} {...(connectorsMenuMaxHeight === undefined ? {} : { maxHeight: connectorsMenuMaxHeight })} onAdd={addConnector} onAct={actOnConnector} onDismiss={dismissConnectors} />,
            CONNECTORS_MENU_SEAT,
          )}
        </HStack>
      ),
      sendIcon: <Icon icon={SendArrowIcon} />,
      // The triangle fills more of its box than the stop square, so it is drawn a step smaller to read the same size (ONL-2744).
      resumeIcon: <Icon icon={PlayGlyph} style={{ width: 14, height: 14 }} />,
      drawer:
        attachments.state.drafts.length > 0 ||
        elementSelections.length > 0 ||
        frameSelections.length > 0 ? (
          <ChatComposerDrawer
            data-testid="chat-attachment-drawer"
            style={{
              overflow: 'hidden',
              paddingInline: 'var(--spacing-3)',
              paddingBlockStart: 'var(--spacing-3)',
              paddingBlockEnd: 0,
              marginBlockEnd: 0,
              backgroundColor: 'var(--color-background-popover)',
              backgroundImage: 'none',
            }}
          >
            <HStack
              gap={1}
              vAlign="start"
              style={{
                width: '100%',
                minWidth: 0,
                minHeight: 'var(--studio-attachment-pill-height)',
                overflow: 'hidden',
                flexWrap: 'wrap',
              }}
              data-testid="chat-attachment-strip"
            >
              {frameSelections.length > 0 ? (
                <FrameChips objects={frameSelections} onRemove={recall.payload.removeFrame} />
              ) : null}
              {elementSelections.length > 0 ? (
                <ElementChips
                  selections={elementSelections}
                  onRemove={recall.payload.removeElement}
                />
              ) : null}
              {attachments.state.drafts.length > 0 ? (
                <AttachmentChips drafts={attachments.state.drafts} onRemove={recall.payload.removeAttachment} />
              ) : null}
            </HStack>
          </ChatComposerDrawer>
        ) : undefined,
    }),
    // Every value the slot renders is listed; a short list is a second gate on the pickers (ONL-1866).
    [
      controls,
      otherHarness,
      otherReady,
      isAgentSwitchBusy,
      isAgentSwitching,
      onSwitchAgent,
      hasConnectors,
      permissionControl,
      connectorsMenu,
      connectorsMenuMaxHeight,
      connectorsMenuGeneration,
      recentConnectorIds,
      session.state.connectors,
      openConnectors,
      dismissConnectors,
      addConnector,
      actOnConnector,
      openLink,
      skillComposer,
      harnessId,
      attachments.state.drafts,
      recall.payload,
      attachments.dismissFailure,
      session.sessionCwd,
      isPicking,
      setPicking,
      elementSelections,
      frameSelections,
    ],
  );

  const submitChat = useCallback(
    (request: ChatSubmitRequest): Promise<PromptSubmitResult> => model.submit((inFlight) => {
      const canvas = useCanvasStore.getState();
      const frameName = (frameNodeId: string): string | undefined =>
        canvas.doc?.nodes[frameNodeId]?.name;
      const nodeAt = (nodeId: string) =>
        canvasNodeFacts(
          canvas.doc?.nodes[nodeId],
          t,
          Object.values(canvas.doc?.nodes ?? {}),
          artifactTitles,
        );
      return submitPrompt(
        {
          text: request.text,
          ...(request.context === undefined ? {} : { context: request.context }),
          // Absent is none: a sender that names no attachments never inherits this composer's (ONL-2549).
          images: request.images ?? [],
          artifacts: request.artifacts ?? [],
          skills: request.skills ?? [],
          elementSelections: request.elementSelections ?? canvas.elementSelections,
          // A sender's own frames still resolve by kind: by bare name an unrenamed artifact names nothing and drops out (ONL-2593).
          frames: request.frames === undefined
            ? { selectedFrameIds: canvas.selectedNodeIds, frameName, nodeAt }
            : { nodeAt, ...request.frames },
        },
        {
          send: (text, attachments, context) => sendWithChime(
            chimeWatch,
            () => session.send(text, attachments, context, { answersQuestion: request.answersQuestion === true }),
            request.answersQuestion === true && questionPending.current,
          ),
          inFlight,
          canvasImage: resolveCanvasImageRef,
        },
      );
    }),
    [model, session.send, artifactTitles, questionPending],
  );

  useEffect(() => {
    // Nothing is registered while the project switches: this surface renders blank then (ONL-2455).
    if (isSwitching) return;
    return registerChatSubmit({ submit: submitChat });
  }, [isSwitching, submitChat]);

  const unsupportedPdf = attachmentAgent === 'codex' ? attachments.state.drafts.find((draft) => draft.ref.mediaType === 'application/pdf')?.name : undefined;
  const composerStatus = useMemo<ComposerStatus | undefined>(
    () =>
      // Last: what the recall could not bring back is older than anything that happened since.
      composerStatusFor({
        unsupportedPdfName: unsupportedPdf,
        sendRejected,
        attachFailure: attachments.state.failure,
        gatherRefusal,
      }) ?? (recall.missing.length > 0 ? { type: 'warning', message: t('chat.recall.missing', { attachments: recall.missing.join(', ') }) } : undefined),
    [attachments.state.failure, sendRejected, gatherRefusal, unsupportedPdf, recall.missing],
  );
  const isTipsPillDismissed = useSettingsStore((state) => !state.isPrimed || state.tipsPillDismissed);
  const connectorsNoticePrimed = useSettingsStore((state) => state.isPrimed);
  const connectorsNoticeDismissed = useSettingsStore((state) => state.connectorsNoticeDismissed);
  const projectCount = useProjectsStore((state) => state.workspaces.reduce((count, workspace) => count + workspace.projects.length, 0));
  const isInviteTipOn = useFlag('invite-tip');
  const isInvitationAsking = !isInviteTipOn && notificationInvitationAsks(notificationControls.preference);
  const showsDesignToolsNotice = hasConnectors && showsConnectorsNotice(session.state.connectors, { primed: connectorsNoticePrimed, dismissed: connectorsNoticeDismissed, projectCount, isInvitationAsking });
  const isComposerEmpty = composerValue === '';
  const hasComposerStatus = composerStatus !== undefined;
  const isSkillUnsettled = skillComposer.standing === 'gone' || skillComposer.unknown;
  const shownComposerSlots = useMemo<ComposerSlots>(
    () => ({ ...composerSlots, aboveComposer: ({ isComposerHeld, isQuestionOpen }: ComposerFacts) => <div style={{ display: 'flex', width: '100%', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--spacing-2)' }}>
      <AppRunNotice />
      <TouchedFilesCard key={`${workspacePath ?? ''}:${session.state.sessionId ?? ''}`} files={session.state.touchedFiles} isStreaming={session.state.isStreaming} turnId={session.state.latestTurnId} scope={workspacePath === undefined ? undefined : `${workspacePath}:${session.state.sessionId ?? ''}`} />
      {showsComposerTipsPill({ isDismissed: isTipsPillDismissed, isHidden: isFootOn, isComposerEmpty, hasStatus: hasComposerStatus, isSkillUnsettled, isComposerHeld, isQuestionOpen }) && <TipsPill />}
    </div>,
    ...(showsDesignToolsNotice ? { overChat: <ConnectorsNotice onOpen={() => openConnectors('notice')} onDismiss={() => { studio().telemetryEvent({ event: 'connector_action', properties: { action: 'dismiss-notice' } }); retireConnectorsNotice(); }} /> } : {}) }),
    [workspacePath, session.state.sessionId, session.state.latestTurnId, session.state.isStreaming, session.state.touchedFiles, isTipsPillDismissed, isFootOn, isComposerEmpty, hasComposerStatus, isSkillUnsettled, showsDesignToolsNotice, composerSlots, openConnectors, retireConnectorsNotice],
  );

  const hasSetupCard = useMemo(() => setupTurnCards(session.state.items).length > 0, [session.state.items]);
  const setupTurn = useMemo(
    () => latestSetupTurnSteps(session.state.items, session.state.isStreaming, setupLive, setupCanvas),
    [session.state.items, session.state.isStreaming, setupLive, setupCanvas],
  );
  const agentFailed = session.state.failedTurn !== undefined;
  const askedFailure = useMemo(() => askedSetupFailure(session.state.items), [session.state.items]);
  useEffect(() => {
    publishSetupTurn(setupTurn, agentFailed, askedFailure);
  }, [setupTurn, agentFailed, askedFailure]);
  useEffect(() => () => publishSetupTurn(undefined), []);
  const setupProgress = useImportSetupProgress();
  const failedStep = setupProgress?.state !== 'failed' ? undefined : setupProgress.at === 2 ? 'install' as const : setupProgress.at === 3 ? 'start' as const : undefined;
  const isFailureCardHeld = useSetupFailure().card !== null;
  const narrationFacts = { hasLiveServer, hasSetupCard, isFailureCardHeld, ...(failedStep === undefined ? {} : { failedStep }) };
  const narrationState = narrationFor(paintedCreating, narrationFacts);
  const failedLineKey = failedSetupLineKey(paintedCreating, narrationFacts);
  const lastSetupPromptId = useMemo(() => setupTurnCards(session.state.items).at(-1)?.promptId, [session.state.items]);
  const setupFailedLine = failedLineKey === undefined || lastSetupPromptId === undefined ? undefined : { promptId: lastSetupPromptId, line: t(failedLineKey) };
  const pinsRunningSetup = workspace?.origin !== 'blank';
  const narration = setupNarration(narrationState, {
    onRetry: () => {
      studio().tabsCreateRetry();
    },
    onChooseFolder: () => {
      void chooseProjectSource('setup-failure').catch(ignoreRefusal('chat', 'choose project folder'));
    },
    onDismiss: () => {
      studio().tabsCreateDismiss();
      // The row's buttons unmount under the keyboard user; focus goes where they were headed.
      composerHandle.current?.focus();
    },
  });

  const [activeConnectionRemedy, setActiveConnectionRemedy] = useState<ConnectionRemedy>('setUpCodex');
  const runConnectionRemedy = useCallback((remedy: ConnectionRemedy): void => {
    setSetupOpen('codex');
    setActiveConnectionRemedy(remedy);
    const setup = useAgentSetupStore.getState();
    if (remedy === 'signInCodex') void setup.signInCodex('editor');
    else void setup.installCodex();
  }, []);

  /** False leaves the control un-ticked: a clipboard that refused never reads as copied. */
  const copyText = useCallback(async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, []);
  // `isStreaming` only turns at main's answer, and a second click inside that round trip is a second turn (ONL-2455).
  const retrySending = useRef(false);
  const retryPrompt = useCallback(
    (retry: RetryPrompt): void => {
      if (session.state.isStreaming || retrySending.current) return;
      retrySending.current = true;
      const resent = retriesAsSetupAsk(retry)
        ? studio().projectSetupAsk().then(() => undefined)
        : session.send(retry.text, retry.attachments, retry.context, retry.origin === 'suggestion' ? { resends: 'suggestion' } : undefined);
      void resent
        .catch(ignoreRefusal('chat', 'retry'))
        .finally(() => {
          retrySending.current = false;
        });
    },
    [session.send, session.state.isStreaming],
  );
  const nextTaskSending = useRef(false);
  const sendNextTask = useCallback(
    (pick: NextTaskPick): void => {
      if (session.state.isStreaming || nextTaskSending.current) {
        releaseNextTask(pick.toolCallId);
        return;
      }
      nextTaskSending.current = true;
      void sendTappedTask(pick, (prompt, suggestion) => session.send(prompt.text, [], prompt.context, { suggestion }))
        .then((sent) => {
          if (!sent) showToast({ body: t('chat.nextTasks.notSent'), type: 'info' });
        })
        .finally(() => {
          nextTaskSending.current = false;
        });
    },
    [session.send, session.state.isStreaming, showToast],
  );
  const welcomeSending = useRef(false);
  const sendWelcomeRow = useCallback(
    (row: BlankWelcomeRow, label: string): boolean => {
      if (session.state.isStreaming || welcomeSending.current) return false;
      welcomeSending.current = true;
      const prompt = blankWelcomePrompt(row, label);
      void session
        .send(prompt.text, [], prompt.context)
        .catch(ignoreRefusal('chat', 'welcome row'))
        .finally(() => {
          welcomeSending.current = false;
        });
      return true;
    },
    [session.send, session.state.isStreaming],
  );
  const isBlankWelcomeOn = useFlag('blank-first-moment');
  const welcomeSlot = isBlankWelcomeOn && workspace !== null && isBlankWorkspace(workspace)
    ? <BlankChatWelcome path={workspace.workspacePath} onPick={sendWelcomeRow} />
    : undefined;
  const nextTaskPicks = useNextTaskPicks((store) => store.picks);
  const nextTaskPictures = useNextTaskPictures(appPictureLoads(), session.state.items, session.state.isStreaming);
  // Never sent while streaming: a mid-turn send steers into the dead turn. A stop that outlives the bound sends nothing (ONL-2903).
  const pendingResend = useRef<{ prompt: RetryPrompt; until: number } | undefined>(undefined);
  const resendable = useMemo(() => resendOfLastPrompt(session.state.items), [session.state.items]);
  const stopAndResend = useCallback((): void => {
    if (resendable === undefined || pendingResend.current !== undefined) return;
    pendingResend.current = { prompt: resendable, until: Date.now() + RESEND_STOP_BOUND_MS };
    stopTurn();
  }, [resendable, stopTurn]);
  useEffect(() => {
    const pending = pendingResend.current;
    if (pending === undefined || session.state.isStreaming) return;
    pendingResend.current = undefined;
    if (Date.now() <= pending.until) retryPrompt(pending.prompt);
  }, [session.state.isStreaming, retryPrompt]);
  const messageAction = useCallback((action: MessageAction, role: MessageActionRole): void => {
    studio().telemetryEvent({ event: 'message_action', properties: { action, role, harness: harnessId ?? 'claude' } });
  }, [harnessId]);
  const recallAction = useCallback((steps_back: number, had_attachments: boolean, next_action: PromptRecallNextAction): void => {
    studio().telemetryEvent({ event: 'prompt_recall', properties: { steps_back, had_attachments, next_action, harness: harnessId ?? 'claude' } });
  }, [harnessId]);

  const composerAttachments: PromptAttachment[] = [
    ...attachments.refs(),
    ...elementSelections.map((selection) => selection.evidence),
    ...frameSelections.flatMap((object): PromptAttachment[] => object.kind === 'artifact' && object.artifactId
      ? [{ kind: 'artifact', artifactId: object.artifactId, title: object.name, ...(object.pagePath === undefined ? {} : { pagePath: object.pagePath }) }]
      : object.kind === 'image' ? [] : [{ kind: 'frame', name: object.label, ...(object.kind === 'text' ? { object: 'text' as const } : {}) }]),
  ];
  function takeRecalledPrompt(prompt: RetryPrompt, isDraft: boolean): RecalledPayload {
    const canvas = useCanvasStore.getState();
    const saved = model.recalled(prompt, isDraft);
    canvas.clearElementSelections('prompt-recalled');
    canvas.deselectFrames();
    const refs = prompt.attachments ?? [];
    // With the text, not with the read: the token is local state, so a walk shows it before any byte is fetched (ONL-2047).
    skillComposer.setSelected(refs.find((ref): ref is SkillAttachment => 'kind' in ref && ref.kind === 'skill'));
    const missing: string[] = [];
    const elementRestore = planRecalledElements(refs, frameFlowNodes(canvas.nodes).map((node) => ({ id: node.id, currentUrl: node.data.currentUrl, targetUrl: node.data.target?.url })));
    const elements = saved?.elements ?? elementRestore.selections;
    if (!saved) missing.push(...elementRestore.missing);
    for (const selection of elements) {
      if (!canvas.doc?.nodes[selection.frameNodeId] || canvas.addElementSelection(selection.evidence, selection.frameNodeId, true) !== 'added') {
        missing.push(selection.evidence.tag);
      } else {
        canvas.setElementStale(selection.evidence.id, selection.stale);
      }
    }
    const among = Object.values(canvas.doc?.nodes ?? {});
    // Labelled against every page's nodes, as the chip row labels them; matched only against this one's.
    const frameRestore = planRecalledFrames(refs, among.flatMap((node) => node.pageId === canvas.currentPageId
      ? [{ id: node.id, label: canvasNodeFacts(node, t, among, artifactTitles)?.label }]
      : []));
    const frameIds = saved?.selectedNodeIds ?? frameRestore.frameNodeIds;
    if (!saved) missing.push(...frameRestore.missing);
    for (const id of frameIds) {
      if (canvas.doc?.nodes[id]) canvas.selectFrame(id, true);
    }
    return { artifacts: saved?.artifacts ?? refs.filter((ref): ref is ArtifactAttachment => 'kind' in ref && ref.kind === 'artifact'), missing };
  }

  // The pen's own return fires while the designer may be typing (ONL-2519).
  const composerRef = useLatestRef(composerValue);
  const workspaceRef = useLatestRef(workspacePath);

  const takePen = useCallback(
    (penId: number, by: 'pen' | 'designer'): void => model.takePen(penId, by, {
      composer: composerRef,
      workspace: workspaceRef,
      focus: () => composerHandle.current?.focus(),
      restoreImages: attachments.restore,
      setSkill: skillComposer.setSelected,
    }),
    [model, composerRef, workspaceRef, attachments.restore],
  );

  useEffect(() => {
    model.returnPen(
      {
        pen: session.state.pen,
        workspacePath,
        isDraftRestored: restoredFor === workspacePath,
        isSubmitInFlight: isSendInFlight,
        isComposerRecalling: recall.isRecalling || recall.isRestoring,
      },
      (penId) => takePen(penId, 'pen'),
    );
  }, [model, session.state.pen, workspacePath, restoredFor, isSendInFlight, recall.isRecalling, recall.isRestoring, takePen]);

  const penActions = useMemo(
    () => ({
      onTake: (penId: number): void => takePen(penId, 'designer'),
      onDiscard: (penId: number): void => {
        void studio()
          .agentCommand({ type: 'pen.discard', penId })
          .catch(ignoreRefusal('chat', 'pen discard'));
      },
    }),
    [takePen],
  );

  // One selector per field: an object-returning selector is a fresh identity on every notification.
  const setupClaudeSettled = useAgentSetupStore((s) => s.claudeSettled);
  const setupCode = useAgentSetupStore((s) => s.code);
  const setupCodexSignInAttempted = useAgentSetupStore((s) => s.codexSignInAttempted);
  const setupInFlight = useAgentSetupStore((s) => s.inFlight);
  const codexSetupBusy = setupInFlight.codex.submit || setupCodex.status === 'checking' ||
    setupCodex.status === 'downloading' || setupCodex.status === 'validating' || setupCodex.status === 'signing-in';
  const connectionRemedyBusy = session.connection.harness === 'codex' && session.connection.status !== 'ok' && codexSetupBusy
    ? setupCodex.status === 'signing-in' ? 'signInCodex' : activeConnectionRemedy
    : undefined;
  // Not disposed with the chat: dispose cancels on a singleton host and would kill a sign-in mid-completion on a project switch.
  const [signInController] = useState(() => makeSetupController('claude', 'editor', () => undefined));
  const signInState = mappedSetupFor(
    'claude',
    {
      claude: setupClaude,
      claudeSettled: setupClaudeSettled,
      codex: setupCodex,
      code: setupCode,
      codexSignInAttempted: setupCodexSignInAttempted,
      inFlight: setupInFlight,
    },
    setupStrings().setup,
  ).state;

  const signInWhere = signInPlacement(session.state);
  const signInTurnId = signInWhere === 'transcript' ? session.state.failedTurn?.turnId : undefined;
  const isSignInBusy = setupInFlight.claude.signIn || setupInFlight.claude.detect || setupInFlight.claude.check;
  const isSignInSetAside = signInTurnId !== undefined && signInSetAsideTurn === signInTurnId && isSetAsideable(signInState);
  const signInPending = signInState.state === 'signing-in' ? t('onboarding.setup.claude.signingIn.title') : signInState.state === 'checking' ? t('onboarding.setup.claude.checking.title') : undefined;
  const signInLine = signInTurnId !== undefined ? {
    onSignIn: () => void signInController.act('sign-in', signInState),
    ...(signInPending === undefined ? {} : { pending: signInPending }),
    isRejected: session.state.failedTurn?.code === 'credential_rejected',
    isDisabled: isSignInBusy || !canStartSignIn(signInState),
  } : undefined;
  const signInCard = !isSignInShaped(session.connection) ? undefined : (
    <SignInNotice
      state={signInState}
      strings={setupStrings().ui}
      glyphs={CARD_GLYPHS}
      browsers={setupClaude.browsers}
      isBusy={isSignInBusy}
      onAction={(action, browserId) => void signInController.act(action, signInState, browserId)}
      {...(signInTurnId === undefined ? {} : { onNotNow: () => model.setSignInAside(signInTurnId) })}
    />
  );

  const rowHarness = harnessId ?? 'claude';
  const claudePlan = setupClaude.plan ?? setupClaudeSettled?.plan;
  const resumeTurn = useCallback(async (method: ResumeMethod) => {
    try {
      const acceptance = await session.resume(method);
      if (!acceptance.accepted) showToast({ body: t('chat.resume.notDelivered'), type: 'info' });
    } catch {
      showToast({ body: t('chat.resume.notDelivered'), type: 'info' });
    }
  }, [session.resume, showToast]);
  const continueTurn = useCallback(() => void resumeTurn('error-line'), [resumeTurn]);
  const failureContext = useMemo(
    () => ({
      harness: rowHarness,
      ...(claudePlan === undefined ? {} : { plan: claudePlan }),
      other: { ready: otherReady },
      hasBillingLink: accountLink(rowHarness, 'billing', claudePlan) !== undefined,
      now: Date.now(),
    }),
    [rowHarness, claudePlan, otherReady, limitClock],
  );
  useEffect(() => {
    model.refill(pendingRefill, { announcedSessionId, workspacePath, harnessId }, recall);
  }, [model, pendingRefill, announcedSessionId, workspacePath, harnessId, recall]);
  useEffect(() => {
    model.settleSwitch(switchPhase, recall.isRestoring);
  }, [model, switchPhase, recall.isRestoring]);
  const openBilling = useCallback(() => {
    const url = accountLink(rowHarness, 'billing', claudePlan);
    if (url !== undefined) openAccountLink(url);
  }, [rowHarness, claudePlan]);

  const setupHost =
    setupOpen === null ? null : <SetupDialogHost key={setupOpen} harness={setupOpen} entryPoint="editor" onClose={() => setSetupOpen(null)} />;

  // Kept mounted across a Project switch: the host's unmount cancels the sign-in still running in main (ONL-2743).
  if (isSwitching) return <ChatPanelFrame harness={harnessId}>{setupHost}</ChatPanelFrame>;

  return (
    <ChatPanelFrame
      harness={harnessId}
      onNewChat={() => {
        setNewChatOpen(true);
      }}
      newChatRefusal={newChatRefusal}
    >
      <NewChatDialog
        isOpen={isNewChatOpen}
        onOpenChange={setNewChatOpen}
        onConfirm={session.newChat}
      />
      <div style={{ flex: '1 1 0', minHeight: 0 }}>
      <ChatPanel {...chatPanelProps({
        setup: {
          narration,
          welcomeSlot,
          ...(workspace === null ? {} : { setupRepo: workspace.sourceRepoName }),
          setupLive,
          setupCanvas,
          stepGlyphs: isFootOn && !pinsRunningSetup ? undefined : SETUP_STEP_GLYPHS,
          failedLine: setupFailedLine,
          pinsRunningSetup,
        },
        composer: {
          composerHandleRef: composerHandle,
          composerSlots: shownComposerSlots,
          permission: { control: permissionControl, isInModelMenu: hasConnectors },
          isPlaceholderShimmering: isStartingFresh,
          usage: { items: session.state.items, limits: planLimits(session.state.limits ?? []) },
          composerValue,
          attachments: composerAttachments,
          isComposerRestoring: recall.isRestoring,
          onRecallStart: () => {
            model.holdRecallDraft({ elements: [...elementSelections], selectedNodeIds: [...selectedNodeIds], artifacts: [...recall.artifacts] });
          },
          recallHandleRef: recall.walk,
          onRecallStateChange: recall.setRecalling,
          onRestoreComposer: recall.restore,
          onRecallAction: recallAction,
          onComposerChange: (value) => model.edit(value, { recall, attachments, skill: skillComposer }),
          // No frame term: this gates empty-text send, and a frame is near-always selected (ONL-2045).
          hasComposerPayload: attachments.state.drafts.length > 0 || skillComposer.selected !== undefined || elementSelections.length > 0 || frameSelections.some((object) => object.kind === 'artifact'),
          onComposerFiles: (files) => recall.payload.acceptFiles(files, 'paste'),
          skill: skillComposer,
          composerLayer: skillComposer.layer,
          isImageDropActive,
          composerStatus,
          onSend: (text) => model.send(text, {
            unsupportedPdf,
            skill: skillComposer,
            attachments,
            recall,
            submit: submitChat,
            canvas: { dismissGatherRefusal, setPicking, closeInlineChat: closeInlineChatCarrying, removeElement: removeElementSelection },
          }),
          isEscapeClaimed: isPicking || elementSelections.length > 0,
          isAgentSwitching: isAgentSwitching || isSendInFlight,
        },
        transcript: {
          ...PANEL_ICONS,
          onFrameActivate: activateFrameByName,
          onFrameHover: hoverFrameByName,
          onArtifactActivate: activateArtifact,
          wrapArtifact: wrapInArtifactPreview,
          isFrameArtifact,
          state: session.state,
          workingRow,
          penActions,
          connection: session.connection,
          strings,
          onMessageAction: messageAction,
          resolveImage,
          canvasNameOf,
          toolFrameLinks,
          onLinkClick: openLink,
          onInterrupt: stopTurn,
          onResume: resumeTurn,
          onContinue: continueTurn,
          onSkipQuestion: skipQuestion,
          onDismissQuestion: dismissQuestion,
          onRespond: respondToPermission,
          onRetry: retryPrompt,
          onCopy: copyText,
          onNextTask: sendNextTask,
          nextTaskPicks,
          onNextTaskPick: pickNextTask,
          nextTaskPictures,
        },
        notices: {
          notificationSlot: <NotificationInvitation key={session.announcedSessionId} {...notificationControls} isHidden={isInviteTipOn} />,
          notice,
          onConnectionRemedy: runConnectionRemedy,
          connectionRemedyBusy,
          signIn: { slot: signInCard, placement: signInWhere },
          signInLine,
          isSignInSetAside,
          dismissedNotices,
          onDismissNotice: dismissNotice,
          failureContext,
          onSwitchAgent,
          onOpenBilling: openBilling,
          onStopAndResend: resendable === undefined ? undefined : stopAndResend,
        },
      })} />
      </div>
      {setupHost}
    </ChatPanelFrame>
  );
}
