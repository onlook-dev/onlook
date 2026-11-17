import { VStack } from '@astryxdesign/core/VStack';
import { ToggleButton, ToggleButtonGroup } from '@astryxdesign/core/ToggleButton';
import { t } from '@studio/i18n';
import { SETTINGS_CONTENT_WIDTH } from './SettingsPane.js';
import { CodePanelRow, PANE_LEADING, SettingsSection, type SettingsSwitchProps } from './rows.js';

export type SettingsPaneId = 'general' | 'experimental';

export function SettingsNavigation({ value, onChange }: { value: SettingsPaneId; onChange: (pane: SettingsPaneId) => void }): React.JSX.Element {
  return (
    <ToggleButtonGroup label={t('settings.panes.label')} value={value} type="single" onChange={(next) => {
      if (next === 'general' || next === 'experimental') onChange(next);
    }}>
      <ToggleButton value="general" label={t('settings.general')} data-testid="settings-nav-general" />
      <ToggleButton value="experimental" label={t('settings.experimental')} data-testid="settings-nav-experimental" />
    </ToggleButtonGroup>
  );
}

export function ExperimentalPane(props: SettingsSwitchProps): React.JSX.Element {
  return (
    <VStack className="settings-pane" gap={8} style={{ width: '100%', maxWidth: SETTINGS_CONTENT_WIDTH, ...PANE_LEADING }} data-testid="settings-experimental-pane">
      <SettingsSection label={t('settings.experimental')}>
        <CodePanelRow {...props} />
      </SettingsSection>
    </VStack>
  );
}
