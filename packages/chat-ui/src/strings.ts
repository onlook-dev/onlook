/**
 * Every user-facing string this package renders, as a prop bag. The app
 * resolves them through `t()` against its own catalog and hands the result
 * down, which also keeps these components mountable with a stub bag.
 */
import type { DestructiveClass, PenLabel, UserMessageDelivery } from '@studio/events';
import type { WelcomeTurnStrings } from './WelcomeTurn.js';
import type { SetupStepsStrings } from './SetupStepsCard.js';
import type { ToolVerbStrings } from './tool-rows/classify.js';
import type { ToolRowsStrings } from './tool-rows/types.js';
import type { ToolLineStrings } from './tool-rows/lines.js';

/**
 * The inline element bubble's own bag, separate from `ChatStrings`: the panel
 * never renders the bubble, and a panel host should not have to supply strings
 * for a surface it does not open (ONL-2455).
 */
export interface InlineElementBubbleStrings {
  placeholder: string;
}

/** What a failed turn tells the user, keyed by the `SessionErrorCode` the host derived (ONL-2495). */
export interface ChatErrorReasonStrings {
  api_error: string;
  /** Takes `{status}`; used in place of `api_error` when the backend declared one. */
  api_error_status: string;
  prompt_too_long: string;
  rate_limited: string;
  max_turns: string;
  max_budget: string;
  tool_use_failed: string;
  turn_setup_failed: string;
  model_error: string;
  image_error: string;
  hook_stopped: string;
}

/** An account failure's row: the agent's names are resolved by the host; `{when}` and `{status}` are filled by `failureRow` (ONL-2903). */
export interface ChatFailureStrings {
  limitTitle: string;
  limitSession: string;
  limitUntil: string;
  limitWeekly: string;
  limitUnknown: string;
  /** Appended when the other agent is ready to switch to. */
  limitSwitch: string;
  retryAt: string;
  tooManyTitle: string;
  tooManyBody: string;
  tooManyStatus: string;
  billingTitle: string;
  billingBody: string;
  billingOpen: string;
  keyTitle: string;
  keyBody: string;
  serviceTitle: string;
  serviceStatus: string;
  serviceBody: string;
  crashTitle: string;
  crashBody: string;
  failedTitle: string;
  failedBody: string;
  useOther: string;
  line: ChatFailureLineStrings;
  /** A reset instant for this person's clock; `weekday` when it is days away. */
  formatWhen: (epochMs: number, now: number, weekday: boolean) => string;
}

/** A failed turn as one line: `{status}` and `{file}` are filled by `failureLine` (ONL-2973). */
export interface ChatFailureLineStrings {
  overloaded: string;
  serviceStatus: string;
  service: string;
  stoppedStatus: string;
  stopped: string;
  lostOverloaded: string;
  lostStatus: string;
  lost: string;
  partOverloaded: string;
  partStatus: string;
  part: string;
  landedFile: string;
  landedChange: string;
  continueHint: string;
  retryHint: string;
  cutOff: string;
  continue: string;
  /** A notice's line in the chat: `{reason}` is the notice's title. */
  stoppedHere: string;
  notNow: string;
  /** A crash's and a silent failure's hover, and the Retry sentence that rides with each. */
  crashReason: string;
  crashRetry: string;
  failedReason: string;
  failedRetry: string;
  /** The sign-in line where a signed-out turn stopped; `signIn` is its underlined action. */
  signedOut: string;
  signInRejected: string;
  signedOutDetail: string;
  signIn: string;
  /** A notice's body, and its line's hover: three lines at the narrowest chat (`errorLength.test.ts`). */
  noticeBilling: string;
  noticeLimitSession: string;
  noticeLimitUntil: string;
  noticeLimitWeekly: string;
  noticeLimitUnknown: string;
  noticeSwitch: string;
  tooMany: string;
  tooManyStatus: string;
}

/** The waiting prompt's row above the composer (ONL-2294). */
export interface ChatPenStrings {
  /** One per state the row can be in; the panel picks with `penLabel()`. */
  labels: Record<PenLabel, string>;
  /** Puts the waiting prompt back in the composer, where it is editable. */
  takeLabel: string;
  discardLabel: string;
  /** Stands in for the text when a prompt carries only attachments, so the row is never blank. */
  attachmentsOnly: (count: number) => string;
}

export interface ChatStrings {
  composerResume: string;
  composerSend: string;
  composerStop: string;
  turnResumed: string;
  nextTasksLabel: string;
  /** Studio's own setup prompt, drawn as its line instead of the prompt's text, while its turn runs and once it has ended (ONL-2913). */
  setupRunning: string;
  setupEnded: string;
  setupSteps: SetupStepsStrings;
  /* No empty-state strings: the panel's resting content is the welcome turn
     (ONL-1851). A string that outlives its surface is how a catalog drifts
     into a record of what the app used to be. */

  /**
   * The reassurance turn's six fragments. The panel builds the row itself from
   * a `session.welcome` event (ONL-1861), so it needs the copy, not JSX.
   */
  welcome: WelcomeTurnStrings;

  /** Composer. */
  composerPlaceholder: string;
  composerPlaceholderDisconnected: string;
  /** While a question is open: the composer's send answers it (ONL-2583). */
  composerPlaceholderQuestion: string;
  /** While a skill token leads the line: the resting prompt would paint through it (ONL-2047). */
  composerPlaceholderSkill: string;

  /** Permission round-trip. */
  approvalPrompt: string;

  /** Questions (AskUserQuestion). */
  questionSheet: QuestionSheetStrings;

  /** Tool row. */
  toolAwaitingApproval: string;
  toolAwaitingAnswer: string;
  toolDenied: string;
  toolCanceled: string;

  /** What a destructive request is, in the product's own words rather than the model's (ONL-2190). */
  destructiveClasses: Record<DestructiveClass, string>;

  /**
   * The register's verbs, both halves of every pair — a running call says
   * "Reading", the same call settled says "Read" (ONL-1939).
   */
  toolVerbs: ToolVerbStrings;
  /** Everything else the rows render — suffixes, counts, the overflow tail. */
  toolRows: ToolRowsStrings;
  /** A line for every tool, never its name (ONL-2960). */
  toolLines: ToolLineStrings;

  /** Transcript images (ONL-1881): the thumbnail's alt, and the bytes-are-gone tile. */
  imageAttachmentLabel: string;
  imageAlt: string;
  imageUnavailable: string;
  fileSizeLabel?: (bytes: number) => string;

  /**
   * No-connection states, per runtime — the same status means a different fix
   * depending on which agent the user chose (ONL-2108). Codex's fixes are
   * inside Studio; Claude's sign-in is outside it and its button re-checks.
   */
  connectionMissingTitle: string;
  connectionMissingBody: string;
  connectionErrorTitle: string;
  connectionDetailsLabel: string;
  connectionCodexMissingTitle: string;
  connectionCodexMissingBody: string;
  connectionCodexMissingAction: string;
  connectionCodexUnauthedTitle: string;
  connectionCodexUnauthedBody: string;
  connectionCodexUnauthedAction: string;
  connectionCodexErrorTitle: string;

  /** Errors. */
  errorTitle: string;
  /** A turn that died with a prompt behind it — the row that offers Retry (ONL-2196). */
  errorCutOffTitle: string;
  failure: ChatFailureStrings;
  /** A code absent here keeps the generic title (ONL-2495). */
  errorReason: ChatErrorReasonStrings;
  errorRetryAction: string;
  /** The silence notice's one action: stop the turn and send its message again (ONL-2903). */
  noticeStopAndResend: string;

  /**
   * The user row's delivery chip (ONL-2180), one label per state a row can
   * still be in — `delivered` has no label because it clears the chip.
   */
  delivery: Record<Exclude<UserMessageDelivery, 'steering'>, string>;

  /** The waiting prompt's row (ONL-2294). */
  pen: ChatPenStrings;

  /** Thinking block, while the reasoning is still streaming. */
  thinkingLabel: string;

  /** The same block once it has settled — the caption it resolves to. */
  thoughtLabel: string;

  /**
   * The scroll-to-bottom pill's expanded label — a prop rather than the
   * library's own i18n, because we render that button ourselves (ONL-1934).
   */
  newMessages: string;
  scrollToBottom: string;

  /**
   * The response metadata row. Two templates: `responseDuration` fills
   * `{seconds}`, `responseDurationLong` fills `{minutes}`/`{seconds}` at or
   * past 60s, so a sub-minute reply has no redundant "0m".
   */
  responseDuration: string;
  responseDurationLong: string;
  /** Replaces the elapsed readout while the agent holds a question (ONL-2295). */
  turnWaiting: string;
  /** `turnWaiting` with the skip control inside it, at `{skip}` (ONL-2583). */
  turnWaitingSkip: string;
  /** The skip control's own word, translated apart from the sentence it sits in. */
  turnSkip: string;
  /**
   * The token count beside the duration, a `{count}` template.
   *
   * ⚠️ Counts, never a price: the runtime reporting this publishes no dollar
   * figure, so a currency could only be invented from a rate card we would then
   * have to keep true. A runtime reporting no tokens renders no readout.
   */
  responseTokens: string;
  responseCopyLabel: string;
}

export interface QuestionSheetStrings {
  next: string;
  send: string;
  dismiss: string;
  goToQuestion: string;
  /** Fills `{at}` and `{total}`. */
  step: string;
  ownWords: string;
  dismissedOne: string;
  dismissedMany: string;
}
