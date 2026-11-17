import { Heading } from '@astryxdesign/core/Heading';
import { VStack } from '@astryxdesign/core/VStack';
import type { HarnessId } from '@studio/events';
import { GithubSettings } from '../github-import/GithubImport.js';
import { t } from '@studio/i18n';
import type { Readiness } from './readiness.js';
import { NotificationSettingsRow, type NotificationControls } from '../notifications/NotificationSurfaces.js';
import {
  DefaultAgentRow,
  AnalyticsRow,
  ResetTipsRow,
  DefaultEffortRow,
  DefaultModelRow,
  SETTINGS_TESTIDS,
  SettingsSection,
  PANE_LEADING,
  type DefaultEffortRowProps,
  type DefaultModelRowProps,
  type AnalyticsRowProps,
  type ResetTipsRowProps,
} from './rows.js';

/** The design's General page column; a number like `PROJECT_CARD_WIDTH`, since the grid it sits beside is sized the same way. */
export const SETTINGS_CONTENT_WIDTH = 600;

const COLUMN = { width: '100%', maxWidth: SETTINGS_CONTENT_WIDTH } as const;

export interface SettingsSectionsProps {
  analytics?: AnalyticsRowProps;
  notifications?: NotificationControls;
  billingLabel?: string;
  agent: HarnessId;
  readiness: Record<HarnessId, Readiness>;
  onAgentChange: (agent: HarnessId) => void;
  onSetUp: (agent: HarnessId) => void;
  /** The Model row, under Agent. */
  models?: DefaultModelRowProps;
  /** The Thinking effort row, under Model. */
  effort?: DefaultEffortRowProps;
  tips?: ResetTipsRowProps;
}

/** The sections alone, for a column whose header already carries the title (the projects view). */
export function SettingsSections({
  agent,
  readiness,
  onAgentChange,
  onSetUp,
  models,
  effort,
  billingLabel,
  notifications,
  analytics,
  tips,
}: SettingsSectionsProps): React.JSX.Element {
  return (
    <VStack className="settings-pane" gap={8} style={{ ...COLUMN, ...PANE_LEADING }} data-testid={SETTINGS_TESTIDS.pane}>
      <SettingsSection label={t('settings.section.defaults')} testId="settings-section-defaults">
        <DefaultAgentRow value={agent} readiness={readiness} onChange={onAgentChange} onSetUp={onSetUp} billingLabel={billingLabel} />
        {models !== undefined && <DefaultModelRow {...models} />}
        {effort !== undefined && <DefaultEffortRow {...effort} />}
      </SettingsSection>
      {notifications !== undefined && <SettingsSection label={t('notifications.title')} testId="settings-section-notifications"><NotificationSettingsRow {...notifications} /></SettingsSection>}
      {analytics !== undefined && <SettingsSection label={t(analytics.consent === undefined ? 'settings.analytics.title' : 'telemetry.settings.section')} testId="settings-section-analytics"><AnalyticsRow {...analytics} /></SettingsSection>}
      {tips !== undefined && <SettingsSection label={t('settings.tips.title')} testId="settings-section-tips"><ResetTipsRow {...tips} /></SettingsSection>}
      <GithubSettings />
    </VStack>
  );
}

export type SettingsPaneProps = SettingsSectionsProps;

/** Title plus sections: the pane as the design draws it, for a standalone mount. */
export function SettingsPane(props: SettingsPaneProps): React.JSX.Element {
  return (
    <VStack gap={6} style={COLUMN}>
      <Heading level={1} type="display-3" color="primary">
        {t('settings.title')}
      </Heading>
      <SettingsSections {...props} />
    </VStack>
  );
}
