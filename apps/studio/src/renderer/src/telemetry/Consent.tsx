import { Button } from '@astryxdesign/core/Button';
import { HStack, VStack } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { t } from '@studio/i18n';
import { OnboardingShell } from '../onboarding/OnboardingShell.js';
import { OnboardingDisplayHeading, OnboardingHeading } from '../onboarding/OnboardingParts.js';
import { LoginAside } from '../login/LoginAside.js';
import { useSettingsStore } from '../settings/store.js';

export interface ConsentViewProps {
  saving?: boolean;
  failed?: boolean;
  onAnswer(enabled: boolean): void;
  aside?: React.ReactNode;
}

export function ConsentView({ saving = false, failed = false, onAnswer, aside }: ConsentViewProps): React.JSX.Element {
  return (
    <OnboardingShell data-testid="telemetry-consent" aside={aside}>
      <VStack gap={6} align="start" style={{ maxWidth: 520 }}>
        {aside === undefined
          ? <OnboardingHeading title="telemetry.title" subtitle="telemetry.subtitle" />
          : <OnboardingDisplayHeading title="telemetry.title" subtitle="telemetry.subtitle" />}
        <VStack gap={3} align="start">
          <Text color="secondary">{t('telemetry.details')}</Text>
          <Text color="secondary">{t('telemetry.choice')}</Text>
          {failed && <Text role="alert" style={{ color: 'var(--color-error)' }} data-testid="telemetry-save-error">{t('settings.analytics.saveFailed')}</Text>}
        </VStack>
      </VStack>
      <HStack gap={3} width="100%" justify="end">
        <Button label={t('telemetry.decline')} variant="secondary" size="md" isDisabled={saving} onClick={() => onAnswer(false)} data-testid="telemetry-decline" />
        <Button label={t('telemetry.accept')} variant="primary" size="md" isDisabled={saving} onClick={() => onAnswer(true)} data-testid="telemetry-accept" />
      </HStack>
    </OnboardingShell>
  );
}

export function ConsentGate(): React.JSX.Element {
  const saving = useSettingsStore((state) => state.isAnalyticsSaving);
  const failed = useSettingsStore((state) => state.analyticsSaveFailed);
  const save = useSettingsStore((state) => state.setAnalytics);
  return <ConsentView saving={saving} failed={failed} onAnswer={(enabled) => void save(enabled)} aside={<LoginAside />} />;
}
