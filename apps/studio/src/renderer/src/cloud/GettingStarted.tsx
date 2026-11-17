import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { Link } from '@astryxdesign/core/Link';
import { useEffect, useState } from 'react';
import { GithubIcon, GlyphOpenPrompt } from '../icons/glyphs.js';
import { primeAppInfo, useAppInfoStore } from '../app/store.js';
import type { AuthSignInStep } from '@studio/events';
import { intlLocale, t } from '@studio/i18n';
import type { StringKey } from '@studio/i18n';
import { OnboardingDisplayHeading, OnboardingHeading } from '../onboarding/OnboardingParts.js';
import { OnboardingShell } from '../onboarding/OnboardingShell.js';
import { OnlookMark } from '../icons/OnlookMark.js';
import { accountErrorText, type AccountError, type SignInMethod } from './useAccountAction.js';
import { SignInIcon } from './SignInIcon.js';
import { ignoreRefusal } from '../refusal.js';
import { studio } from '../bridge.js';

const TEXT_COLUMN_WIDTH = 480;
const ACTION_COLUMN_WIDTH = 320;
const SPLIT_ACTION_WIDTH = 528;
const SPLIT_HEADLINE_WIDTH = 560;
/** A focus ring draws 5px outside its button, which a scrolling box clips at its padding edge; the negative margin keeps the column in place (ONL-2821). */
const FOCUS_RING_ROOM = 8;

function SignUpTerms({ dim = false }: { dim?: boolean }): React.JSX.Element {
  return <Text type="supporting" color="secondary" style={{ color: dim ? 'var(--color-text-disabled)' : 'var(--color-icon-secondary)' }}>
    {t('account.signUpTerms').split(/(\{privacyPolicy\}|\{termsOfService\})/).map((part) => {
      if (part === '{privacyPolicy}') return <Link key={part} href="https://www.onlook.com/privacy-policy" target="_blank" rel="noopener noreferrer" color="inherit">{t('account.privacyPolicy')}</Link>;
      if (part === '{termsOfService}') return <Link key={part} href="https://www.onlook.com/terms-of-service" target="_blank" rel="noopener noreferrer" color="inherit">{t('account.termsOfService')}</Link>;
      return part;
    })}
  </Text>;
}

function SignInButton({ method, variant, onSignIn, style, label }: { method: SignInMethod; variant: 'primary' | 'secondary'; onSignIn: (method: SignInMethod) => void; style?: React.CSSProperties; label?: StringKey }): React.JSX.Element {
  const text = t(label ?? `account.continue.${method}`);
  return <Button label={text} variant={variant}
    size="md" onClick={() => { onSignIn(method); }}
    style={{ minHeight: 40, ...style }} data-testid={`account-continue-${method}`}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
      <SignInIcon method={method} />{text}
    </span>
  </Button>;
}

const QUIET_SIGN_IN = {
  alignSelf: 'start', padding: '4px 0',
  background: 'none', border: 0, cursor: 'pointer', font: 'inherit', fontSize: 13, color: 'var(--color-text-secondary)',
} as const;

function SplitActions({ onSignIn }: { onSignIn: (method: SignInMethod) => void }): React.JSX.Element {
  return <VStack width="100%" align="stretch">
    <HStack width="100%" gap={2} style={{ paddingBottom: 12 }}>
      <SignInButton method="github" variant="primary" onSignIn={onSignIn} style={{ flex: 1, minWidth: 0 }} />
      <SignInButton method="google" variant="secondary" onSignIn={onSignIn} style={{ flex: 1, minWidth: 0 }} />
    </HStack>
    <button type="button" className="hosted-email-sign-in" style={QUIET_SIGN_IN} onClick={() => { onSignIn('email'); }} data-testid="account-continue-email">
      {t('account.continue.email')}
    </button>
  </VStack>;
}

const REPO = 'onlook-dev/onlook';
const STARS_FALLBACK = 27020;

function formatStars(count: number): string {
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

const STARS_RULES = '.github-stars{color:var(--color-text-secondary)}.github-stars:hover,.github-stars:focus-visible{color:var(--color-text-primary)}.github-stars-out{display:none}.github-stars:hover .github-stars-mark,.github-stars:focus-visible .github-stars-mark{display:none}.github-stars:hover .github-stars-out,.github-stars:focus-visible .github-stars-out{display:block}';

function GitHubStars(): React.JSX.Element {
  const [stars, setStars] = useState(STARS_FALLBACK);
  useEffect(() => {
    let isCurrent = true;
    void studio().githubStars().then((count) => {
      if (isCurrent && count !== null) setStars(count);
    }, ignoreRefusal('cloud', 'github-stars'));
    return () => { isCurrent = false; };
  }, []);
  return <a href={`https://github.com/${REPO}`} target="_blank" rel="noopener noreferrer" data-testid="getting-started-stars"
    aria-label={t('account.githubStars', { count: stars.toLocaleString(intlLocale()) })}
    className="github-stars"
    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
    <style href="github-stars" precedence="medium">{STARS_RULES}</style>
    <GithubIcon aria-hidden="true" className="github-stars-mark" style={{ width: 16, height: 16 }} />
    <GlyphOpenPrompt aria-hidden="true" className="github-stars-out" size={16} />
    {formatStars(stars)}
  </a>;
}

function AppVersion(): React.JSX.Element | null {
  const version = useAppInfoStore((state) => state.version);
  useEffect(() => { void primeAppInfo(); }, []);
  if (version === undefined) return null;
  return <Text size="sm" data-testid="getting-started-version" style={{ color: 'var(--color-text-disabled)', userSelect: 'text', WebkitUserSelect: 'text', cursor: 'text' }}>
    {t('projects.version', { version })}
  </Text>;
}

export interface GettingStartedProps {
  sessionEnded?: boolean;
  busy?: SignInMethod | 'sign-out' | null;
  error?: AccountError | undefined;
  errorMethod?: SignInMethod | null;
  onSignIn: (method: SignInMethod) => void;
  onCancel: () => void;
  step?: AuthSignInStep | null;
  aside?: React.ReactNode;
}

export function AccountPending({ failed = false, onRetry }: { failed?: boolean; onRetry: () => void }): React.JSX.Element {
  if (!failed) return <div data-testid="account-pending" className="account-startup" aria-busy="true">
    <OnlookMark width={48} height={48} role="img" aria-label={t('app.name')} />
    <div role="progressbar" aria-label={t('account.loading')} className="account-startup-progress"><div /></div>
  </div>;
  return <OnboardingShell data-testid="account-pending">
    <VStack width="100%" align="start" justify="center" gap={3} style={{ flex: 1, minHeight: 0 }}>
      <Text role="alert" color="secondary">{t('account.stateFailed')}</Text>
      <Button label={t('account.retry')} variant="secondary" onClick={onRetry} style={{ minHeight: 40 }} />
    </VStack>
  </OnboardingShell>;
}

export function GettingStarted({ busy = null, error, errorMethod = null, onSignIn, onCancel, step = null, aside, sessionEnded = false }: GettingStartedProps): React.JSX.Element {
  const split = aside !== undefined;
  return (
    <OnboardingShell data-testid="getting-started" aside={aside} headerEnd={split ? <GitHubStars /> : undefined}>
      <VStack width="100%" align="start" justify="center" style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingInline: FOCUS_RING_ROOM, paddingBlock: FOCUS_RING_ROOM, marginInline: -FOCUS_RING_ROOM }}>
        <VStack width="100%" gap={split ? 8 : 6} align="start" style={{ maxWidth: split ? SPLIT_HEADLINE_WIDTH : TEXT_COLUMN_WIDTH, paddingBlock: 24, paddingBottom: split ? '6vh' : 24, textWrap: 'pretty' }}>
          {split ? (
            <OnboardingDisplayHeading title="account.getStarted" isHero />
          ) : (
            <OnboardingHeading title="account.getStarted" subtitle="account.getStartedSubtitle" />
          )}
          <VStack width="100%" gap={2} align="stretch" aria-busy={busy !== null}>
            {sessionEnded ? <Text color="secondary" role="status" data-testid="session-ended-notice">{t('account.sessionEnded')}</Text> : null}
            {busy === null ? <VStack width="100%" gap={split ? 3 : 2} align="stretch" style={{ maxWidth: split ? SPLIT_ACTION_WIDTH : ACTION_COLUMN_WIDTH }}>
              {split ? <>
                <SplitActions onSignIn={onSignIn} />
              </> : (['google', 'github', 'email'] as const).map((method) => (
                <SignInButton key={method} method={method} variant={method === 'google' ? 'primary' : 'secondary'} onSignIn={onSignIn} />
              ))}
            </VStack> : null}
            <Text type="supporting" color="secondary" role="status" aria-live="polite">
              {busy === 'sign-out' ? t('account.cancellingSignIn') : step === 'email-verification' ? t('account.emailVerification') : step === 'browser' || busy === 'email' ? t('account.hostedSignIn') : busy !== null ? t('account.browserPending') : ''}
            </Text>
            {busy !== null ? <Button label={t(busy === 'sign-out' ? 'account.cancellingSignIn' : 'account.cancelSignIn')}
              variant="secondary" isDisabled={busy === 'sign-out'} onClick={onCancel} style={{ minHeight: 40, alignSelf: 'start' }}
              data-testid="account-cancel-sign-in" /> : null}
            {error !== undefined ? <Text type="supporting" role="alert" style={{ color: 'var(--color-error)' }}>{accountErrorText(error, errorMethod)}</Text> : null}
          </VStack>
        </VStack>
      </VStack>
      {split ? <HStack width="100%" justify="between" align="center"><AppVersion /><SignUpTerms dim /></HStack> : <SignUpTerms />}
    </OnboardingShell>
  );
}
