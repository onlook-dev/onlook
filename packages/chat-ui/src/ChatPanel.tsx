
import type { CSSProperties, ReactNode, Ref, RefObject, KeyboardEvent } from 'react';
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChatComposer,
  ChatComposerInput,
  type ChatComposerInputHandle,
  ChatLayout,
  ChatMessage,
  ChatMessageBubble,
  ChatMessageList,
  ChatMessageMetadata,
} from '@astryxdesign/core/Chat';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon, getIcon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Link } from '@astryxdesign/core/Link';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Markdown } from '@astryxdesign/core/Markdown';
import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { Text } from '@astryxdesign/core/Text';
import {
  asksQuestion,
  isRepairAskInPersonsWords,
  skillMentionRange,
  turnElapsed,
  type ProviderNotice,
  type AgentConnection,
  type HarnessId,
  type MessageAction,
  type MessageActionRole,
  type RetryPrompt,
  type PromptAttachment,
  type PromptRecallNextAction,
  type SessionState,
  type SetupCanvas,
  type SetupStepsLive,
  type SetupStepsView,
  type ToolCallView,
  type TranscriptItem,
  type TurnTokens,
} from '@studio/events';
import { Chip } from './Chip.js';
import { ChatScrollButton } from './ChatScrollButton.js';
import { MorphGlyph } from './MorphGlyph.js';
import { UsageMeter, type UsageMeterProps } from './UsageMeter.js';
import { NoConnection, type ConnectionRemedy } from './NoConnection.js';
import { StickyScrim } from './StickyScrim.js';
import { UserMessageClamp } from './UserMessageClamp.js';
import { useStickyUserMessage } from './useStickyUserMessage.js';
import { useTranscriptFollow } from './useTranscriptFollow.js';
import { ShimmerText } from './ShimmerText.js';
import { SHIMMER_BASE, SHIMMER_CREST } from './tool-rows/ink.js';
import type { ResolveImage } from './ImageThumbnail.js';
import { SubmittedAttachments, isShelfAttachment, isSkillAttachment } from './SubmittedAttachments.js';
import { SkillToken } from './SkillToken.js';
import { leavesNoTrace, toolLineContext, ToolCalls } from './ToolCalls.js';
import type { ToolLineContext } from './tool-rows/classify.js';
import { mergeThoughts } from './thoughtRuns.js';
import { placeTurnFooters } from './turnFooters.js';
import type { CanvasNameOf } from './tool-rows/lines.js';
import type { ToolFrameLinks } from './tool-rows/types.js';
import { NextTasksCard, type DrawNextTaskPicture } from './NextTasksCard.js';
import { isAwaitingPictures, isNextTasksCall, isOfferingNextTasks, placeNextTasks, placeSentTasks, type NextTaskPick, type SentTask, type NextTasksCard as NextTasksCardData } from './nextTasks.js';
import { SetupStepsCard, type SetupStepGlyphs } from './SetupStepsCard.js';
import { placeSetupSteps, shownCalls } from './setupSteps.js';
import { isAwaitingApproval, type RespondToPermission } from './ToolApproval.js';
import { QuestionSheet } from './QuestionSheetView.js';
import { QuestionSheetContext, type QuestionSheetScope } from './questionSheetMotion.js';
import { useSheetPresence } from './useSheetPresence.js';
import type { IconType } from '@astryxdesign/core/Icon';
import { SetupTurn, type SetupTurnProps } from './WelcomeTurn.js';
import { isChatUntouched } from './ChatWelcome.js';
import { PenRow, type PenActions } from './PenRow.js';
import type { FailureContext } from './failureRow.js';
import { FADE, ONE_LINE } from './oneLineFade.js';
import { useOverflows } from './useOverflows.js';
import { failedTurnFacts, failureLine, type FailedTurnFacts, type FailureLineAction, type FailureLineView, type NoticeAction } from './failureLine.js';
import { ComposerNotice, type ComposerNoticeButton } from './ComposerNotice.js';
import type { ChatStrings } from './strings.js';
import { around } from './fill.js';
import {
  canSubmitComposer,
  isComposerConnected,
  resolveComposerEnter,
  resolveComposerRecall,
  resolveComposerEscape,
  type ComposerWalk,
} from './composerSubmission.js';
import { connectionSurface, connectionVerdict, type SignInPlacement } from './connectionSurface.js';

export interface ComposerSlots {
  /** The model and effort row beneath the action row. */
  footer?: ReactNode;
  /** The element picker and attachment controls on the action row. */
  actions?: ReactNode;
  /** A row above the composer; the app decides when it shows (ONL-2744), told what holds the composer (ONL-2812). */
  aboveComposer?: ReactNode | ((facts: ComposerFacts) => ReactNode);
  /** A layer over the transcript's foot, on the composer band's top edge; it gives way while the chat asks the person to act (ONL-2812). */
  overChat?: ReactNode;
  sendIcon?: ReactNode;
  resumeIcon?: ReactNode;
  drawer?: ReactNode;
}

export interface ComposerFacts {
  isComposerHeld: boolean;
  isQuestionOpen: boolean;
}

export interface ComposerStatus {
  type: 'error' | 'warning';
  message?: string;
}

export interface ChatWorkingRow {
  phase: 'working' | 'done';
  text: string;
}

export interface RecallHandle {
  end: (nextAction: 'edit' | 'abandon') => void;
}

/** The app draws each task's picture; a card whose clips have not settled waits, so it never shows an empty tile (ONL-2977). */
export interface NextTaskPictures {
  draw: DrawNextTaskPicture;
  isSettled: (clip: string) => boolean;
}

export interface ChatPanelProps {
  state: SessionState;
  /** Additive beside the turn timer — absent when idle (ONL-2194). */
  workingRow?: ChatWorkingRow;
  /** What the waiting prompt's row does; the prompt itself rides `state.pen`. */
  penActions?: PenActions;
  /** Absent means no notice is live; the transcript still publishes that (ONL-2491). */
  notice?: ProviderNotice;
  connection: AgentConnection;
  /** Run the fix the connection banner offers — see NoConnection. */
  onConnectionRemedy?: (remedy: ConnectionRemedy) => void;
  connectionRemedyBusy?: ConnectionRemedy;
  signInSlot?: ReactNode;
  notificationSlot?: ReactNode;
  signInPlacement?: SignInPlacement;
  strings: ChatStrings;
  /** Controlled composer. The app owns the value; this renders it. */
  composerValue: string;
  onComposerChange: (value: string) => void;
  onComposerKeyDown?: (event: KeyboardEvent) => boolean;
  /** Without `onAction` the action sends; with one it stays pressable while the composer is disabled. */
  /** The placeholder shimmers while there is nothing yet to change (ONL-2744). */
  isPlaceholderShimmering?: boolean;
  composerNotice?: { message: string; actionLabel: string; onAction?: () => void; testId?: string };
  composerAttachments?: PromptAttachment[];
  composerEditVersion?: string;
  isComposerRestoring?: boolean;
  isAgentSwitching?: boolean;
  onRestoreComposer?: (prompt: RetryPrompt, isDraft: boolean) => void;
  onRecallStart?: () => void;
  recallHandleRef?: RefObject<RecallHandle | null>;
  onRecallStateChange?: (isActive: boolean) => void;
  onRecallAction?: (stepsBack: number, hadAttachments: boolean, nextAction: PromptRecallNextAction) => void;
  onMessageAction?: (action: MessageAction, role: MessageActionRole) => void;
  onSend: (text: string) => void | Promise<void>;
  onResume?: (method: 'play-button' | 'enter') => void | Promise<void>;
  /** True when an image or element chip can form a prompt without text. */
  hasComposerPayload?: boolean;
  onComposerFiles?: (files: File[]) => void;
  isImageDropActive?: boolean;
  /** The couldn't-attach notice, rendered in the composer's status band. */
  composerStatus?: ComposerStatus;
  resolveImage?: ResolveImage;
  /** Names the frames, pages and artifacts a tool line mentions; stable, or every row re-renders. */
  canvasNameOf?: CanvasNameOf;
  /** A tool line's frame name takes the person to that frame; stable, or every row re-renders. */
  toolFrameLinks?: ToolFrameLinks;
  /** Take the canvas to a frame a submitted chip names. See
   *  `SubmittedAttachments` — resolution is the app's, by name. */
  onFrameActivate?: (name: string) => boolean;
  /** See `SubmittedAttachments` — the pointer is over a frame chip. */
  onFrameHover?: (name: string, isHovered: boolean) => void;
  /** See `SubmittedAttachments` — the named frame shows an artifact. */
  isFrameArtifact?: (name: string) => boolean;
  /** See `SubmittedAttachments` — centres the canvas on a sent artifact. */
  onArtifactActivate?: (artifactId: string, pagePath: string | undefined) => boolean;
  /** See `SubmittedAttachments` — wraps a sent artifact's pill in the app's preview. */
  wrapArtifact?: (attachment: { artifactId: string; pagePath?: string; title: string }, pill: ReactNode) => ReactNode;
  /** The artifact chip's glyph; the app's licensed family, so injected. */
  artifactGlyph?: ReactNode;
  /** A text object's chip glyph, injected for the same reason. */
  textGlyph?: ReactNode;
  fileGlyph?: ReactNode;
  onLinkClick?: (href: string) => void;
  onInterrupt: () => void;
  /** Ends the turn as Stop does, from the open question's own line (ONL-2583). */
  onSkipQuestion?: () => void;
  /** The sheet's close: the turn ends and the next move is the person's (ONL-2901). */
  onDismissQuestion?: () => void;
  closeIcon?: ReactNode;
  /** Esc in the composer already means something to the app, so it does not stop the turn. */
  isEscapeClaimed?: boolean;
  onRespond: RespondToPermission;
  /** Re-send the prompt an error row names (ONL-2196). The app owns the send. */
  onRetry?: (retry: RetryPrompt) => void;
  /** What an account failure's row may offer: the clock, the plan, and whether the other agent can be offered (ONL-2903). */
  failureContext?: FailureContext;
  /** The row's other-agent action; absent, the row never draws it. */
  onSwitchAgent?: (harness: HarnessId, ready: boolean, failed?: RetryPrompt) => void;
  onOpenBilling?: () => void;
  /** The silence notice's action; absent, the notice is text only (ONL-2903). */
  onStopAndResend?: () => void;
  /** Picks up a turn that failed on the service after part of it landed (ONL-2973). */
  onContinue?: () => void;
  /** Error rows whose composer notice was set aside with Not now; the host holds them (ONL-2973). */
  dismissedNotices?: ReadonlySet<string>;
  onDismissNotice?: (errorId: string) => void;
  /** A signed-out turn's line; `pending` replaces it while the sign-in runs (ONL-2973). */
  signInLine?: { onSignIn: () => void; pending?: string; isRejected: boolean; isDisabled?: boolean };
  /** The sign-in notice was set aside with Not now and only the line remains. */
  isSignInSetAside?: boolean;
  /** Copy a response's full text so far. The app owns the clipboard write, and false means it did not happen. */
  onCopy: (text: string) => void | Promise<boolean>;
  copyIcon?: ReactNode;
  retryIcon?: ReactNode;
  /** The queued message's edit and discard glyphs; Astryx has neither. */
  penIcons?: { edit: ReactNode; discard: ReactNode };
  /** Sends the confirmed task on the agent's next-tasks card as the designer's own message (ONL-2899). */
  onNextTask?: (pick: NextTaskPick) => void;
  /** Keyed by the offer's `toolCallId`; an offer absent here has nothing picked (ONL-2977). */
  nextTaskPicks?: Readonly<Record<string, { index: number | null }>>;
  onNextTaskPick?: (toolCallId: string, index: number) => void;
  nextTaskPictures?: NextTaskPictures;
  chevronIcon: IconType;
  composerSlots?: ComposerSlots;
  /** A node, not a label: choosing a mode is a command this package cannot send (ONL-2190). */
  permissionMode?: ReactNode;
  usage?: UsageMeterProps;
  setup?: SetupTurnProps;
  /** Drawn in place of the transcript until anything is said (ONL-2960). */
  welcomeSlot?: ReactNode;
  /** The project the setup line names; without it a Studio setup prompt keeps today's bubble (ONL-2913). */
  setupRepo?: string;
  /** The setup machine and server book as they stand, read only by the live turn's checklist. */
  setupLive?: SetupStepsLive;
  setupCanvas?: SetupCanvas;
  setupStepGlyphs?: SetupStepGlyphs;
  /** A setup that ended failed: its row reads the failed step's line, not "Set up" (ONL-2961). */
  setupFailedLine?: { promptId: string; line: string };
  /** The running setup row and its checklist pin at the top like a passed prompt; off on a blank project (ONL-2961). */
  pinsRunningSetup?: boolean;
  /** The composer's imperative handle, so the app can move focus into the input after a row it acted on leaves (ONL-2363). */
  composerHandleRef?: Ref<ChatComposerInputHandle>;
  /** A chosen skill refuses ArrowUp recall: its token is not text the caret can walk past (ONL-2047). */
  hasComposerSkill?: boolean;
  /** The composer's root, so an app-owned layer can anchor above the whole band including its drawer. */
  composerRootRef?: Ref<HTMLDivElement>;
  /** Rendered after the composer, outside its subtree, where the composer's transparent popover token cannot reach it. */
  composerLayer?: ReactNode;
}

const FULL_WIDTH_GHOST = { maxWidth: '100%' } as const;
const PIN_AFTER_REPLY = { position: 'relative', marginBlockStart: 'calc(var(--spacing-3) - var(--spacing-2))' } as const;
const FOOTER_AFTER_CARD = { marginBlockStart: 'calc(var(--spacing-1) / -2)' } as const;

const COMPOSER_EDITABLE = { minHeight: 80, width: '100%', minWidth: 0 } as React.CSSProperties;
const PROMPT_LINE = { whiteSpace: 'pre-wrap' } as React.CSSProperties;
/** Its own pointer events: a disabled `ChatComposer` root sets `pointerEvents: none` on everything inside. */
const COMPOSER_NOTICE_BAND = { width: '100%', padding: 'var(--spacing-2)', pointerEvents: 'auto' } as React.CSSProperties;

/** The design's panel edge, matching `ChatPanelFrame`'s. */
const HAIRLINE = 'var(--border-width) solid var(--color-border)';
const OVER_CHAT: CSSProperties = { position: 'absolute', insetInline: 0, bottom: '100%', zIndex: 'var(--studio-layer-raised)', paddingInline: 'var(--spacing-3)', paddingBlockEnd: 'var(--spacing-3)', pointerEvents: 'none' };

const BOUNDARY_LINE = { textAlign: 'center' } as React.CSSProperties;

// Lit only outside `.astryx-chat-layout`, which re-points `--color-accent` to grey (ONL-1981).
const COMPOSER_DROP_LIT = {
  boxShadow: 'inset 0 0 0 0.5px var(--color-accent)',
  backgroundColor: 'var(--color-accent-muted)',
} as const;

/** Fades in rather than snapping. Content keeps full opacity throughout. */
const COMPOSER_DROP_TRANSITION = 'background-color 120ms ease, box-shadow 120ms ease';

/** Fills `responseDuration`/`responseDurationLong`'s placeholders. */
const SKIP_LINK = `
.chat-question-skip { text-decoration-style: dotted; text-underline-offset: 0.25em; }
.chat-question-skip:hover, .chat-question-skip:focus-visible { color: var(--color-text-secondary); }
`;

function SkipLine({ template, link, onSkip }: { template: string; link: string; onSkip: () => void }): ReactNode {
  const { before, after } = around(template, 'skip');
  return (
    <>
      <style href="chat-question-skip" precedence="medium">
        {SKIP_LINK}
      </style>
      {before}
      <Link
        type="supporting"
        size="sm"
        color="inherit"
        hasUnderline
        className="chat-question-skip"
        onClick={onSkip}
        data-testid="question-skip"
      >
        {link}
      </Link>
      {after}
    </>
  );
}

function formatResponseDuration(strings: ChatStrings, elapsedMs: number): string {
  const totalSeconds = elapsedMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds - minutes * 60).toFixed(1);
  if (minutes > 0) {
    return strings.responseDurationLong
      .replace('{minutes}', String(minutes))
      .replace('{seconds}', seconds);
  }
  return strings.responseDuration.replace('{seconds}', seconds);
}

function ResponseDuration({
  startedAt,
  durationMs,
  strings,
}: {
  startedAt?: number;
  durationMs?: number;
  strings: ChatStrings;
}): ReactNode {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (durationMs != null || startedAt == null) return;
    /* 100ms, matching the tenth the readout shows — a 1s tick with a decimal
       would jump 0.0 -> 1.0 and look broken rather than live. */
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [durationMs, startedAt]);

  const elapsed = durationMs ?? (startedAt != null ? Math.max(0, now - startedAt) : undefined);
  if (elapsed == null) return null;
  return (
    // `disabled` is an ink step here, not a state claim.
    <Text type="supporting" size="sm" color="disabled" hasTabularNumbers>
      {formatResponseDuration(strings, elapsed)}
    </Text>
  );
}

function ResponseTokens({
  tokens,
  strings,
}: {
  tokens?: TurnTokens;
  strings: ChatStrings;
}): ReactNode {
  const total = tokens?.total;
  if (total == null) return null;
  const count =
    total >= 1_000_000
      ? `${(total / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
      : total >= 1000
        ? `${(total / 1000).toFixed(1)}k`
        : String(total);
  return (
    // Same ink step as the duration it sits beside.
    <Text type="supporting" size="sm" color="disabled" hasTabularNumbers>
      {strings.responseTokens.replace('{count}', count)}
    </Text>
  );
}

function ResponseCopyButton({
  text,
  onCopy,
  copyIcon,
  strings,
  isDisabled = false,
  variant = 'ghost',
}: {
  text: string;
  /** A handler that resolves false never ticks: the clipboard refused and nothing was copied. */
  onCopy: (text: string) => void | Promise<boolean>;
  copyIcon?: ReactNode;
  strings: ChatStrings;
  isDisabled?: boolean;
  /** The prompt's own row fills its controls; the delivery row's stays bare. */
  variant?: 'ghost' | 'secondary';
}): ReactNode {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timeoutRef.current), []);
  return (
    <IconButton
      label={strings.responseCopyLabel}
      tooltip={strings.responseCopyLabel}
      icon={
        isCopied ? (
          <Icon icon="check" size="sm" color="inherit" />
        ) : (
          (copyIcon ?? <Icon icon="copy" size="sm" color="inherit" />)
        )
      }
      variant={variant}
      size="sm"
      isDisabled={isDisabled}
      // Resting/hover ink lives in the host app's stylesheet; an inline color
      // here would beat its :hover rule.
      className="chat-response-copy"
      data-testid="chat-response-copy"
      onClick={() => {
        if (isDisabled) return;
        void Promise.resolve(onCopy(text)).then((copied) => {
          if (copied === false) return;
          setIsCopied(true);
          clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => setIsCopied(false), 2000);
        });
      }}
    />
  );
}

const PERMISSION_MODE_STYLE = {
  display: 'flex',
  marginInlineStart: 'auto',
  // The row's gap is pulled back so the mode sits close to the meter it describes alongside (ONL-2744).
  marginInlineEnd: 'calc(var(--spacing-1) - var(--spacing-2))',
  flexShrink: 0,
  maxWidth: '50%',
  // Without it a capped control wraps the row instead of ellipsising inside the cap (ONL-2190).
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'var(--color-text-gray)',
  lineHeight: 'normal',
} as const;

// Inline: the send button's theme class never reaches the DOM at Astryx 0.1.9.
const SEND_BUTTON_CIRCLE = {
  borderRadius: 'var(--radius-full)',
} as const;

// `--color-accent` stays untouched: the focus ring reads it.
const SEND_BUTTON_QUIET = {
  ...SEND_BUTTON_CIRCLE,
  backgroundColor: 'var(--color-background-muted)',
  color: 'var(--color-icon-secondary)',
} as const;


/** Astryx's registry has no pencil or bin, so the package alone draws its nearest two. */
const PEN_ICON_FALLBACK = {
  edit: <Icon icon="moreHorizontal" size="sm" color="inherit" />,
  discard: <Icon icon="close" size="sm" color="inherit" />,
};

export function ChatPanel({
  state,
  workingRow,
  penActions,
  notice,
  connection,
  signInSlot,
  notificationSlot,
  signInPlacement = 'band',
  onConnectionRemedy,
  connectionRemedyBusy,
  strings,
  composerValue,
  onComposerChange,
  onComposerKeyDown,
  composerNotice,
  isPlaceholderShimmering = false,
  composerAttachments,
  composerEditVersion,
  isComposerRestoring = false,
  isAgentSwitching = false,
  onRestoreComposer,
  onRecallStart,
  recallHandleRef,
  onRecallStateChange,
  onRecallAction,
  onMessageAction,
  onSend,
  onResume,
  hasComposerPayload = false,
  onComposerFiles,
  isImageDropActive = false,
  composerStatus,
  resolveImage,
  canvasNameOf,
  toolFrameLinks,
  onFrameActivate,
  onFrameHover,
  isFrameArtifact,
  onArtifactActivate,
  wrapArtifact,
  artifactGlyph,
  textGlyph,
  fileGlyph,
  onLinkClick,
  onInterrupt,
  onSkipQuestion,
  onDismissQuestion,
  isEscapeClaimed = false,
  onRespond,
  onRetry,
  failureContext,
  onSwitchAgent,
  onOpenBilling,
  onStopAndResend,
  onContinue,
  dismissedNotices,
  onDismissNotice,
  signInLine,
  isSignInSetAside = false,
  onCopy,
  copyIcon,
  closeIcon,
  penIcons,
  onNextTask,
  nextTaskPicks,
  onNextTaskPick,
  nextTaskPictures,
  retryIcon,
  chevronIcon,
  composerSlots = {},
  permissionMode,
  usage,
  setup,
  welcomeSlot,
  setupRepo,
  setupLive,
  setupCanvas,
  setupStepGlyphs,
  setupFailedLine,
  pinsRunningSetup = false,
  composerHandleRef,
  hasComposerSkill,
  composerRootRef,
  composerLayer,
}: ChatPanelProps): ReactNode {
  const composerInput = useRef<HTMLDivElement>(null);
  const placeholderMaskRevision = useRef(0);
  useEffect(() => {
    const input = composerInput.current;
    if (!input || !isPlaceholderShimmering) return;
    const observer = new MutationObserver(() => {
      const placeholder = input.querySelector<HTMLElement>(':scope > div[aria-hidden="true"]');
      if (placeholder) placeholder.style.setProperty('--chat-placeholder-mask-angle', `${++placeholderMaskRevision.current}deg`);
    });
    observer.observe(input, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [isPlaceholderShimmering]);
  const walk = useRef<ComposerWalk | undefined>(undefined);
  const recallEntry = useRef<{ stepsBack: number; hadAttachments: boolean; report?: ChatPanelProps['onRecallAction'] } | undefined>(undefined);
  const finishRecall = useCallback((nextAction: PromptRecallNextAction): void => {
    const entry = recallEntry.current;
    if (entry) entry.report?.(entry.stepsBack, entry.hadAttachments, nextAction);
    if (walk.current || entry) onRecallStateChange?.(false);
    recallEntry.current = undefined;
    walk.current = undefined;
  }, [onRecallStateChange]);
  useEffect(() => {
    if (!recallHandleRef) return;
    recallHandleRef.current = { end: finishRecall };
    return () => {
      recallHandleRef.current = null;
    };
  }, [recallHandleRef, finishRecall]);
  const payloadVersion = useRef(composerEditVersion);
  const wasRestoring = useRef(isComposerRestoring);
  useEffect(() => {
    if (walk.current && !isComposerRestoring && !wasRestoring.current &&
      (composerEditVersion !== payloadVersion.current || composerValue !== walk.current.entries[walk.current.index]?.text)) {
      finishRecall('edit');
    }
    payloadVersion.current = composerEditVersion;
    wasRestoring.current = isComposerRestoring;
  }, [composerValue, composerEditVersion, isComposerRestoring, finishRecall]);
  const isConnected = connectionRemedyBusy === undefined && isComposerConnected(connection.status);
  const verdict = connectionVerdict(connection);
  const [dismissedVerdict, setDismissedVerdict] = useState<string | undefined>(undefined);
  const rowHarness = state.harnessId ?? connection.harness ?? 'claude';
  const failure = useMemo<RowFailure>(
    () => ({
      context: failureContext ?? { harness: rowHarness, hasBillingLink: false, now: Date.now() },
      isAgentSwitching,
      ...(onSwitchAgent ? { onSwitchAgent } : {}),
      ...(onOpenBilling ? { onOpenBilling } : {}),
    }),
    [failureContext, rowHarness, onSwitchAgent, onOpenBilling, isAgentSwitching],
  );
  const surface = connectionSurface(connection, signInSlot !== undefined, dismissedVerdict, connectionRemedyBusy !== undefined);
  const signInHere = surface === 'card';
  const isConnectionBannerShown = surface === 'banner';
  const isEmpty = state.items.length === 0;
  const isResting = isEmpty || (welcomeSlot !== undefined && isChatUntouched(state));
  // Astryx 0.1.9's context predicate is text-only; this widened one makes an
  // attached payload a first-class send without forking the library.
  const isResume = state.interrupted === true && !state.isStreaming && !hasComposerPayload && composerValue.trim() === '' && onResume !== undefined;
  const canSend = !isComposerRestoring && !isAgentSwitching && isConnected && (isResume || canSubmitComposer(isConnected, composerValue, hasComposerPayload));
  /* `paused` and `baseAt` do not move with the clock, so the row's own tick stays the only timer. */
  const turn = turnElapsed(state, Date.now());
  const isQuestionOpen = state.awaitingApproval.some((call) => asksQuestion(call.permission?.questions));
  const nextTasks = useMemo(() => placeNextTasks(state.items, state.isStreaming), [state.items, state.isStreaming]);
  const sentTasks = useMemo(() => placeSentTasks(state.items, state.isStreaming), [state.items, state.isStreaming]);
  const setupSteps = useMemo(() => placeSetupSteps(state.items, state.isStreaming, setupLive, setupCanvas), [state.items, state.isStreaming, setupLive, setupCanvas]);
  const rows = useMemo(() => {
    const lines = toolLineContext(strings, canvasNameOf);
    const drawsNothing = (item: TranscriptItem): boolean =>
      item.kind === 'tools' && !nextTasks.has(item.id) && drawnCalls(item.calls, setupSteps.setupTurnItems.has(item.id), lines).length === 0;
    return mergeThoughts(state.items, drawsNothing, state.isStreaming);
  }, [state.items, state.isStreaming, strings, canvasNameOf, nextTasks, setupSteps]);
  const turnFooters = useMemo(() => placeTurnFooters(state.items, state.isStreaming), [state.items, state.isStreaming]);
  const failedTurns = useMemo(() => {
    const facts = new Map<string, FailedTurnFacts>();
    state.items.forEach((item, index) => {
      if (item.kind === 'error') facts.set(item.id, failedTurnFacts(state.items, index));
    });
    return facts;
  }, [state.items]);
  const isRetryLine = notice?.state === 'retrying' && notice.line !== undefined;
  const standingNotice = useMemo(() => {
    if (state.isStreaming) return undefined;
    let item: TranscriptItem | undefined;
    for (let index = state.items.length - 1; index >= 0 && item === undefined; index -= 1) {
      if (state.items[index]?.kind === 'error') item = state.items[index];
    }
    if (item?.kind !== 'error' || dismissedNotices?.has(item.id)) return undefined;
    const facts = failedTurns.get(item.id);
    if (facts === undefined || !facts.isLatest) return undefined;
    const reading = failureLine(item, failure.context, facts, strings);
    return reading.kind === 'notice' ? { id: item.id, reading } : undefined;
  }, [state.isStreaming, state.items, dismissedNotices, failedTurns, failure.context, strings]);
  const signInNotice = signInHere && !isSignInSetAside;
  const isComposerHeld = signInNotice || standingNotice !== undefined;
  const isOverChatShown = composerSlots.overChat != null && !isQuestionOpen && !isOfferingNextTasks(nextTasks) && !isComposerHeld;
  const noticeAction = standingNotice?.reading.actions[0];
  const noticePrimary = noticeAction === undefined ? undefined : noticeButton(noticeAction, strings, failure, state.isStreaming || isAgentSwitching, 'chat-error');
  const asking = state.awaitingApproval.find((call) => isAwaitingApproval(call) && asksQuestion(call.permission?.questions));
  const sheet = useSheetPresence(asking, (toolCallId) => {
    const call = state.items.flatMap((item) => (item.kind === 'tools' ? item.calls : [])).find((each) => each.toolCallId === toolCallId);
    if (call?.answeredQuestions !== undefined) return 'answered';
    return call?.dismissedQuestions !== undefined ? 'dismissed' : 'other';
  });
  const sheetScope = useMemo<QuestionSheetScope>(() => ({ justAnswered: sheet.answered, justDismissed: sheet.dismissed }), [sheet.answered, sheet.dismissed]);
  const follow = useTranscriptFollow(state.items.length);
  // The last prompt stays on screen as the transcript scrolls past it — the row
  // itself, not a copy. See the hook.
  useStickyUserMessage(follow.scrollerRef);

  return (
    /* A definite-height flex parent, so `ChatLayout` scrolls instead of overflowing the clip (ONL-1806). */
    <QuestionSheetContext.Provider value={sheetScope}>
    <VStack height="100%">
      <ChatLayout
        /* Turns off scroll anchoring, which releases the follow lock mid-turn (ONL-1815). */
        className="chat-transcript-scroller"
        // `ChatLayout`'s root IS the scroll container while no `scrollRef` is
        // passed, so this ref is what `useTranscriptFollow` measures.
        ref={follow.scrollerRef}
        scrollButton={
          isEmpty ? null : (
            <ChatScrollButton
              isVisible={follow.isVisible}
              isStreaming={state.isStreaming}
              label={follow.hasNewMessages ? strings.newMessages : undefined}
              actionLabel={strings.scrollToBottom}
              onClick={follow.scrollToBottom}
            />
          )
        }
        data-transcript-empty={isEmpty ? 'true' : undefined}
        /* Empty: the dock is sticky inside the scroll root and lets content pass behind the composer. */
        composer={null}
      >
        {isResting ? (
          <VStack
            width="100%"
            // The resting inset lives here: this container is the one that knows
            // the block is alone in an empty panel rather than a row among turns.
            padding={4}
            style={welcomeSlot === undefined ? { marginBlockStart: 'auto' } : { marginBlock: 'auto' }}
            data-testid="chat-resting"
          >
            {setup ? <SetupTurn {...setup} chevronIcon={chevronIcon} /> : null}
            {welcomeSlot}
          </VStack>
        ) : (
          <ChatMessageList
            density="compact"
            isStreaming={state.isStreaming}
            data-testid="chat-transcript"
            data-streaming={state.isStreaming ? 'true' : 'false'}
            /* Same rule: `none` is a reading, the row's own absence is not (ONL-2491). */
            data-notice={notice?.state ?? 'none'}
          >
            {rows.map((item) => (
              <TranscriptRow
                key={item.id}
                item={item}
                strings={strings}
                onRespond={onRespond}
                {...(onRetry ? { onRetry } : {})}
                failure={failure}
                failedTurn={failedTurns.get(item.id)}
                {...(onContinue ? { onContinue } : {})}
                onCopy={onCopy}
                isBusy={state.isStreaming}
                onMessageAction={onMessageAction}
                copyIcon={copyIcon}
                retryIcon={retryIcon}
                chevronIcon={chevronIcon}
                resolveImage={resolveImage}
                {...(canvasNameOf ? { canvasNameOf } : {})}
                {...(toolFrameLinks ? { toolFrameLinks } : {})}
                {...(onFrameActivate ? { onFrameActivate } : {})}
                {...(onFrameHover ? { onFrameHover } : {})}
                {...(isFrameArtifact ? { isFrameArtifact } : {})}
                {...(onArtifactActivate ? { onArtifactActivate } : {})}
                {...(wrapArtifact ? { wrapArtifact } : {})}
                {...(artifactGlyph ? { artifactGlyph } : {})}
                {...(textGlyph ? { textGlyph } : {})}
                {...(fileGlyph ? { fileGlyph } : {})}
                onLinkClick={onLinkClick}
                nextTasks={nextTasks.get(item.id)}
                sentTask={sentTasks.get(item.id)}
                nextTaskPicked={pickedTask(nextTasks.get(item.id), nextTaskPicks)}
                {...(onNextTask ? { onNextTask } : {})}
                {...(onNextTaskPick ? { onNextTaskPick } : {})}
                {...(nextTaskPictures && (nextTasks.has(item.id) || sentTasks.has(item.id)) ? { nextTaskPictures } : {})}
                hasTurnFooter={turnFooters.has(item.id)}
                sentReplyHasTurnFooter={turnFooters.has(sentTasks.get(item.id)?.reply?.id ?? '')}
                {...(setupRepo === undefined ? {} : { setupRepo })}
                setupSteps={setupSteps.cards.get(item.id)}
                isSetupRunning={setupSteps.runningPromptId === item.id}
                inSetupTurn={setupSteps.setupTurnItems.has(item.id)}
                {...(setupStepGlyphs ? { setupStepGlyphs } : {})}
                {...(setupFailedLine?.promptId === item.id ? { setupEndedLine: setupFailedLine.line } : {})}
                pinsRunningSetup={pinsRunningSetup}
              />
            ))}
            {sheet.call?.permission?.questions !== undefined && sheet.phase !== undefined ? (
              <QuestionSheet
                key={sheet.call.permission.requestId}
                questions={sheet.call.permission.questions}
                requestId={sheet.call.permission.requestId}
                phase={sheet.phase}
                strings={strings.questionSheet}
                onRespond={onRespond}
                {...(onDismissQuestion ? { onDismiss: onDismissQuestion } : {})}
                closeIcon={closeIcon ?? <Icon icon="close" size="sm" color="inherit" />}
                onOpened={sheet.onOpened}
                onClosed={sheet.onClosed}
                onResize={follow.holdEnd}
              />
            ) : null}
            {state.isStreaming && turn != null && !(turn.paused && sheet.call !== undefined) && !isRetryLine && (
              <ChatMessage sender="assistant" data-testid="chat-turn-timer" data-role="assistant">
                {/* Paused, its own region: the list above is `aria-busy` all turn, and a busy log announces no insertion (ONL-2491, ONL-2295). */}
                <ChatMessageBubble variant="ghost" {...(turn.paused ? { role: 'status' } : {})}>
                  {turn.paused ? (
                    <Text type="supporting" size="sm" color="disabled">
                      {isQuestionOpen && onSkipQuestion ? (
                        <SkipLine template={strings.turnWaitingSkip} link={strings.turnSkip} onSkip={onSkipQuestion} />
                      ) : (
                        strings.turnWaiting
                      )}
                    </Text>
                  ) : (
                    <ResponseDuration startedAt={turn.baseAt} strings={strings} />
                  )}
                </ChatMessageBubble>
              </ChatMessage>
            )}
            {notice && isRetryLine && notice.line !== undefined ? (
              <ChatMessage sender="assistant" data-testid="chat-provider-notice" data-notice={notice.state} data-form="line" data-role="assistant">
                <ChatMessageBubble variant="ghost" role="status">
                  <RetryLine {...notice.line} />
                </ChatMessageBubble>
              </ChatMessage>
            ) : notice && (
              <ChatMessage
                sender="assistant"
                data-testid="chat-provider-notice"
                data-notice={notice.state}
                data-role="assistant"
              >
                {/* Its own region: the list above is `aria-busy` all turn, and a busy log announces no insertion (ONL-2491). */}
                <ChatMessageBubble variant="ghost" role="status">
                  <VStack gap={2}>
                    <Text type="supporting" size="sm" color="disabled">
                      {notice.text}
                    </Text>
                    {notice.state === 'silent' && onStopAndResend ? (
                      <HStack>
                        <Button label={strings.noticeStopAndResend} size="sm" variant="secondary" onClick={onStopAndResend} data-testid="chat-notice-stop-and-resend" />
                      </HStack>
                    ) : null}
                  </VStack>
                </ChatMessageBubble>
              </ChatMessage>
            )}
            {/* Persists past the turn, so this does NOT gate on `state.isStreaming`. */}
            {workingRow && (
              <ChatMessage
                sender="assistant"
                data-testid="chat-working-row"
                data-phase={workingRow.phase}
                data-role="assistant"
              >
                <ChatMessageBubble variant="ghost">
                  <Text type="body" color="inherit">
                    <Markdown
                      display="inline"
                      density="compact"
                      onLinkClick={(href: string) => {
                        onLinkClick?.(href);
                        return false;
                      }}
                    >
                      {workingRow.text}
                    </Markdown>
                  </Text>
                </ChatMessageBubble>
              </ChatMessage>
            )}
            {state.pen !== undefined && penActions !== undefined ? (
              <PenRow
                pen={state.pen}
                strings={strings.pen}
                actions={penActions}
                icons={penIcons ?? PEN_ICON_FALLBACK}
                isLive={state.isStreaming}
                needsAttention={state.awaitingApproval.length > 0}
                attachments={state.pen.attachments && state.pen.attachments.length > 0 ? (
                  <SubmittedAttachments
                    attachments={state.pen.attachments}
                    resolveImage={resolveImage}
                    imageLabel={strings.imageAttachmentLabel}
                    imageAlt={strings.imageAlt}
                    imageUnavailable={strings.imageUnavailable}
                    sizeLabel={strings.fileSizeLabel}
                    fileGlyph={fileGlyph}
                    {...(onFrameActivate ? { onFrameActivate } : {})}
                    {...(onFrameHover ? { onFrameHover } : {})}
                    {...(isFrameArtifact ? { isFrameArtifact } : {})}
                {...(onArtifactActivate ? { onArtifactActivate } : {})}
                {...(wrapArtifact ? { wrapArtifact } : {})}
                    {...(artifactGlyph ? { artifactGlyph } : {})}
                    {...(textGlyph ? { textGlyph } : {})}
                  />
                ) : undefined}
              />
            ) : null}
            {isOfferingNextTasks(nextTasks) ? null : notificationSlot}
          </ChatMessageList>
        )}
        {/* The setup row after the landing (ONL-2179): the transcript holds
            the welcome as a row, so the narration follows it here. */}
        {!isResting && setup ? (
          /* The transcript's own inline inset, not the resting block's: this row
             follows tool rows and shares their left edge (ONL-2499). */
          <VStack width="100%" paddingInline={3} paddingBlock={4} data-testid="chat-setup-row">
            <SetupTurn {...setup} chevronIcon={chevronIcon} />
          </VStack>
        ) : null}
        {signInHere && signInPlacement === 'transcript' && signInLine !== undefined ? (
          <VStack width="100%" paddingInline={3} paddingBlock={2} data-testid="chat-sign-in-line-row">
            <SignInLine line={signInLine} strings={strings} />
          </VStack>
        ) : null}
      </ChatLayout>

      {/* `flexShrink: 0` or a tall transcript compresses the composer and the send button leaves the panel (ONL-1806). */}
      <VStack
        gap={0}
        data-testid="chat-composer-dropzone"
        // Published as a fact, like `data-streaming`: the treatment is a colour,
        // and asserting a colour fails on theme changes that broke nothing.
        data-dropping={isImageDropActive ? 'true' : 'false'}
        data-question-sheet={sheet.phase ?? 'none'}
        style={{
          flexShrink: 0,
          position: 'relative',
          borderTop: HAIRLINE,
          transition: COMPOSER_DROP_TRANSITION,
          ...(isImageDropActive ? COMPOSER_DROP_LIT : {}),
        }}
      >
        {isOverChatShown ? (
          <div data-testid="chat-over-chat" style={OVER_CHAT}>
            <div style={{ pointerEvents: 'auto' }}>{composerSlots.overChat}</div>
          </div>
        ) : null}
        {isConnectionBannerShown ? (
          /* A row in this band, not an overlay: an overlay hid the sent prompt and its error row (ONL-2080). */
          <VStack
            gap={0}
            style={{
              paddingInline: 'var(--spacing-3)',
              paddingBlockStart: 'var(--spacing-3)',
            }}
          >
            <NoConnection
              key={verdict}
              connection={connection}
              strings={strings}
              onDismiss={() => {
                setDismissedVerdict(verdict);
              }}
              {...(onConnectionRemedy ? { onRemedy: onConnectionRemedy } : {})}
              {...(connectionRemedyBusy === undefined ? {} : { remedyBusy: connectionRemedyBusy })}
            />
          </VStack>
        ) : null}
        {composerSlots.aboveComposer ? (
          <HStack className="chat-above-composer" style={{ paddingInline: 'var(--spacing-3)', paddingBlockStart: 'var(--spacing-3)', paddingBlockEnd: 'var(--spacing-1)' }}>
            {typeof composerSlots.aboveComposer === 'function' ? composerSlots.aboveComposer({ isComposerHeld, isQuestionOpen }) : composerSlots.aboveComposer}
          </HStack>
        ) : null}
        {signInNotice ? (
          <div style={{ padding: 'var(--spacing-3)', paddingBlockEnd: 0 }} data-testid="chat-sign-in-slot" data-placement={signInPlacement}>{signInSlot}</div>
        ) : null}
        <div data-testid="chat-composer-box" style={{ position: 'relative' }}>
        <ChatComposer
          {...(composerRootRef ? { ref: composerRootRef } : {})}
          value={composerValue}
          onChange={(value) => {
            finishRecall('edit');
            onComposerChange(value);
          }}
          onSubmit={(text) => {
            if (isComposerRestoring || isAgentSwitching) return;
            finishRecall('send');
            return onSend(text);
          }}
          onStop={onInterrupt}
          // Host-owned: main is the only party that knows it asked to stop, so
          // this does not flicker around an interrupt and needs no debounce.
          isStopShown={state.isStreaming}
          isDisabled={!isConnected}
          placeholder={
            !isConnected
              ? strings.composerPlaceholderDisconnected
              : isQuestionOpen
                ? strings.composerPlaceholderQuestion
                : hasComposerSkill === true
                  ? strings.composerPlaceholderSkill
                  : strings.composerPlaceholder
          }
          // `density` deliberately unset: the default `balanced` is the ONLY
          // thing putting the composer body on the design's 12px inset.
          data-testid="chat-composer"
          className={isPlaceholderShimmering ? 'chat-composer-shimmer' : undefined}
          data-perf-surface="chat_panel"
          input={
            <ChatComposerInput
              ref={composerInput}
              style={COMPOSER_EDITABLE}
              handleRef={composerHandleRef}
              onFiles={onComposerFiles}
              hasHistory={false}
              onKeyDown={(event) => {
                // First: an open skill popover owns the arrows and Enter, so neither starts a walk (ONL-2047).
                if (onComposerKeyDown?.(event)) { event.preventDefault(); event.stopPropagation(); return; }
                if (event.key === 'Enter' && (isComposerRestoring || isAgentSwitching)) {
                  event.preventDefault();
                  return;
                }
                if (isResume && isConnected && event.key === 'Enter' && !event.shiftKey && !event.repeat && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
                  event.preventDefault();
                  finishRecall('abandon');
                  void onResume?.('enter');
                  return;
                }
                // A walk STARTS only on a settled composer, or its draft snapshot is one a restore is still writing.
                // A step within one is not gated: the walk already holds the draft it will return to.
                const recalled = isComposerRestoring && !walk.current ? undefined : resolveComposerRecall({
                  key: event.key,
                  shiftKey: event.shiftKey,
                  altKey: event.altKey,
                  metaKey: event.metaKey,
                  ctrlKey: event.ctrlKey,
                  isComposing: event.nativeEvent.isComposing,
                  keyCode: event.nativeEvent.keyCode,
                  text: composerValue,
                  hasSkill: hasComposerSkill === true,
                  items: state.items,
                  ...(walk.current ? { walk: walk.current } : {}),
                }, { text: composerValue, ...(composerAttachments?.length ? { attachments: composerAttachments } : {}) });
                if (recalled !== undefined) {
                  event.preventDefault();
                  if (walk.current && recalled.walk?.index === walk.current.index) return;
                  if (!walk.current) onRecallStart?.();
                  if (!recalled.walk) finishRecall('abandon');
                  walk.current = recalled.walk;
                  onRecallStateChange?.(Boolean(recalled.walk));
                  if (recalled.stepsBack > 0) {
                    recallEntry.current = { stepsBack: recalled.stepsBack, hadAttachments: Boolean(recalled.prompt.attachments?.length), report: onRecallAction };
                  }
                  if (onRestoreComposer) onRestoreComposer(recalled.prompt, recalled.stepsBack === 0);
                  else onComposerChange(recalled.prompt.text);
                  return;
                }
                const escape = resolveComposerEscape({
                  key: event.key,
                  isComposing: event.nativeEvent.isComposing,
                  keyCode: event.nativeEvent.keyCode,
                  isRepeat: event.repeat,
                  isTurnRunning: state.isStreaming,
                  isAwaitingUser: state.awaitingApproval.length > 0,
                  isEscapeClaimed,
                });
                if (escape === 'stop') {
                  event.preventDefault();
                  onInterrupt();
                  return;
                }
                const verdict = resolveComposerEnter({
                  key: event.key,
                  shiftKey: event.shiftKey,
                  isComposing: event.nativeEvent.isComposing,
                  keyCode: event.nativeEvent.keyCode,
                  isConnected,
                  text: composerValue,
                  hasPayload: hasComposerPayload,
                });
                if (verdict === 'ignore') return;
                // Astryx's own Enter would submit and clear the editable behind this gate.
                event.preventDefault();
                finishRecall('send');
                void onSend(composerValue.trim());
              }}
            />
          }
          drawer={composerSlots.drawer}
          status={composerStatus}
          footerActions={
            <VStack
              gap={0}
              className="chat-composer-stack"
              style={{ width: '100%', gap: 'var(--spacing-2)', minWidth: 0 }}
            >
              {composerNotice ? <VStack gap={1} style={COMPOSER_NOTICE_BAND}><Text size="sm" color="secondary">{composerNotice.message}</Text><Button label={composerNotice.actionLabel} variant="ghost" size="sm" isDisabled={composerNotice.onAction === undefined && !isConnected} onClick={() => { const act = composerNotice.onAction; if (act) act(); else void onSend(composerValue.trim()); }} data-testid={composerNotice.testId ?? 'chat-send-anyway'} /></VStack> : null}
              <HStack
                vAlign="center"
                style={{ width: '100%', justifyContent: 'space-between' }}
              >
                {composerSlots.actions}
                {/* Only Resume needs saying: the play glyph alone does not tell what it continues (ONL-2744). */}
                <Tooltip content={strings.composerResume} placement="start" isEnabled={isResume && !state.isStreaming}>
                  <Button
                    data-testid="chat-send"
                    label={state.isStreaming ? strings.composerStop : isResume ? strings.composerResume : strings.composerSend}
                    isIconOnly
                    variant={state.isStreaming ? 'secondary' : 'primary'}
                    size="md"
                    icon={<MorphGlyph id={state.isStreaming ? 'stop' : isResume ? 'resume' : 'send'} size={16}>{state.isStreaming ? getIcon('stop') : isResume ? (composerSlots.resumeIcon ?? getIcon('chevronRight')) : (composerSlots.sendIcon ?? getIcon('arrowUp'))}</MorphGlyph>}
                    isDisabled={!state.isStreaming && !canSend}
                    onClick={() => {
                      if (state.isStreaming) {
                        onInterrupt();
                        return;
                      }
                      if (!canSend) return;
                      finishRecall(isResume ? 'abandon' : 'send');
                      if (isResume) void onResume?.('play-button');
                      else void onSend(composerValue.trim());
                    }}
                    style={
                      state.isStreaming || canSend ? SEND_BUTTON_CIRCLE : SEND_BUTTON_QUIET
                    }
                  />
                </Tooltip>
              </HStack>
              <HStack
                vAlign="center"
                style={{ width: '100%', gap: 'var(--spacing-2)', minWidth: 0 }}
              >
                {composerSlots.footer}
                {permissionMode === undefined ? null : (
                  <div data-testid="chat-permission-mode-slot" style={PERMISSION_MODE_STYLE}>
                    {permissionMode}
                  </div>
                )}
                {usage === undefined ? null : (
                  <HStack
                    vAlign="center"
                    hAlign="center"
                    // The send button's own width, so the meter centres under it (ONL-2744).
                    style={{
                      flexShrink: 0,
                      width: 'var(--size-element-md)',
                      marginInlineStart: permissionMode === undefined ? 'auto' : undefined,
                    }}
                  >
                    <UsageMeter {...usage} />
                  </HStack>
                )}
              </HStack>
            </VStack>
          }
          // The real send button lives in the first footer row above; a non-null
          // empty slot suppresses Astryx's default without duplicating it.
          sendButton={<></>}
        />
        {standingNotice === undefined || signInNotice ? null : (
          <ComposerNotice
            testId="chat-error-notice"
            cause={standingNotice.reading.row.cause}
            title={standingNotice.reading.row.title}
            {...(standingNotice.reading.body === undefined ? {} : { body: standingNotice.reading.body })}
            dismiss={{ label: strings.failure.line.notNow, onClick: () => onDismissNotice?.(standingNotice.id), testId: 'chat-error-not-now' }}
            {...(noticePrimary === undefined ? {} : { primary: noticePrimary })}
          />
        )}
        </div>
        {composerLayer}
      </VStack>
    </VStack>
    </QuestionSheetContext.Provider>
  );
}

const THOUGHT_MARKDOWN = {
  inlineCode: ({ children }: { children: string }) => (
    <Code color="inherit" size="inherit">
      {children}
    </Code>
  ),
};

function drawnCalls(calls: readonly ToolCallView[], inSetupTurn: boolean, lines: ToolLineContext): ToolCallView[] {
  return shownCalls(calls, inSetupTurn).filter((call) => !isNextTasksCall(call) && !leavesNoTrace(call, lines) && !(isAwaitingApproval(call) && asksQuestion(call.permission?.questions)));
}


const PIN_BACKING: CSSProperties = { position: 'absolute', inset: 0, zIndex: 'var(--studio-layer-behind)', pointerEvents: 'none', opacity: 'var(--stuck, 0)', background: 'var(--color-background-body)' };

// Default shallow equality on purpose: a custom comparator would hide an unstable prop instead of surfacing it.
function pickedTask(card: NextTasksCardData | undefined, picks: Readonly<Record<string, { index: number | null }>> | undefined): number | null {
  return card === undefined ? null : (picks?.[card.toolCallId]?.index ?? null);
}

const TranscriptRow = memo(function TranscriptRow({
  item,
  strings,
  onRespond,
  onRetry,
  failure,
  failedTurn,
  onContinue,
  onCopy,
  isBusy,
  onMessageAction,
  copyIcon,
  retryIcon,
  chevronIcon,
  resolveImage,
  canvasNameOf,
  toolFrameLinks,
  onFrameActivate,
  onFrameHover,
  isFrameArtifact,
  onArtifactActivate,
  wrapArtifact,
  artifactGlyph,
  textGlyph,
  onLinkClick,
  fileGlyph,
  nextTasks,
  sentTask,
  nextTaskPicked,
  onNextTask,
  onNextTaskPick,
  nextTaskPictures,
  hasTurnFooter,
  sentReplyHasTurnFooter,
  setupRepo,
  setupSteps,
  isSetupRunning,
  inSetupTurn,
  setupStepGlyphs,
  setupEndedLine,
  pinsRunningSetup,
}: {
  item: TranscriptItem;
  strings: ChatStrings;
  onRespond: RespondToPermission;
  onRetry?: (retry: RetryPrompt) => void;
  failure: RowFailure;
  failedTurn: FailedTurnFacts | undefined;
  onContinue?: () => void;
  onCopy: ChatPanelProps['onCopy'];
  isBusy: boolean;
  onMessageAction?: ChatPanelProps['onMessageAction'];
  copyIcon?: ReactNode;
  retryIcon?: ReactNode;
  chevronIcon: IconType;
  resolveImage?: ResolveImage;
  /** Names the frames, pages and artifacts a tool line mentions; stable, or every row re-renders. */
  canvasNameOf?: CanvasNameOf;
  /** A tool line's frame name takes the person to that frame; stable, or every row re-renders. */
  toolFrameLinks?: ToolFrameLinks;
  /** Take the canvas to a frame a submitted chip names. See
   *  `SubmittedAttachments` — resolution is the app's, by name. */
  onFrameActivate?: (name: string) => boolean;
  /** See `SubmittedAttachments` — the pointer is over a frame chip. */
  onFrameHover?: (name: string, isHovered: boolean) => void;
  /** See `SubmittedAttachments` — the named frame shows an artifact. */
  isFrameArtifact?: (name: string) => boolean;
  /** See `SubmittedAttachments` — centres the canvas on a sent artifact. */
  onArtifactActivate?: (artifactId: string, pagePath: string | undefined) => boolean;
  /** See `SubmittedAttachments` — wraps a sent artifact's pill in the app's preview. */
  wrapArtifact?: (attachment: { artifactId: string; pagePath?: string; title: string }, pill: ReactNode) => ReactNode;
  /** The artifact chip's glyph; the app's licensed family, so injected. */
  artifactGlyph?: ReactNode;
  /** A text object's chip glyph, injected for the same reason. */
  textGlyph?: ReactNode;
  fileGlyph?: ReactNode;
  onLinkClick?: (href: string) => void;
  nextTasks?: NextTasksCardData | undefined;
  /** Set on the suggestion row a card sent: its chosen task draws and pins here, the offering reply's footer under it (ONL-2901). */
  sentTask?: SentTask | undefined;
  nextTaskPicked: number | null;
  onNextTask?: (pick: NextTaskPick) => void;
  onNextTaskPick?: (toolCallId: string, index: number) => void;
  nextTaskPictures?: NextTaskPictures;
  hasTurnFooter: boolean;
  sentReplyHasTurnFooter: boolean;
  setupRepo?: string;
  setupSteps?: SetupStepsView | undefined;
  isSetupRunning: boolean;
  inSetupTurn: boolean;
  setupStepGlyphs?: SetupStepGlyphs;
  setupEndedLine?: string;
  pinsRunningSetup: boolean;
}): ReactNode {
  // Identity held across a turn starting and ending: as a component type, a new one remounts every block and loses what the reader collapsed.
  const renderCode = useCallback(({ code, language }: { code: string; language?: string }) => (
    <CodeBlock code={code} language={language} isCollapsible onCopy={() => onMessageAction?.('copy_code', 'assistant')} />
  ), [onMessageAction]);
  const copyMessage = (text: string, role: 'user' | 'assistant'): void | Promise<boolean> => {
    if (isBusy) return;
    onMessageAction?.('copy', role);
    return onCopy(text);
  };
  const retryMessage = (prompt: RetryPrompt, role: 'user' | 'assistant'): void => {
    if (isBusy) return;
    onRetry?.(prompt);
    onMessageAction?.('retry', role);
  };
  const pickCard = (data: NextTasksCardData, shows: 'all' | 'chosen'): ReactNode =>
    nextTaskPictures !== undefined && isAwaitingPictures(data, nextTaskPictures.isSettled) ? null : (
      <NextTasksCard
        card={data}
        label={strings.nextTasksLabel}
        picked={nextTaskPicked}
        shows={shows}
        {...(nextTaskPictures ? { picture: nextTaskPictures.draw } : {})}
        {...(onNextTaskPick ? { onPick: onNextTaskPick } : {})}
        {...(onNextTask ? { onConfirm: onNextTask } : {})}
      />
    );
  const replyFooter = (reply: Extract<TranscriptItem, { kind: 'assistant-text' }>): ReactNode => (
    <ChatMessageMetadata
      data-testid="chat-response-meta"
      className="chat-response-meta"
      // 2px off the prose above it, so the row
      // reads as a footer rather than part of the response.
      style={{ marginBlockStart: 'var(--spacing-1)' }}
      timestamp={
        <HStack gap={2} vAlign="center">
          {reply.durationMs != null && <ResponseDuration durationMs={reply.durationMs} strings={strings} />}
          <ResponseTokens tokens={reply.tokens} strings={strings} />
          <ResponseCopyButton
            text={reply.text}
            onCopy={(text) => copyMessage(text, 'assistant')}
            isDisabled={isBusy}
            copyIcon={copyIcon}
            strings={strings}
          />
        </HStack>
      }
    />
  );
  const movesChosenTask = nextTasks?.state.kind === 'sent';
  const chosenTask = sentTask === undefined ? null : pickCard(sentTask.card, 'chosen');
  const sentReply = sentTask?.reply;
  const footerMoves = movesChosenTask && nextTasks !== undefined && !(nextTaskPictures !== undefined && isAwaitingPictures(nextTasks, nextTaskPictures.isSettled));
  const card = nextTasks === undefined || movesChosenTask ? null : pickCard(nextTasks, 'all');
  switch (item.kind) {
    // The copy's facts live in the left panel's header now; the conversation opens on the first prompt (ONL-2744).
    case 'welcome':
      return null;

    case 'user':
      if (item.hidden === true) return null;
      // The resume prompt is matched by its exact English text, so it never goes through the catalog or a translation (ONL-2665).
      if (item.origin === 'studio' && item.text === 'continue') return <Text type="supporting" color="secondary" data-testid="turn-resumed">{strings.turnResumed}</Text>;
      if (item.origin === 'suggestion' && sentTask !== undefined) {
        return chosenTask === null ? null : (
          <>
            <div data-chat-pin="next-task" data-testid="chat-next-task-pin" style={PIN_AFTER_REPLY}>
              <div aria-hidden="true" style={PIN_BACKING} />
              <StickyScrim />
              <ChatMessage sender="assistant" data-role="assistant">
                {chosenTask}
              </ChatMessage>
            </div>
            {sentReply === undefined || !sentReplyHasTurnFooter ? null : (
              <div data-role="assistant" data-testid="chat-next-task-footer" style={FOOTER_AFTER_CARD}>
                {replyFooter(sentReply)}
              </div>
            )}
          </>
        );
      }
      if (item.origin === 'suggestion') {
        return (
          <ChatMessage sender="user" data-role="user" data-origin="suggestion" className="chat-suggestion-pin">
            <div className="chat-suggestion-pin-body">
              <StickyScrim />
              <ChatMessageBubble>
                <UserMessageClamp>
                  <div className="chat-message-body">
                    <span style={PROMPT_LINE}>{item.text}</span>
                  </div>
                </UserMessageClamp>
              </ChatMessageBubble>
            </div>
          </ChatMessage>
        );
      }
      if (item.origin === 'studio' && setupRepo !== undefined && !isRepairAskInPersonsWords(item)) {
        const checklist = setupSteps === undefined || setupStepGlyphs === undefined ? null : (
          <ChatMessage sender="assistant" data-testid="chat-message" data-role="assistant">
            <SetupStepsCard view={setupSteps} strings={strings.setupSteps} glyphs={setupStepGlyphs} chevronIcon={chevronIcon} />
          </ChatMessage>
        );
        return isSetupRunning && pinsRunningSetup ? (
          <div data-chat-pin="setup" data-testid="chat-setup-pin" style={{ position: 'relative' }}>
            <div aria-hidden="true" style={PIN_BACKING} />
            <StickyScrim />
            <SetupTurn line={strings.setupRunning} repo={setupRepo} phase="asked" isRunning />
            {checklist}
          </div>
        ) : (
          <>
            <SetupTurn line={isSetupRunning ? strings.setupRunning : setupEndedLine ?? strings.setupEnded} repo={setupRepo} phase="asked" isRunning={isSetupRunning} />
            {checklist}
          </>
        );
      }
      return (
        /* `data-role` is the harness's join key — asserted on instead of
           rendered text, which is translatable. */
        <ChatMessage sender="user" data-testid="chat-message" data-role="user" {...(item.origin === 'studio' ? { 'data-origin': 'studio' } : {})} className="chat-action-message">
          {/* Behind this row's own bubble, lit only while pinned. */}
          <StickyScrim />
          <ChatMessageBubble>
            <UserMessageClamp>
              <div className="chat-message-body">
                {/* Before the actions, which the host's rules read: the chips
                    size the bubble only from here. */}
                {item.attachments?.some(isShelfAttachment) ? (
                  <div className="chat-message-shelf">
                    <SubmittedAttachments
                      attachments={item.attachments}
                      resolveImage={resolveImage}
                      imageLabel={strings.imageAttachmentLabel}
                      imageAlt={strings.imageAlt}
                      imageUnavailable={strings.imageUnavailable}
                      sizeLabel={strings.fileSizeLabel}
                      fileGlyph={fileGlyph}
                      {...(onFrameActivate ? { onFrameActivate } : {})}
                      {...(onFrameHover ? { onFrameHover } : {})}
                      {...(isFrameArtifact ? { isFrameArtifact } : {})}
                      {...(onArtifactActivate ? { onArtifactActivate } : {})}
                      {...(wrapArtifact ? { wrapArtifact } : {})}
                      {...(artifactGlyph ? { artifactGlyph } : {})}
                      {...(textGlyph ? { textGlyph } : {})}
                    />
                  </div>
                ) : null}
                {/* Never on Studio's own opening prompt: retrying it would send the app's words as the designer's. */}
                {item.origin !== 'studio' && (
                  <HStack className="chat-message-actions" data-testid="chat-user-actions">
                    <ResponseCopyButton text={item.text} onCopy={(text) => copyMessage(text, 'user')} copyIcon={copyIcon} strings={strings} isDisabled={isBusy} variant="secondary" />
                    {onRetry && (retryIcon
                      ? <IconButton label={strings.errorRetryAction} tooltip={strings.errorRetryAction} icon={retryIcon} variant="secondary" size="sm" isDisabled={isBusy} onClick={() => retryMessage(item, 'user')} data-testid="chat-user-retry" />
                      : <Button label={strings.errorRetryAction} variant="secondary" size="sm" isDisabled={isBusy} onClick={() => retryMessage(item, 'user')} data-testid="chat-user-retry" />)}
                  </HStack>
                )}
                {/* The skill reads as part of the prompt it ran, not as one more attachment (ONL-2047). */}
                {(() => {
                  const skill = item.attachments?.find(isSkillAttachment);
                  if (skill === undefined) return item.text ? <span style={PROMPT_LINE}>{item.text}</span> : null;
                  const token = <SkillToken skill={skill} testId="chat-submitted-skill-token" />;
                  // Where the designer placed it (ONL-2744); a prompt from before that keeps it in front.
                  const at = skillMentionRange(item.text, skill.name);
                  return at === undefined ? (
                    <span style={PROMPT_LINE}>
                      {token}
                      {item.text ? ` ${item.text}` : null}
                    </span>
                  ) : (
                    <span style={PROMPT_LINE}>
                      {item.text.slice(0, at.start)}
                      {token}
                      {item.text.slice(at.end)}
                    </span>
                  );
                })()}
              </div>
            </UserMessageClamp>
          </ChatMessageBubble>
          {item.delivery === undefined || item.delivery === 'steering' ? null : (
            <HStack
              hAlign="end"
              style={{ width: '100%', paddingBlockStart: 'var(--spacing-1)' }}
              data-testid="chat-delivery"
              data-delivery={item.delivery}
            >
              <Chip kind="neutral">{strings.delivery[item.delivery]}</Chip>
            </HStack>
          )}
        </ChatMessage>
      );

    case 'assistant-text':
      return (
        <ChatMessage
          sender="assistant"
          data-testid="chat-message"
          data-role="assistant"
          style={FULL_WIDTH_GHOST}
        >
          <ChatMessageBubble
            variant="ghost"
            style={FULL_WIDTH_GHOST}
            metadata={hasTurnFooter && !footerMoves ? replyFooter(item) : undefined}
          >
            {/* Outside the Markdown: inside `renderCode` the gate makes the code block a new component type on every flip. */}
            {(item.text.length > 0 || !item.isStreaming) && (
              <fieldset disabled={isBusy} className="chat-response-body">
                <Markdown
                  isStreaming={item.isStreaming}
                  density="compact"
                  components={{ code: renderCode }}
                  /* The model writes URLs bare far more often than it brackets
                     them, so without this the common case is not a link at all. */
                  autolink="gfm"
                  /* Always `false`: anything else navigates the renderer off the app. */
                  onLinkClick={(href: string) => {
                    onLinkClick?.(href);
                    return false;
                  }}
                >
                  {item.text}
                </Markdown>
              </fieldset>
            )}
            {card}
          </ChatMessageBubble>
        </ChatMessage>
      );

    case 'assistant-thinking':
      return (
        <ChatMessage sender="assistant" data-testid="chat-message" data-role="assistant" data-kind="thinking">
          <ChatMessageBubble variant="ghost">
            <VStack gap={1}>
              <span style={{ color: SHIMMER_CREST }}>
                <ShimmerText
                  isActive={item.isStreaming}
                  weight="normal"
                  base={SHIMMER_BASE}
                  crest={SHIMMER_CREST}
                >
                  {item.isStreaming ? strings.thinkingLabel : strings.thoughtLabel}
                </ShimmerText>
              </span>
              {/* Only once there IS text — an empty `Text` still owns a full
                  line box, which reads as phantom bottom padding. */}
              {item.text.length > 0 && (
                <Text type="supporting" size="sm" display="block">
                  <Markdown
                    display="inline"
                    density="compact"
                    isStreaming={item.isStreaming}
                    components={THOUGHT_MARKDOWN}
                  >
                    {item.text}
                  </Markdown>
                </Text>
              )}
            </VStack>
          </ChatMessageBubble>
        </ChatMessage>
      );

    case 'tools': {
      const calls = drawnCalls(item.calls, inSetupTurn, toolLineContext(strings, canvasNameOf));
      if (calls.length === 0 && card === null) return null;
      return (
        <ChatMessage sender="assistant" data-testid="chat-message" data-role="assistant">
          {calls.length > 0 ? (
            <ToolCalls
              calls={calls}
              strings={strings}
              chevronIcon={chevronIcon}
              onRespond={onRespond}
              resolveImage={resolveImage}
              {...(canvasNameOf ? { canvasNameOf } : {})}
              {...(toolFrameLinks ? { frameLinks: toolFrameLinks } : {})}
            />
          ) : null}
          {card}
        </ChatMessage>
      );
    }

    case 'boundary':
      return (
        // No `chat-message` handle and no actions: the rows above it are still the conversation's, and nothing failed.
        // The sentence sits under the rule rather than in its `label`, which centres a single word in a 320px rail.
        <VStack gap={2} width="100%" align="center" data-testid="chat-boundary">
          <Divider />
          <Text type="supporting" size="xsm" color="secondary" display="block" style={BOUNDARY_LINE}>
            {item.message}
          </Text>
        </VStack>
      );

    case 'error': {
      if (failedTurn === undefined) return null;
      const reading = failureLine(item, failure.context, failedTurn, strings);
      if (reading.kind === 'none') return null;
      return (
        <ChatMessage sender="assistant" data-testid="chat-message" data-role="assistant" data-kind="error" data-cause={reading.row.cause} data-form="line">
          <FailureLineRow
            line={reading.line}
            testPrefix={reading.kind === 'notice' ? 'chat-error-line' : 'chat-error'}
            strings={strings}
            isBusy={isBusy || failure.isAgentSwitching}
            failure={failure}
            onRetry={onRetry ? (prompt) => retryMessage(prompt, 'assistant') : undefined}
            onContinue={onContinue}
          />
        </ChatMessage>
      );
    }
  }
});

const LINE_ACTION: CSSProperties = {
  font: 'inherit',
  padding: 0,
  border: 0,
  background: 'none',
  color: 'var(--color-text-secondary)',
  textDecoration: 'underline',
  textDecorationColor: 'var(--color-text-disabled)',
  textUnderlineOffset: 3,
  cursor: 'pointer',
};

const LINE_ROW: CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '0.3em', minWidth: 0 };
const LINE_LEAD: CSSProperties = { ...ONE_LINE, display: 'block', flex: '0 1 auto' };
const LINE_ACTIONS: CSSProperties = { display: 'flex', alignItems: 'baseline', columnGap: '0.3em', flex: 'none', whiteSpace: 'nowrap' };

const LINE_ACTION_DOT: CSSProperties = { width: 2, height: 2, borderRadius: '50%', background: 'var(--color-text-disabled)', alignSelf: 'center', flex: 'none' };

const LINE_ACTION_DISABLED: CSSProperties = {
  ...LINE_ACTION,
  color: 'var(--color-text-disabled)',
  textDecoration: 'none',
  cursor: 'default',
};

function lineButton(
  action: FailureLineAction,
  strings: ChatStrings,
  failure: RowFailure,
  isBusy: boolean,
  onRetry: ((prompt: RetryPrompt) => void) | undefined,
  onContinue: (() => void) | undefined,
  testPrefix: string,
): ComposerNoticeButton | undefined {
  switch (action.kind) {
    case 'retry':
      return onRetry ? { label: strings.errorRetryAction, onClick: () => onRetry(action.prompt), isDisabled: isBusy, testId: `${testPrefix}-retry` } : undefined;
    case 'continue':
      return onContinue ? { label: strings.failure.line.continue, onClick: onContinue, isDisabled: isBusy, testId: `${testPrefix}-continue` } : undefined;
    default:
      return noticeButton(action, strings, failure, isBusy, testPrefix);
  }
}

function noticeButton(action: NoticeAction, strings: ChatStrings, failure: RowFailure, isBusy: boolean, testPrefix: string): ComposerNoticeButton | undefined {
  const copy = strings.failure;
  if (action.kind === 'switch-agent') {
    const onSwitch = failure.onSwitchAgent;
    return onSwitch
      ? { label: copy.useOther, onClick: () => onSwitch(action.harness, action.ready, action.prompt), isDisabled: isBusy, testId: `${testPrefix}-switch-agent` }
      : undefined;
  }
  const onOpen = failure.onOpenBilling;
  return onOpen ? { label: copy.billingOpen, onClick: onOpen, testId: `${testPrefix}-open-billing` } : undefined;
}

function FailureLineRow({
  line,
  testPrefix,
  strings,
  isBusy,
  failure,
  onRetry,
  onContinue,
}: {
  line: FailureLineView;
  testPrefix: string;
  strings: ChatStrings;
  isBusy: boolean;
  failure: RowFailure;
  onRetry: ((prompt: RetryPrompt) => void) | undefined;
  onContinue: (() => void) | undefined;
}): ReactNode {
  const buttons = line.actions
    .map((action) => lineButton(action, strings, failure, isBusy, onRetry, onContinue, testPrefix))
    .filter((button): button is ComposerNoticeButton => button !== undefined);
  const [leadRef, overflows] = useOverflows<HTMLSpanElement>(line.lead);
  const words = (
    <Text type="supporting" color="disabled" style={LINE_ROW}>
      <span ref={leadRef} style={overflows ? { ...LINE_LEAD, ...FADE } : LINE_LEAD} data-testid="chat-failure-line-lead" data-overflows={overflows || undefined}>
        {line.lead}
      </span>
      {buttons.length === 0 ? null : (
        <span style={LINE_ACTIONS}>
          {buttons.map((button, index) => (
            <Fragment key={button.testId}>
              {index === 0 ? null : <span aria-hidden style={LINE_ACTION_DOT} />}
              <button
                type="button"
                style={button.isDisabled === true ? LINE_ACTION_DISABLED : LINE_ACTION}
                disabled={button.isDisabled ?? false}
                onClick={button.onClick}
                data-testid={button.testId}
              >
                {button.label}
              </button>
            </Fragment>
          ))}
        </span>
      )}
    </Text>
  );
  return (
    <div style={{ width: '100%' }} data-testid="chat-failure-line">
      {line.detail === undefined ? words : (
        <Tooltip content={line.detail} placement="above" alignment="start">
          {words}
        </Tooltip>
      )}
    </div>
  );
}

function SignInLine({ line, strings }: { line: NonNullable<ChatPanelProps['signInLine']>; strings: ChatStrings }): ReactNode {
  const copy = strings.failure.line;
  return (
    <div style={{ width: '100%' }} data-testid="chat-failure-line" data-cause="signed-out">
      <Tooltip content={copy.signedOutDetail} placement="above" alignment="start">
        {line.pending === undefined ? (
          <span style={{ display: 'inline' }}>
            <Text type="supporting" color="disabled">
              {line.isRejected ? copy.signInRejected : copy.signedOut}{' '}
              <button type="button" style={line.isDisabled === true ? LINE_ACTION_DISABLED : LINE_ACTION} disabled={line.isDisabled ?? false} onClick={line.onSignIn} data-testid="chat-error-line-sign-in">
                {copy.signIn}
              </button>
            </Text>
          </span>
        ) : (
          <span style={{ display: 'inline-flex' }} data-testid="chat-sign-in-pending">
            <ShimmerText isActive type="supporting" weight="normal" base="var(--color-text-disabled)" crest="var(--color-text-secondary)" hasGlow={false} sweepMs={2600}>
              {line.pending}
            </ShimmerText>
          </span>
        )}
      </Tooltip>
    </div>
  );
}

function RetryLine({ words, doing, detail }: { words: string; doing: string; detail: string }): ReactNode {
  return (
    <Tooltip content={detail} placement="above" alignment="start">
      <span style={{ display: 'inline-flex' }} data-testid="chat-retry-line">
        <Text type="supporting" size="sm" color="disabled" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>{`${words}\u00a0`}</Text>
        <ShimmerText isActive type="supporting" size="sm" weight="normal" base="var(--color-text-disabled)" crest="var(--color-text-secondary)" hasGlow={false} sweepMs={2600} style={{ whiteSpace: 'nowrap' }}>
          {doing}
        </ShimmerText>
      </span>
    </Tooltip>
  );
}

interface RowFailure {
  context: FailureContext;
  isAgentSwitching: boolean;
  onSwitchAgent?: (harness: HarnessId, ready: boolean, failed?: RetryPrompt) => void;
  onOpenBilling?: () => void;
}
