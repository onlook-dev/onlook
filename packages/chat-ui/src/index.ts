/** Nothing here touches IPC, `window.studio`, or the Agent SDK; the wiring lives in the app's `renderer/src/chat/`. */

export { ChatPanel } from './ChatPanel.js';
export { TouchedFiles } from './TouchedFiles.js';
export type { TouchedFilesProps } from './TouchedFiles.js';
export { failureRow } from './failureRow.js';
export type { FailAction, FailureCause, FailureContext, FailureRowView } from './failureRow.js';
export { failedTurnFacts, failureLine } from './failureLine.js';
export type { FailedTurnFacts, FailureLine, FailureLineAction, FailureLineView } from './failureLine.js';
export type { ChatPanelProps, ChatWorkingRow, ComposerFacts, ComposerSlots, ComposerStatus, RecallHandle } from './ChatPanel.js';
export { ImageThumbnail } from './ImageThumbnail.js';
export { ImagePreview } from './ImagePreview.js';
export type { ImagePreviewProps } from './ImagePreview.js';
export type { ImageThumbnailProps, ResolveImage } from './ImageThumbnail.js';
export { Chip } from './Chip.js';
export type { ChipKind, ChipProps } from './Chip.js';
export { SkillToken } from './SkillToken.js';
export { UsageMeter, UsageTooltipBody } from './UsageMeter.js';
export { usageSeverity, USAGE_WARN_AT, USAGE_CRITICAL_AT } from './UsageMeter.js';
export type { UsageLimit, UsageMeterProps, UsageSeverity } from './UsageMeter.js';
export { AttachmentPill } from './AttachmentPill.js';
export { SubmittedAttachments } from './SubmittedAttachments.js';
export type {
  AttachmentPillProps,
  AttachmentPillState,
  AttachmentPillTone,
} from './AttachmentPill.js';
export { SetupTurn, WelcomeTurn } from './WelcomeTurn.js';
export { ChatWelcome, isChatUntouched } from './ChatWelcome.js';
export type { ChatWelcomeProps, ChatWelcomeRow } from './ChatWelcome.js';
export type { SetupFailure, SetupTurnProps, WelcomeTurnProps, WelcomeTurnStrings } from './WelcomeTurn.js';
export { NoConnection } from './NoConnection.js';
export type { ConnectionRemedy, NoConnectionProps } from './NoConnection.js';
export { ToolCalls } from './ToolCalls.js';
export { NextTasksCard } from './NextTasksCard.js';
export type { DrawNextTaskPicture, NextTasksCardProps } from './NextTasksCard.js';
export type { NextTaskPictures } from './ChatPanel.js';
export { isAwaitingPictures, isNextTasksCall, isOfferingNextTasks, nextTaskRows, nextTasksOf, placeNextTasks } from './nextTasks.js';
export type { NextTaskPick, NextTasksCard as NextTasksCardData, NextTasksState } from './nextTasks.js';
export { SetupStepsCard } from './SetupStepsCard.js';
export type { SetupStepGlyphs, SetupStepsCardProps, SetupStepsStrings } from './SetupStepsCard.js';
export { placeSetupSteps, shownCalls } from './setupSteps.js';
export type { SetupStepsPlacement } from './setupSteps.js';
export type { ToolCallsProps } from './ToolCalls.js';
export { ApprovalRequest, isAwaitingApproval } from './ToolApproval.js';
export {
  InlineElementBubble,
  inlineBubbleSendVerdict,
  resolveInlineBubbleKey,
} from './InlineElementBubble.js';
export { InlineElementBall } from './InlineElementBall.js';
export type { InlineElementBallProps } from './InlineElementBall.js';
export type {
  InlineBubbleKeyState,
  InlineBubbleKeyVerdict,
  InlineBubbleSendState,
  InlineBubbleSendVerdict,
  InlineElementBubbleProps,
  InlineElementBubbleSurface,
} from './InlineElementBubble.js';
export type { ChatFailureLineStrings, ChatFailureStrings, ChatStrings, InlineElementBubbleStrings } from './strings.js';
/** The one definition of "the composer is usable"; the app gates image-drop on the same predicate the panel disables itself by (ONL-1981). */
export { isComposerConnected } from './composerSubmission.js';
export { connectionSurface, connectionVerdict, isSignInShaped, signInPlacement, type SignInPlacement } from './connectionSurface.js';

export { fill } from './fill.js';
export { GlyphSlot } from './GlyphSlot.js';
export { ChatScrollButton } from './ChatScrollButton.js';
export { ComposerNotice, ComposerNoticeFrame, NOTICE_INSET, NoticeButtons, NoticeCard } from './ComposerNotice.js';
export type { ComposerNoticeButton } from './ComposerNotice.js';
export { ShimmerText, SHIMMER_SWEEP_MS, SHIMMER_STAGGER_MS, SHIMMER_CREST_FRACTION, SHIMMER_PERIOD_CH, SHIMMER_CREST_ALPHA } from './ShimmerText.js';
export type { ShimmerTextProps } from './ShimmerText.js';

export { CharMorphText } from './CharMorphText.js';
export type { CharMorphTextProps } from './CharMorphText.js';
export { MorphGlyph } from './MorphGlyph.js';
export type { MorphGlyphProps } from './MorphGlyph.js';

export * from './tool-rows/index.js';
export { QuestionSheet } from './QuestionSheetView.js';
export type { QuestionSheetProps, SheetPhase } from './QuestionSheetView.js';
export { AnsweredQuestions } from './AnsweredQuestions.js';
export { DismissedQuestions } from './DismissedQuestions.js';
