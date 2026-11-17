import type { ReactNode } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { HStack } from '@astryxdesign/core/Layout';
import type { ChatPanelProps } from '@studio/chat-ui';
import type { HarnessId, PromptAttachment } from '@studio/events';
import { t, type StringKey } from '@studio/i18n';
import { CloseSmallIcon, CopyIcon, EditIcon, FileGlyph, ForwardIcon, modelMarkIcon, PlaygroundGlyph, ReloadIcon, TextGlyph, TrashIcon } from '../icons/glyphs.js';
import { usageMeter, type ComposerControls, type ComposerPermissionControl } from './composerControls.js';
import { COMPOSER_TRIGGER_STYLE } from '../menu/composerMenuRow.js';
import { ModelEffortMenu, type ComposerAgentAction } from './ModelEffortMenu.js';
import { PermissionModeMenu } from './PermissionModeMenu.js';
import type { SkillComposerHandle } from './useSkillComposer.js';
import './chat.css';

type Props = ChatPanelProps;
type AsWritten<K extends keyof Props> = Partial<Pick<Props, K>>;

/** A key under `AsWritten` reaches the panel exactly as the caller wrote it; every other input is sent only when it holds something. */
export interface TranscriptInput
  extends Pick<Props, 'state' | 'connection' | 'strings' | 'chevronIcon' | 'onInterrupt' | 'onRespond' | 'onCopy'>,
    AsWritten<
      | 'penActions' | 'penIcons' | 'copyIcon' | 'retryIcon' | 'closeIcon'
      | 'onRetry' | 'onResume' | 'onContinue' | 'onSkipQuestion' | 'onDismissQuestion' | 'onMessageAction'
      | 'resolveImage' | 'canvasNameOf' | 'toolFrameLinks' | 'onLinkClick'
      | 'onFrameActivate' | 'onFrameHover' | 'isFrameArtifact' | 'onArtifactActivate' | 'wrapArtifact' | 'artifactGlyph' | 'textGlyph' | 'fileGlyph'
      | 'onNextTask' | 'nextTaskPicks' | 'onNextTaskPick' | 'nextTaskPictures'
    > {
  workingRow?: Props['workingRow'];
}

export interface ComposerInput
  extends Pick<Props, 'composerValue' | 'onComposerChange' | 'onSend'>,
    AsWritten<
      | 'composerHandleRef' | 'composerLayer' | 'composerSlots' | 'composerStatus' | 'isPlaceholderShimmering'
      | 'hasComposerPayload' | 'onComposerFiles' | 'isImageDropActive' | 'isEscapeClaimed' | 'isAgentSwitching'
      | 'isComposerRestoring' | 'onRecallStart' | 'recallHandleRef' | 'onRecallStateChange' | 'onRestoreComposer' | 'onRecallAction'
    > {
  attachments?: PromptAttachment[];
  skill?: Pick<SkillComposerHandle, 'selected' | 'standing' | 'removeSkill' | 'onKeyDown' | 'composerRootRef'>;
  permission?: { control: ComposerPermissionControl; isInModelMenu?: boolean };
  usage?: Parameters<typeof usageMeter>[0];
}

interface SetupInput extends AsWritten<'setupRepo' | 'setupLive' | 'setupCanvas' | 'pinsRunningSetup'> {
  narration?: Props['setup'];
  welcomeSlot?: Props['welcomeSlot'];
  stepGlyphs?: Props['setupStepGlyphs'];
  failedLine?: Props['setupFailedLine'];
}

interface NoticesInput
  extends AsWritten<'notificationSlot' | 'dismissedNotices' | 'onDismissNotice' | 'onConnectionRemedy' | 'isSignInSetAside' | 'failureContext' | 'onSwitchAgent' | 'onOpenBilling'> {
  notice?: Props['notice'];
  connectionRemedyBusy?: Props['connectionRemedyBusy'];
  signIn?: { slot: ReactNode; placement: NonNullable<Props['signInPlacement']> };
  signInLine?: Props['signInLine'];
  onStopAndResend?: Props['onStopAndResend'];
}

export interface ChatPanelInput {
  transcript: TranscriptInput;
  composer: ComposerInput;
  setup?: SetupInput;
  notices?: NoticesInput;
}

function setupProps({ narration, welcomeSlot, stepGlyphs, failedLine, ...asWritten }: SetupInput): Partial<Props> {
  return {
    ...(narration ? { setup: narration } : {}),
    ...(welcomeSlot === undefined ? {} : { welcomeSlot }),
    ...asWritten,
    ...(stepGlyphs === undefined ? {} : { setupStepGlyphs: stepGlyphs }),
    ...(failedLine === undefined ? {} : { setupFailedLine: failedLine }),
  };
}

function composerProps({ attachments, skill, permission, usage, ...asWritten }: ComposerInput): Pick<Props, 'composerValue' | 'onComposerChange' | 'onSend'> & Partial<Props> {
  return {
    ...asWritten,
    ...(permission === undefined ? {} : { permissionMode: permissionModeSlot(permission.control, permission.isInModelMenu === true) }),
    ...(usage === undefined ? {} : { usage: usageMeter(usage) }),
    // Off the payload itself, not a second list of what makes it up: a chip kind the two disagreed on would be an edit the walk never sees.
    ...(attachments === undefined ? {} : { composerAttachments: attachments, composerEditVersion: JSON.stringify(attachments) }),
    ...(skill === undefined ? {} : {
      onComposerKeyDown: skill.onKeyDown,
      hasComposerSkill: skill.selected !== undefined,
      composerNotice: skill.standing === 'gone'
        ? { message: t('chat.skills.stale'), actionLabel: t('chat.skills.removeSkill'), onAction: skill.removeSkill, testId: 'chat-skill-remove' }
        : undefined,
      composerRootRef: skill.composerRootRef,
    }),
  };
}

function transcriptProps({ workingRow, ...asWritten }: TranscriptInput): Pick<Props, 'state' | 'connection' | 'strings' | 'chevronIcon' | 'onInterrupt' | 'onRespond' | 'onCopy'> & Partial<Props> {
  return { ...asWritten, ...(workingRow ? { workingRow } : {}) };
}

function noticeProps({ notice, connectionRemedyBusy, signIn, signInLine, onStopAndResend, ...asWritten }: NoticesInput): Partial<Props> {
  return {
    ...asWritten,
    ...(notice ? { notice } : {}),
    ...(connectionRemedyBusy === undefined ? {} : { connectionRemedyBusy }),
    ...(signIn?.slot ? { signInSlot: signIn.slot, signInPlacement: signIn.placement } : {}),
    ...(signInLine === undefined ? {} : { signInLine }),
    ...(onStopAndResend === undefined ? {} : { onStopAndResend }),
  };
}

export function chatPanelProps({ transcript, composer, setup = {}, notices = {} }: ChatPanelInput): ChatPanelProps {
  return { ...setupProps(setup), ...composerProps(composer), ...transcriptProps(transcript), ...noticeProps(notices) };
}

function permissionModeSlot(control: ComposerPermissionControl, isInModelMenu: boolean): ReactNode {
  return !isInModelMenu && control.label !== undefined
    ? <PermissionModeMenu label={control.label} rows={control.rows} isDisabled={control.isDisabled} buttonStyle={COMPOSER_TRIGGER_STYLE} />
    : undefined;
}

/** `permission` and `agentAction` reach the menu only when the caller names them. */
export function modelMenuFooter({ harness, controls, ...menu }: {
  harness: HarnessId | undefined;
  controls: Pick<ComposerControls, 'combinedLabel' | 'modelRows' | 'isDisabled'>;
  permission?: ComposerPermissionControl | undefined;
  agentAction?: ComposerAgentAction;
}): ReactNode {
  return (
    // `styles.css` finds the Astryx slot wrapper by this class; its `min-width: auto` pushed the send button out (ONL-1872).
    <HStack
      gap={3}
      vAlign="center"
      className="chat-composer-controls"
      style={{ minWidth: 0 }}
    >
      <ModelEffortMenu
        icon={modelMarkIcon(harness)}
        label={controls.combinedLabel}
        size={18}
        testId="chat-model-effort"
        modelRows={controls.modelRows}
        isDisabled={controls.isDisabled}
        buttonStyle={COMPOSER_TRIGGER_STYLE}
        {...menu}
      />
    </HStack>
  );
}

type Phase = NonNullable<Props['setup']>['phase'];
type Narration =
  | { kind: 'progress'; phase: Phase; lineKey: StringKey; repo: string }
  | { kind: 'failed'; phase: Phase; lineKey: StringKey; nextActionKey: StringKey; repo: string; detail?: string; canDismiss: boolean };

export function setupNarration(narration: Narration | null, actions: { onRetry: () => void; onDismiss: () => void }): Props['setup'] {
  if (narration === null) return undefined;
  if (narration.kind === 'progress') return { line: t(narration.lineKey), repo: narration.repo, phase: narration.phase };
  return {
    line: t(narration.lineKey),
    repo: narration.repo,
    phase: narration.phase,
    failure: {
      nextAction: t(narration.nextActionKey),
      retryLabel: t('project.create.retry'),
      onRetry: actions.onRetry,
      ...(narration.canDismiss ? { dismissLabel: t('project.create.dismiss'), onDismiss: actions.onDismiss } : {}),
      ...(narration.detail === undefined ? {} : { detail: narration.detail }),
    },
  };
}

/** One identity each, so a row's memo holds. */
export const PANEL_ICONS = {
  chevronIcon: ForwardIcon,
  // The same glyph the composer's artifact chip wears, at the sent chip's marker size.
  artifactGlyph: <Icon icon={PlaygroundGlyph} size="xsm" color="inherit" />,
  textGlyph: <Icon icon={TextGlyph} size="xsm" color="inherit" />,
  fileGlyph: <Icon icon={FileGlyph} size="xsm" color="inherit" />,
  retryIcon: <Icon icon={ReloadIcon} size="sm" color="inherit" />,
  copyIcon: <Icon icon={CopyIcon} size="sm" color="inherit" />,
  closeIcon: <Icon icon={CloseSmallIcon} size="sm" color="inherit" />,
  penIcons: {
    edit: <Icon icon={EditIcon} size="sm" color="inherit" />,
    discard: <Icon icon={TrashIcon} size="sm" color="inherit" />,
  },
} satisfies AsWritten<'chevronIcon' | 'artifactGlyph' | 'textGlyph' | 'fileGlyph' | 'retryIcon' | 'copyIcon' | 'closeIcon' | 'penIcons'>;
