import { Button } from '@astryxdesign/core/Button';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { NoticeButtons, NoticeCard, ShimmerText } from '@studio/chat-ui';
import type { ClaudeBrowser } from '@studio/events';
import { ClaudeSignInButton, signInLabel } from './ClaudeSignInButton.js';
import { SignInCard, titleFor, type CardGlyphs } from './SignInCard.js';
import type { SetupAction, SetupState } from './state.js';
import { pickCopy, type OnboardingUiStrings } from './strings.js';

export interface SignInNoticeProps {
  state: SetupState;
  strings: OnboardingUiStrings;
  glyphs: CardGlyphs;
  onAction?: (action: SetupAction, browserId?: string) => void;
  browsers?: readonly ClaudeBrowser[];
  isBusy?: boolean;
  /** Offered only where a turn stopped: signed out with no failed turn, the notice stays until sign-in. */
  onNotNow?: () => void;
  testId?: string;
}

/** States that Not now may set aside: the ask, and the waits the person can't speed up. */
export function isSetAsideable(state: SetupState): boolean {
  return state.state === 'not-signed-in' || state.state === 'signing-in' || state.state === 'checking';
}

export function canStartSignIn(state: SetupState): boolean {
  return state.state === 'not-signed-in' || state.state === 'fallback';
}

/** The sign-in as a composer notice (ONL-2973). States past the ask keep the chat card's own content inside the notice. */
export function SignInNotice({ state, strings, glyphs, onAction, browsers, isBusy, onNotNow, testId = 'chat-sign-in-card' }: SignInNoticeProps): React.JSX.Element {
  const title = titleFor(state, strings);
  const notNow = onNotNow !== undefined && isSetAsideable(state) ? { label: strings.chatNotice.notNow, onClick: onNotNow, testId: 'chat-sign-in-not-now' } : undefined;
  const common = { label: title, testId, cause: 'signed-out' } as const;
  if (state.state === 'not-signed-in') {
    const body = 'copy' in state && state.copy !== undefined ? state.copy.body : strings.chatNotice.signedOutBody;
    return (
      <NoticeCard {...common} title={title} body={body}>
        <NoticeButtons
          {...(notNow === undefined ? {} : { dismiss: notNow })}
          primary={<ClaudeSignInButton browsers={browsers} strings={strings} {...signInLabel(state)} size="sm" isDisabled={isBusy} onSignIn={(browserId) => onAction?.('sign-in', browserId)} testId="sign-in-action-sign-in" />}
        />
      </NoticeCard>
    );
  }
  if (state.state === 'signing-in' || state.state === 'checking') {
    return (
      <NoticeCard
        {...common}
        title={
          <Tooltip content={pickCopy(strings.dialogBody, state)} placement="above" alignment="start">
            <span style={{ display: 'inline-flex' }} data-testid="sign-in-chat-line">
              <ShimmerText isActive type="supporting" weight="normal" hasGlow={false}>{title}</ShimmerText>
            </span>
          </Tooltip>
        }
      >
        <NoticeButtons
          {...(notNow === undefined ? {} : { dismiss: notNow })}
          primary={<Button label={strings.action.cancel} variant="secondary" size="sm" onClick={() => onAction?.('cancel')} data-testid="sign-in-action-cancel" />}
        />
      </NoticeCard>
    );
  }
  return (
    <NoticeCard {...common}>
      <SignInCard state={state} host="chat" strings={strings} glyphs={glyphs} {...(browsers === undefined ? {} : { browsers })} {...(isBusy === undefined ? {} : { isBusy })} {...(onAction === undefined ? {} : { onAction })} testId={`${testId}-content`} />
    </NoticeCard>
  );
}
