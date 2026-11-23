/**
 * ONL-2115 — the settings pane as a still life: every row live from fixtures
 * (a pick moves its selector, a name field commits to local state), and the
 * full pane. Fixture readiness through the real mapping; strings through the
 * catalog. `bun run showroom settings` (or `settings:agent`, `settings:model`,
 * `settings:effort`, `settings:pane`).
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { ExperimentalPane, SettingsNavigation } from '../../settings/ExperimentalPane.js';
import { VStack } from '@astryxdesign/core/VStack';
import {
  IDLE_CLAUDE_SETUP_STATE,
  DEFAULT_NOTIFICATIONS,
  IDLE_CODEX_SETUP_STATE,
  type EffortLevel,
  type HarnessId,
  type ModelChoice,
  type ProjectSetupSnapshot,
} from '@studio/events';
import type { SetupDialogFacts } from '../../agent-setup/dialog.js';
import { SetupDialogView, setupStrings } from '../../agent-setup/SetupDialogHost.js';
import { useProjectSetupStore } from '../../project-setup/store.js';
import { SETTINGS_DIALOG_TESTIDS, SettingsDialogView } from '../../settings/SettingsDialog.js';
import type { SettingsArea } from '../../settings/settingsDialogStore.js';
import { PROJECT_SETUP_EMPTY, PROJECT_SETUP_FAILED, PROJECT_SETUP_VERIFIED } from './project-setup.js';
import { t } from '@studio/i18n';
import { carriesEffort, effortLevelsFor } from '../../settings/derive.js';
import {
  EMPTY_CATALOG,
  MODEL_CATALOGS,
  READINESS_FIXTURE_IDS,
  READINESS_FIXTURES,
  type ReadinessFixtureId,
} from '../../settings/fixtures.js';
import type { Readiness } from '../../settings/readiness.js';
import { AnalyticsRow, DefaultAgentRow, DefaultEffortRow, DefaultModelRow, SettingsSection } from '../../settings/rows.js';
import { SETTINGS_CONTENT_WIDTH, SettingsPane } from '../../settings/SettingsPane.js';
import { noop, type Category, type Gallery, type Story } from './Showroom.js';

const BOX = { width: SETTINGS_CONTENT_WIDTH, flex: '0 0 auto' } as const;

function AnalyticsStill({ value, state }: { value: boolean; state: 'default' | 'hover' | 'focus' | 'saving' | 'error' }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (state !== 'focus') return;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    root.current?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true });
  }, [state]);
  return <VStack ref={root} style={BOX} data-experimental-still={state}>
    <style href="settings-experimental-states" precedence="medium">{EXPERIMENTAL_STATES}</style>
    <SettingsSection label={t('settings.analytics.title')}>
      <AnalyticsRow value={value} onChange={noop} isSaving={state === 'saving'} saveFailed={state === 'error'} />
    </SettingsSection>
  </VStack>;
}

function SignInStill({ readiness, mode }: { readiness: Readiness; mode: 'default' | 'hover' | 'focus' }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const id = `settings-sign-in-${readiness}-${mode}`;
  useLayoutEffect(() => {
    if (mode === 'focus' && window.location.hash.includes(id)) root.current?.querySelector<HTMLElement>('[data-testid="settings-agent-setup"]')?.focus({ preventScroll: true });
  }, [id, mode]);
  return <div ref={root} data-settings-sign-in={mode}>
    <style>{'[data-settings-sign-in="hover"] [data-testid="settings-agent-setup"] { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); } [data-settings-sign-in="focus"] [data-testid="settings-agent-setup"] { outline: 2px solid var(--color-accent); outline-offset: var(--button-focus-offset); }'}</style>
    <LiveRow initial="claude" readiness={{ claude: readiness, codex: 'ready', opencode: 'ready', freebuff: 'ready' }} />
  </div>;
}

const EXPERIMENTAL_STATES = `
[data-experimental-still="hover"] input + div {
  background-color: color-mix(in srgb, var(--color-background-gray), var(--color-tint-hover) 5%);
}
[data-experimental-still="hover"] input:checked + div {
  background-color: color-mix(in srgb, var(--color-accent), var(--color-tint-hover) 15%);
}
[data-experimental-still="nav-hover"] [data-testid="settings-nav-general"] {
  background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover));
}`;

function ExperimentalStill({ value, state }: { value: boolean; state: 'hover' | 'focus' | 'nav-hover' | 'nav-focus' }): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const id = `settings-experimental-${value ? 'on' : 'off'}-${state}`;
  useLayoutEffect(() => {
    if (!state.endsWith('focus') || !window.location.hash.includes(id)) return;
    root.current?.querySelector<HTMLElement>(state === 'nav-focus' ? '[data-testid="settings-nav-general"]' : 'input')?.focus({ preventScroll: true });
  }, [id, state]);
  return (
    <VStack ref={root} gap={6} style={BOX} data-experimental-still={state}>
      <style href="settings-experimental-states" precedence="medium">{EXPERIMENTAL_STATES}</style>
      <SettingsNavigation value="experimental" onChange={noop} />
      <ExperimentalPane value={value} onChange={noop} />
    </VStack>
  );
}

/** A commit renames in local state, so the field shows the round trip the connected pane gets from the broadcast. */
interface LiveProps {
  initial: HarnessId;
  readiness: Record<HarnessId, Readiness>;
}

/** The row owns its pick so the selector moves — the one live control in the still life. */
function LiveRow({ initial, readiness }: LiveProps): React.JSX.Element {
  const [agent, setAgent] = useState(initial);
  return (
    <VStack style={BOX}>
      <SettingsSection label={t('settings.section.defaults')}>
        <DefaultAgentRow value={agent} readiness={readiness} onChange={setAgent} onSetUp={noop} />
      </SettingsSection>
    </VStack>
  );
}

/** Model and effort together, coupled the way the connected pane couples them: levels follow the picked model. */
function LiveDefaults({ options }: { options: readonly ModelChoice[] }): React.JSX.Element {
  const [model, setModel] = useState<string | null>(null);
  const [effort, setEffort] = useState<EffortLevel | null>(null);
  const levels = effortLevelsFor(options, model);
  return (
    <VStack style={BOX}>
      <SettingsSection label={t('settings.section.defaults')}>
        {[
          <DefaultModelRow
            key="model"
            value={model}
            options={options}
            onChange={(next) => {
              setModel(next);
              if (!carriesEffort(options, next, effort)) setEffort(null);
            }}
          />,
          <DefaultEffortRow key="effort" value={effort} levels={levels} onChange={setEffort} />,
        ]}
      </SettingsSection>
    </VStack>
  );
}

function LiveEffort({ levels }: { levels: readonly EffortLevel[] }): React.JSX.Element {
  const [effort, setEffort] = useState<EffortLevel | null>(null);
  return (
    <VStack style={BOX}>
      <SettingsSection label={t('settings.section.defaults')}>
        <DefaultEffortRow value={effort} levels={levels} onChange={setEffort} />
      </SettingsSection>
    </VStack>
  );
}

function LivePane({ initial, readiness, full = false }: LiveProps & { full?: boolean }): React.JSX.Element {
  const [agent, setAgent] = useState(initial);
  const [model, setModel] = useState<string | null>(null);
  const [effort, setEffort] = useState<EffortLevel | null>(null);
  const options = MODEL_CATALOGS[agent];
  const pickAgent = (next: HarnessId): void => {
    setAgent(next);
    setModel(null);
    setEffort(null);
  };
  return (
    <VStack style={BOX}>
      {full ? (
        <SettingsPane
          agent={agent}
          readiness={readiness}
          onAgentChange={pickAgent}
          onSetUp={noop}
          models={{
            value: model,
            options,
            onChange: (next) => {
              setModel(next);
              if (!carriesEffort(options, next, effort)) setEffort(null);
            },
          }}
          effort={{ value: effort, levels: effortLevelsFor(options, model), onChange: setEffort }}
        />
      ) : (
        <SettingsPane agent={agent} readiness={readiness} onAgentChange={setAgent} onSetUp={noop} />
      )}
    </VStack>
  );
}

const NOT_IN_FLIGHT = { detect: false, submit: false, check: false, signIn: false } as const;

/** The sheet as Set up leaves it: nothing detected yet, nothing in flight. */
const SHEET_FACTS: SetupDialogFacts = {
  claude: IDLE_CLAUDE_SETUP_STATE,
  claudeSettled: undefined,
  codex: IDLE_CODEX_SETUP_STATE,
  code: '',
  codexSignInAttempted: false,
  inFlight: { claude: NOT_IN_FLIGHT, codex: NOT_IN_FLIGHT },
};

/* The rise is the modal's entrance, so a still would catch it mid-flight; hover and focus are states no fixture can hold. */
const MODAL_STATES = `
[data-settings-still] .panel-shell { animation: none; }
[data-settings-still='modal-nav-hover'] .panel-nav-item[data-testid='${SETTINGS_DIALOG_TESTIDS.areaProject}'] {
  background: var(--panel-hover); color: var(--panel-ink);
}
[data-settings-still='modal-nav-focus'] .panel-nav-item[data-testid='${SETTINGS_DIALOG_TESTIDS.areaProject}'] {
  outline: 2px solid var(--color-accent);
}`;

interface ModalStillProps {
  id: string;
  initial: SettingsArea;
  hasProject?: boolean;
  snapshot?: ProjectSetupSnapshot;
  /** The harness sheet over the modal: a real `showModal()`, so it is drawn only when the hash asks for this story. */
  sheet?: boolean;
}

function ModalStill({ id, initial, hasProject = true, snapshot, sheet = false }: ModalStillProps): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState(initial);
  const [isSheetOpen] = useState(() => {
    if (snapshot !== undefined) useProjectSetupStore.setState({ read: { kind: 'ready', snapshot }, ask: 'idle' });
    return sheet && window.location.hash.includes(id);
  });
  useLayoutEffect(() => {
    if (id !== 'modal-nav-focus' || !window.location.hash.includes(id)) return;
    root.current?.querySelector<HTMLElement>(`[data-testid="${SETTINGS_DIALOG_TESTIDS.areaProject}"]`)?.focus({ preventScroll: true });
  }, [id]);
  return (
    /* Never shrink: the shell's 220 side rail is fixed, so a narrowed modal takes it out of the settings column and the still measures a width that does not ship. */
    <div ref={root} data-settings-still={id} style={{ flex: '0 0 auto' }}>
      <style href="settings-modal-states" precedence="medium">{MODAL_STATES}</style>
      <SettingsDialogView isOpen isInline area={area} hasProject={hasProject} onClose={noop} onArea={setArea} />
      {isSheetOpen ? (
        <SetupDialogView harness="claude" facts={SHEET_FACTS} strings={setupStrings()} onAction={noop} onOpenChange={noop} />
      ) : null}
    </div>
  );
}

function modalCategory(id: string, title: string, note: string, props: Omit<ModalStillProps, 'id'>): Category {
  return { id, title, stories: [{ id: `settings-gallery-${id}`, title, note, wide: true, render: () => <ModalStill id={id} {...props} /> }] };
}

function rowStory(id: ReadinessFixtureId): Story {
  const fixture = READINESS_FIXTURES[id];
  return {
    id: `settings-gallery-agent-${id}`,
    title: id,
    note: `${fixture.agent} · claude ${fixture.claude} · codex ${fixture.codex}`,
    render: () => <LiveRow initial={fixture.agent} readiness={fixture.readiness} />,
  };
}

const CATEGORIES: Category[] = [
  {
    id: 'sign-in',
    title: 'Claude sign-in from Settings',
    stories: (['not-signed-in', 'sign-in-incomplete', 'checking', 'ready'] as const).flatMap((readiness) =>
      (readiness === 'checking' || readiness === 'ready' ? ['default'] as const : ['default', 'hover', 'focus'] as const).map((mode) => ({
        id: `settings-sign-in-${readiness}-${mode}`,
        title: `${readiness} ${mode}`,
        render: () => <SignInStill readiness={readiness} mode={mode} />,
      }))),
  },
  {
    id: 'analytics',
    title: 'Analytics',
    stories: [{
      id: 'settings-analytics-general',
      title: 'General Settings',
      render: () => <SettingsPane agent="codex" readiness={{ claude: 'ready', codex: 'ready', opencode: 'ready', freebuff: 'ready' }} onAgentChange={noop} onSetUp={noop} notifications={{ preference: DEFAULT_NOTIFICATIONS, onAction: noop }} analytics={{ value: true, onChange: noop }} />,
    }, ...[true, false].flatMap((value) => (['default', 'hover', 'focus', 'saving', 'error'] as const).map((state) => ({
      id: `settings-analytics-${value ? 'on' : 'off'}-${state}`,
      title: `${value ? 'On' : 'Off'} ${state}`,
      render: () => <AnalyticsStill value={value} state={state} />,
    })))],
  },
  {
    id: 'experimental',
    title: 'Experimental',
    stories: [false, true].map((value) => ({
      id: `settings-experimental-${value ? 'on' : 'off'}`,
      title: value ? 'Code panel on' : 'Code panel off',
      render: () => <VStack gap={6} style={BOX}><SettingsNavigation value="experimental" onChange={noop} /><ExperimentalPane value={value} onChange={noop} /></VStack>,
    })).concat([
      { id: 'settings-experimental-saving', title: 'Saving', render: () => <VStack style={BOX}><ExperimentalPane value={false} isSaving onChange={noop} /></VStack> },
      { id: 'settings-experimental-error', title: 'Save failed', render: () => <VStack style={BOX}><ExperimentalPane value={false} saveFailed onChange={noop} /></VStack> },
      ...[false, true].flatMap((value) => (['hover', 'focus', 'nav-hover', 'nav-focus'] as const).map((state) => ({
        id: `settings-experimental-${value ? 'on' : 'off'}-${state}`,
        title: `${value ? 'On' : 'Off'} ${state}`,
        render: () => <ExperimentalStill value={value} state={state} />,
      }))),
    ]),
  },
  {
    id: 'agent',
    title: 'Agent — every readiness, Set up offered only when it can help',
    stories: READINESS_FIXTURE_IDS.map(rowStory),
  },
  {
    id: 'model',
    title: 'Default model — Default plus the remembered catalog; effort follows the pick',
    stories: [
      {
        id: 'settings-gallery-model-claude',
        title: 'Claude catalog',
        note: 'Haiku declares no levels, so picking it disables effort',
        render: () => <LiveDefaults options={MODEL_CATALOGS.claude} />,
      },
      {
        id: 'settings-gallery-model-codex',
        title: 'Codex catalog',
        render: () => <LiveDefaults options={MODEL_CATALOGS.codex} />,
      },
      {
        id: 'settings-gallery-model-empty',
        title: 'Catalog empty',
        note: 'no project has opened on this agent yet',
        render: () => <LiveDefaults options={EMPTY_CATALOG} />,
      },
    ],
  },
  {
    id: 'effort',
    title: 'Thinking effort — the picked model’s own levels',
    stories: [
      {
        id: 'settings-gallery-effort-levels',
        title: 'Six levels',
        render: () => <LiveEffort levels={effortLevelsFor(MODEL_CATALOGS.codex, 'gpt-5.6')} />,
      },
      {
        id: 'settings-gallery-effort-none',
        title: 'No levels',
        render: () => <LiveEffort levels={[]} />,
      },
    ],
  },
  {
    id: 'pane',
    title: 'The pane — title and sections in the design order',
    stories: [
      {
        id: 'settings-gallery-pane-full',
        title: 'Everything filled',
        note: 'switching Agent swaps the catalog and re-states the rows under it',
        render: () => <LivePane initial={READINESS_FIXTURES.ready.agent} readiness={READINESS_FIXTURES.ready.readiness} full />,
      },
      {
        id: 'settings-gallery-pane',
        title: 'Defaults only',
        note: 'no model or effort row — Agent alone',
        render: () => <LivePane initial={READINESS_FIXTURES.ready.agent} readiness={READINESS_FIXTURES.ready.readiness} />,
      },
      {
        id: 'settings-gallery-pane-not-installed',
        title: 'Codex picked, not installed',
        render: () => <LivePane initial={READINESS_FIXTURES['not-installed'].agent} readiness={READINESS_FIXTURES['not-installed'].readiness} />,
      },
    ],
  },
  modalCategory('modal-global', 'Modal — Global', 'the whole modal over whichever screen opened it', { initial: 'global' }),
  modalCategory('modal-project', 'Modal — Project, verified', 'the setup section in the column it ships in', { initial: 'project', snapshot: PROJECT_SETUP_VERIFIED }),
  modalCategory('modal-project-failed', 'Modal — Project, failed', 'the failure and the repair action the person can take', { initial: 'project', snapshot: PROJECT_SETUP_FAILED }),
  modalCategory('modal-project-empty', 'Modal — Project, no script', 'what a setup script is for, and the press that asks this project’s agent for one', { initial: 'project', snapshot: PROJECT_SETUP_EMPTY }),
  modalCategory('modal-no-project', 'Modal — no project', 'Global alone: the Project area goes with the project', { initial: 'project', hasProject: false }),
  modalCategory('modal-nav-hover', 'Modal — nav hover', 'the area the pointer is over, not the one showing', { initial: 'global' }),
  modalCategory('modal-nav-focus', 'Modal — nav focus', 'the ring a keyboard leaves on an area', { initial: 'global' }),
  modalCategory('modal-setup-sheet', 'Modal — harness setup over Global', 'the sheet opens in place, over the modal that asked for it', { initial: 'global', sheet: true }),
];

export const SETTINGS_GALLERY: Gallery = {
  id: 'settings',
  title: 'Settings',
  subtitle: 'The modal, the pane and every row from fixtures alone.',
  categories: CATEGORIES,
};
