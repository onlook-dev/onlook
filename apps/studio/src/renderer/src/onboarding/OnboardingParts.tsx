import { accountSlot } from '../cloud/slot.js';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';

import { t } from '@studio/i18n';
import type { StringKey } from '@studio/i18n';
import { oneLine } from '@studio/i18n/lines';

// The design's leading; Astryx emits it at no theme setting, and a theme change moves every heading.
const DESIGN_LEADING = 1.4;

export interface OnboardingHeadingProps {
  title: StringKey;
  subtitle: StringKey;
}

// Level 1 is the ramp step nearest the design's 18px; `Text` has no heading step and renders a span.
export function OnboardingHeading({
  title,
  subtitle,
}: OnboardingHeadingProps): React.JSX.Element {
  return (
    <VStack gap={0.5} align="start" data-testid="onboarding-heading">
      <Heading level={1} style={{ lineHeight: DESIGN_LEADING }}>
        {oneLine(t(title))}
      </Heading>
      {/* `large` carries medium weight; the subtitle reads as a second heading. */}
      <Text
        type="large"
        color="secondary"
        style={{ lineHeight: DESIGN_LEADING, fontWeight: 'var(--font-weight-normal)' }}
      >
        {t(subtitle)}
      </Text>
    </VStack>
  );
}

export interface OnboardingDisplayHeadingProps {
  title: StringKey;
  subtitle?: StringKey;
  /** The sign-in headline: larger, and its catalog line break kept. */
  isHero?: boolean;
}

export function OnboardingDisplayHeading({ title, subtitle, isHero = false }: OnboardingDisplayHeadingProps): React.JSX.Element {
  const type = isHero
    ? { fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.025em', whiteSpace: 'pre' }
    : { fontSize: 32, lineHeight: 1.15, letterSpacing: '-0.02em' };
  return (
    <VStack gap={3} align="start" data-testid="onboarding-heading">
      <h1 style={{ margin: 0, ...type, fontWeight: 'var(--font-weight-normal)', color: 'var(--color-text-primary)', textWrap: 'balance' } as React.CSSProperties}>
        {t(title)}
      </h1>
      {subtitle === undefined ? null : (
        <Text type="large" color="secondary" style={{ lineHeight: DESIGN_LEADING, fontWeight: 'var(--font-weight-normal)' }}>
          {t(subtitle)}
        </Text>
      )}
    </VStack>
  );
}

/** The rail's account menu, through the same slot: null in a build with no cloud, and its 28px held before it loads. */
export function OnboardingAccount(): React.ReactNode {
  return accountSlot('icon');
}

export interface OnboardingFooterProps {
  hasBack?: boolean;
  onBack?: () => void;
  onSkip?: () => void;
  /** Absent draws no Continue; `false` draws it disabled. */
  isContinueEnabled?: boolean;
  onContinue?: () => void;
}

export function OnboardingFooter({
  hasBack = false,
  onBack,
  onSkip,
  isContinueEnabled,
  onContinue,
}: OnboardingFooterProps): React.JSX.Element {
  return (
    <HStack width="100%" justify="between" align="center" data-testid="onboarding-footer">
      <HStack gap={2} align="center">
        {/* The design's help button is absent until a help surface exists (ONL-1953). */}
        {hasBack ? (
          <Button
            label={t('onboarding.back')}
            variant="secondary"
            size="md"
            onClick={onBack}
            isDisabled={onBack === undefined}
            data-testid="onboarding-back"
          />
        ) : null}
      </HStack>

      {onSkip ? (
        <Button
          label={t('onboarding.skip')}
          variant="ghost"
          size="md"
          onClick={onSkip}
          data-testid="onboarding-skip"
        />
      ) : null}

      {isContinueEnabled === undefined ? null : isContinueEnabled ? (
        <Button
          label={t('onboarding.continue')}
          variant="primary"
          size="md"
          onClick={onContinue}
          data-testid="onboarding-continue"
        />
      ) : (
        // A different container, not Astryx's disabled treatment on the enabled one.
        <Button
          label={t('onboarding.continue')}
          variant="secondary"
          size="md"
          isDisabled
          style={
            { '--color-neutral': 'var(--color-background-muted)' } as React.CSSProperties
          }
          data-testid="onboarding-continue"
        />
      )}
    </HStack>
  );
}
