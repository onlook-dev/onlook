import { ConsentView } from '../../telemetry/Consent.js';
import { AnalyticsRow, SettingsSection } from '../../settings/rows.js';
import { t } from '@studio/i18n';
import { Focused, noop, type Gallery } from './Showroom.js';

const STATES = ['default', 'hover-yes', 'hover-no', 'focus-yes', 'focus-no', 'saving', 'error'] as const;
const SETTINGS_STATES = ['on', 'off', 'saving', 'error', 'removed', 'hover', 'focus'] as const;

function Question({ state }: { state: typeof STATES[number] }): React.JSX.Element {
  const selector = state.startsWith('focus') || state.startsWith('hover')
    ? `[data-testid="telemetry-${state.endsWith('yes') ? 'accept' : 'decline'}"]`
    : undefined;
  return <Focused selector={selector} hover={state.startsWith('hover')}>
    <div style={{ width: 900, height: 600 }} data-consent-state={state}>
      <style href="source-consent-states" precedence="medium">{`
        [data-consent-state="hover-yes"] [data-testid="telemetry-accept"],
        [data-consent-state="hover-no"] [data-testid="telemetry-decline"] {
          background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover));
        }
        [data-consent-state="focus-yes"] [data-testid="telemetry-accept"],
        [data-consent-state="focus-no"] [data-testid="telemetry-decline"] {
          outline: 2px solid var(--color-accent);
          outline-offset: 3px;
        }
      `}</style>
      <ConsentView saving={state === 'saving'} failed={state === 'error'} onAnswer={noop} />
    </div>
  </Focused>;
}

function AnalyticsState({ state }: { state: typeof SETTINGS_STATES[number] }): React.JSX.Element {
  return <Focused selector={state === 'hover' || state === 'focus' ? '[role="switch"]' : undefined} hover={state === 'hover'}>
    <div style={{ width: 600 }} data-analytics-state={state}>
      <style href="source-analytics-states" precedence="medium">{`
        [data-analytics-state="hover"] .astryx-switch {
          background-color: color-mix(in srgb, var(--color-accent), var(--color-tint-hover) 15%);
        }
        [data-analytics-state="focus"] .astryx-switch {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
      `}</style>
      <SettingsSection label={t('telemetry.settings.section')}>
        <AnalyticsRow consent={state === 'removed' ? 'removed' : state === 'off' ? 'declined' : 'accepted'} value={state !== 'off' && state !== 'removed'} isSaving={state === 'saving'} saveFailed={state === 'error'} onChange={noop} />
      </SettingsSection>
    </div>
  </Focused>;
}

export const TELEMETRY_GALLERY: Gallery = {
  id: 'telemetry',
  title: 'Telemetry consent',
  categories: [
    ...STATES.map((state) => ({ id: state, title: state, stories: [{ id: `consent-${state}`, title: state, wide: true, render: () => <Question state={state} /> }] })),
    ...['setting', 'settings'].flatMap((prefix) => SETTINGS_STATES.map((state) => ({ id: `${prefix}-${state}`, title: `Privacy — ${state}`, stories: [{ id: `${prefix}-${state}`, title: state, render: () => <AnalyticsState state={state} /> }] }))),
  ],
};
