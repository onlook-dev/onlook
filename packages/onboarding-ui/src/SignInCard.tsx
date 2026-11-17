import type { CSSProperties, ReactNode } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { ProgressBar } from '@astryxdesign/core/ProgressBar';
import { Text } from '@astryxdesign/core/Text';
import { ShimmerText } from '@studio/chat-ui';
import { CODE_MAX_LENGTH, type ClaudeBrowser, type HarnessId } from '@studio/events';
import { ClaudeSignInButton, signInLabel } from './ClaudeSignInButton.js';
import {
  avatarFor,
  isSignedIn,
  type AvatarGlyph,
  type SetupAction,
  type SetupState,
  type SetupStateId,
  type SignInCardHost,
} from './state.js';
import { fill, pickCopy, type OnboardingUiStrings } from './strings.js';

/** The 18px glyphs the 40px avatar bubble draws; `harness` is the brand mark. */
export type CardGlyphs = Record<HarnessId, ReactNode> & Record<Exclude<AvatarGlyph, 'harness'>, ReactNode>;

export interface SignInCardProps {
  state: SetupState;
  /** `dialog` is the board's modal body; `chat` is the transcript row (ONL-2187). */
  host: SignInCardHost;
  strings: OnboardingUiStrings;
  glyphs: CardGlyphs;
  /** The field row's action (Paste, Copy) and the chat host's buttons. The dialog host's footer is `SetupDialog`'s. */
  onAction?: (action: SetupAction, browserId?: string) => void;
  browsers?: readonly ClaudeBrowser[];
  isBusy?: boolean;
  /** The paste-code field's own edits; absent, the field is read-only. */
  onCodeChange?: (code: string) => void;
  testId?: string;
}

const AVATAR_SIZE = 40;

const FIELD_BOX = {
  border: 'var(--border-width) solid var(--color-border)',
  borderRadius: 'var(--radius-element)',
  background: 'var(--color-background-body)',
} as const;

/* An input scrolls its own text; the old text box grew a scrollbar and sat a hairline high when empty. */
const CODE_INPUT = {
  ...FIELD_BOX,
  flex: 1,
  minWidth: 0,
  boxSizing: 'border-box',
  height: 36,
  paddingInline: 'var(--spacing-3)',
  color: 'var(--color-text-primary)',
  fontFamily: 'var(--font-family-code)',
  fontSize: 'var(--text-supporting-size)',
  textOverflow: 'ellipsis',
  outline: 'none',
} as const;

const DETAIL_BOX = {
  borderRadius: 'var(--radius-element)',
  background: 'var(--color-background-muted)',
} as const;

export function titleFor(state: SetupState, strings: OnboardingUiStrings): string {
  if (state.harness === 'claude' && state.state === 'cannot-connect' && state.runtimeUnavailable) return strings.runtimeMissingTitle;
  if ('copy' in state && state.copy !== undefined) return state.copy.title;
  if (!isSignedIn(state)) return pickCopy(strings.dialogTitle, state);
  return state.email === undefined ? strings.dialogTitleNoEmail : fill(pickCopy(strings.dialogTitle, state), { email: state.email });
}

function body(state: SetupState, strings: OnboardingUiStrings): string {
  if (state.harness === 'claude' && state.state === 'cannot-connect' && state.runtimeUnavailable) return strings.runtimeMissingBody;
  if ('copy' in state && state.copy !== undefined) return state.copy.body;
  const template = pickCopy(strings.dialogBody, state);
  return 'plan' in state ? fill(template, { plan: state.plan }) : template;
}

/** The field row's text and action: the code to paste, or the command to copy. */
export function fieldFor(state: SetupState): { text: string; action: SetupAction } | undefined {
  if (state.state === 'paste-code') return { text: state.code ?? '', action: 'paste' };
  if (state.state === 'fallback') return { text: state.command, action: 'copy' };
  return undefined;
}

export function SignInCard({ state, host, strings, glyphs, onAction, onCodeChange, testId, browsers, isBusy }: SignInCardProps): React.JSX.Element {
  const field = fieldFor(state);
  const fieldRow = field ? (
    <HStack width="100%" gap={2} align="center" data-testid="sign-in-field">
      {field.action === 'paste' ? (
        <input
          type="text"
          value={field.text}
          readOnly={onCodeChange === undefined}
          onChange={(event) => onCodeChange?.(event.target.value)}
          spellCheck={false}
          maxLength={CODE_MAX_LENGTH}
          autoComplete="off"
          aria-label={strings.action.paste}
          data-testid="sign-in-code-input"
          style={CODE_INPUT}
        />
      ) : (
        <HStack align="center" paddingInline={3} paddingBlock={2} style={{ ...FIELD_BOX, flex: 1, minWidth: 0 }}>
          <Text type="code" color="primary">
            {field.text}
          </Text>
        </HStack>
      )}
      <Button label={strings.action[field.action]} variant="ghost" size="sm" onClick={() => onAction?.(field.action)} data-testid={`sign-in-action-${field.action}`} />
    </HStack>
  ) : null;

  const common = {
    'data-testid': testId ?? 'sign-in-card',
    'data-provider': state.harness,
    'data-state': state.state,
    'data-host': host,
  } as const;

  const detailText = host === 'dialog' && 'copy' in state && state.copy !== undefined
    ? state.diagnostic
    : 'detail' in state ? state.detail : undefined;
  const detail = detailText ? (
    <HStack width="100%" paddingInline={3} paddingBlock={2} style={DETAIL_BOX} data-testid="sign-in-detail">
      <Text type="code" size="xsm" color="secondary">
        {detailText}
      </Text>
    </HStack>
  ) : null;

  if (host === 'chat') {
    return (
      <VStack gap={2} align="start" width="100%" {...common}>
        <ChatLine state={state} strings={strings} />
        {fieldRow}
        {detail}
        {chatButton(state, strings, onAction, browsers, isBusy)}
      </VStack>
    );
  }

  const heading = titleFor(state, strings);
  // Neutral's fill is the disabled ink, the same grey as the track; the board's fill is near-white.
  const progress =
    state.state === 'downloading' ? (
      <HStack width="100%" style={{ '--color-text-disabled': 'var(--color-text-primary)' } as CSSProperties} data-testid="sign-in-progress">
        <ProgressBar label={heading} isLabelHidden value={state.percent} variant="neutral" />
      </HStack>
    ) : null;

  const avatar = avatarFor(state);
  return (
    <VStack gap={3} align="start" width="100%" {...common}>
      <HStack width="100%" gap={3} align="start">
        <HStack
          vAlign="center"
          aria-hidden="true"
          data-avatar={avatar}
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: '50%',
            background: 'var(--color-background-muted)',
            flex: '0 0 auto',
          }}
          justify="center"
        >
          {avatar === 'harness' ? glyphs[state.harness] : glyphs[avatar]}
        </HStack>
        <VStack gap={2} align="start" style={{ flex: 1, minWidth: 0 }}>
          <Text type="body" weight="medium" color="primary" data-testid="sign-in-title">
            {heading}
          </Text>
          <Text type="supporting" color="secondary" data-testid="sign-in-body">
            {body(state, strings)}
          </Text>
        </VStack>
      </HStack>
      {progress}
      {fieldRow}
      {detail}
    </VStack>
  );
}

/** The transcript row's one line: the designed prompt while signed out, the email once in, the dialog title between. */
export function chatLineFor(state: SetupState, strings: OnboardingUiStrings): string {
  if (state.state === 'not-signed-in') return strings.chatLine[state.harness];
  if (isSignedIn(state)) return state.email === undefined ? strings.chatSignedInNoEmail : fill(strings.chatSignedIn, { email: state.email });
  return titleFor(state, strings);
}

function ChatLine({ state, strings }: { state: SetupState; strings: OnboardingUiStrings }): React.JSX.Element {
  const line = chatLineFor(state, strings);
  // The browser wait and the verification turn are in flight; paste-code is waiting on the user, so it holds still.
  return state.state === 'signing-in' || state.state === 'checking' ? (
    <HStack data-testid="sign-in-chat-line">
      <ShimmerText isActive type="body" weight="normal" hasGlow={false}>
        {line}
      </ShimmerText>
    </HStack>
  ) : (
    <Text type="body" color="primary" data-testid="sign-in-chat-line">
      {line}
    </Text>
  );
}

/** The transcript row's one button per state; not the dialog footer's pair, which `SetupDialog` owns. */
const CHAT_ACTION: Partial<Record<SetupStateId, SetupAction>> = {
  'not-signed-in': 'sign-in',
  checking: 'cancel',
  'signing-in': 'cancel',
  'paste-code': 'done',
  'cannot-connect': 'check-again',
};

function chatButton(state: SetupState, strings: OnboardingUiStrings, onAction?: (action: SetupAction, browserId?: string) => void, browsers?: readonly ClaudeBrowser[], isBusy?: boolean): ReactNode {
  if (state.state === 'fallback' && state.harness === 'claude') {
    return (
      <HStack gap={2} align="center">
        <ClaudeSignInButton browsers={browsers} strings={strings} size="sm" variant="secondary" isDisabled={isBusy} onSignIn={(browserId) => onAction?.('sign-in', browserId)} testId="sign-in-action-sign-in" />
        <Button label={strings.action['check-again']} variant="primary" size="sm" isDisabled={isBusy} onClick={() => onAction?.('check-again')} data-testid="sign-in-action-check-again" />
      </HStack>
    );
  }
  const action = CHAT_ACTION[state.state];
  if (!action) return null;
  if (action === 'sign-in' && state.harness === 'claude') {
    return <ClaudeSignInButton browsers={browsers} strings={strings} {...signInLabel(state)} size="sm" isDisabled={isBusy} onSignIn={(browserId) => onAction?.('sign-in', browserId)} testId="sign-in-action-sign-in" />;
  }
  return (
    <Button
      label={strings.action[action]}
      variant={action === 'cancel' ? 'ghost' : 'primary'}
      size="sm"
      onClick={() => onAction?.(action)}
      data-testid={`sign-in-action-${action}`}
    />
  );
}
