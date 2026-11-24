import { useLayoutEffect, useRef } from 'react';
import type { ProjectSetupSnapshot } from '@studio/events';
import { t } from '@studio/i18n';
import { PANEL_HREF, PANEL_RULES } from '../../panel/panelStyles.js';
import { ProjectSetupBody } from '../../project-setup/ProjectSetupPanel.js';
import type { AskState } from '../../project-setup/store.js';
import { noop, type Gallery } from './Showroom.js';

const SAVED: NonNullable<ProjectSetupSnapshot['saved']> = {
  revision: 'setup-demo-1',
  definition: {
    prepare: 'corepack enable\ncorepack prepare pnpm@10.0.0 --activate',
    install: { script: 'pnpm install --frozen-lockfile', inputs: ['package.json', 'pnpm-lock.yaml'], outputs: ['node_modules'] },
    servers: [{ id: 'web', cwd: 'apps/web', start: 'pnpm dev --host 127.0.0.1 --port 3000', port: 3000 }],
  },
};

const PROJECT_SETUP_SHOWROOM_SNAPSHOT: ProjectSetupSnapshot = {
  saved: SAVED, verified: null, state: 'idle', failure: null,
};

export const PROJECT_SETUP_VERIFIED: ProjectSetupSnapshot = { ...PROJECT_SETUP_SHOWROOM_SNAPSHOT, verified: SAVED };

const MOVED = { ...SAVED, definition: { ...SAVED.definition, servers: [{ id: 'web', cwd: 'apps/web', start: 'pnpm dev --port {{port}}', port: 4720 }] } };

export const PROJECT_SETUP_FAILED: ProjectSetupSnapshot = {
  ...PROJECT_SETUP_SHOWROOM_SNAPSHOT,
  state: 'failed',
  failure: {
    revision: SAVED.revision, stage: 'install', command: SAVED.definition.install.script,
    exitCode: 1, elapsedMs: 1250, reason: 'The lockfile does not match package.json.',
    outputTail: 'ERR_PNPM_OUTDATED_LOCKFILE\nCannot install with frozen-lockfile because pnpm-lock.yaml is not up to date.',
  },
};

/** A bun monorepo: the multi-line prepare and the over-long start line the old fixed-height, pre-wrapped box could not show. */
const LONG: ProjectSetupSnapshot = {
  saved: {
    revision: 'setup-demo-long-1',
    definition: {
      prepare: [
        'mise install',
        'corepack enable',
        'bun --version',
        'test -f .env.local || cp .env.example .env.local',
        'bun run --filter @acme/config generate',
      ].join('\n'),
      install: {
        script: 'bun install --frozen-lockfile --filter ./apps/web --filter ./apps/api --filter ./packages/*',
        inputs: ['package.json', 'bun.lock', 'apps/web/package.json', 'apps/api/package.json', 'packages/ui/package.json'],
        outputs: ['node_modules/.bin/next', 'apps/web/node_modules', 'apps/api/node_modules'],
      },
      servers: [
        { id: 'web', cwd: 'apps/web', start: 'bun --bun run next dev --hostname 127.0.0.1 --port 3000 --turbopack --experimental-https=false', port: 3000 },
        { id: 'api', cwd: 'apps/api', start: 'bun run --watch src/server.ts', port: 3001 },
      ],
    },
  },
  verified: null, state: 'idle', failure: null,
};

export const PROJECT_SETUP_EMPTY: ProjectSetupSnapshot = { saved: null, verified: null, state: 'idle', failure: null };

const STATES: { id: string; snapshot: ProjectSetupSnapshot | null; ask?: AskState; readFailed?: boolean; note?: string }[] = [
  { id: 'empty', snapshot: PROJECT_SETUP_EMPTY, note: 'The state a project opens in before its agent has saved anything: what a setup script is for, and the one press that asks for it.' },
  { id: 'empty-focus', snapshot: PROJECT_SETUP_EMPTY },
  { id: 'empty-sending', snapshot: PROJECT_SETUP_EMPTY, ask: 'sending' },
  { id: 'empty-sent', snapshot: PROJECT_SETUP_EMPTY, ask: 'sent' },
  { id: 'empty-busy', snapshot: PROJECT_SETUP_EMPTY, ask: 'busy' },
  { id: 'loading', snapshot: null },
  { id: 'unavailable', snapshot: null, readFailed: true },
  { id: 'unverified', snapshot: PROJECT_SETUP_SHOWROOM_SNAPSHOT },
  { id: 'verified', snapshot: PROJECT_SETUP_VERIFIED },
  { id: 'verified-focus', snapshot: PROJECT_SETUP_VERIFIED },
  ...(['preparing', 'installing', 'starting', 'running', 'stopping'] as const).map((state) => ({
    id: state, snapshot: { ...PROJECT_SETUP_SHOWROOM_SNAPSHOT, state },
  })),
  { id: 'long-script', snapshot: LONG, note: 'A bun monorepo: five prepare lines, five input chips, a 110-character start command, two servers.' },
  { id: 'long-script-running', snapshot: { ...LONG, verified: LONG.saved, state: 'running' }, note: 'Every step reached, so the stepper is all lit and the footer stops instead of starting.' },
  { id: 'error', snapshot: PROJECT_SETUP_FAILED },
  { id: 'port-moved', snapshot: { saved: MOVED, verified: MOVED, failure: null, state: 'running', portMoves: [{ from: 4710, to: 4720 }] } },
  { id: 'port-occupied', snapshot: { ...PROJECT_SETUP_FAILED, failure: { revision: SAVED.revision, serverId: 'web', stage: 'ready', command: SAVED.definition.servers[0]!.start, reason: t('projectSetup.failure.occupiedPort', { port: 3000 }), outputTail: '', elapsedMs: 1250 } } },
  { id: 'not-started-here', snapshot: { ...PROJECT_SETUP_FAILED, failure: { revision: SAVED.revision, serverId: 'web', stage: 'stop', command: SAVED.definition.servers[0]!.start, reason: t('projectSetup.failure.notStartedHere', { port: 3000 }), outputTail: '', elapsedMs: 1250 } } },
  { id: 'port-move-failed', snapshot: { ...PROJECT_SETUP_FAILED, failure: { revision: SAVED.revision, serverId: 'web', stage: 'ready', command: MOVED.definition.servers[0]!.start, reason: t('projectSetup.failure.portMove', { port: 4720 }), outputTail: '', elapsedMs: 1250 } } },
  { id: 'repair-focus', snapshot: PROJECT_SETUP_FAILED },
  { id: 'repair-sending', snapshot: PROJECT_SETUP_FAILED, ask: 'sending' },
  { id: 'repair-sent', snapshot: PROJECT_SETUP_FAILED, ask: 'sent' },
  { id: 'repair-busy', snapshot: PROJECT_SETUP_FAILED, ask: 'busy' },
  { id: 'repair-unavailable', snapshot: PROJECT_SETUP_FAILED, ask: 'unavailable' },
];

/** The settings modal's main column: its 868 less the 220 side rail, so the section measures as it ships (ONL-2499). */
const PANEL_MAIN_WIDTH = 648;

/* One column and no rise: the shell's own height and entrance belong to the modal, and a still has to hold whatever the state is tall enough to need. */
const PAGE: React.CSSProperties = { gridTemplateColumns: '1fr', width: PANEL_MAIN_WIDTH, height: 'auto', animation: 'none' };

/** The section's real host, without the modal around it: `.panel-content` is what the Settings modal gives it. */
function Page({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="panel-shell" style={PAGE}>
    <style href={PANEL_HREF} precedence="medium">{PANEL_RULES}</style>
    <div className="panel-main"><div className="panel-content">{children}</div></div>
  </div>;
}

const FOCUS_TARGET: Record<string, string> = {
  'verified-focus': '[data-testid="project-setup-install"] [role="group"]',
  'repair-focus': '[data-testid="project-setup-ask"]',
  'empty-focus': '[data-testid="project-setup-ask"]',
};

function SectionStill({ id, snapshot, ask, readFailed }: (typeof STATES)[number]): React.JSX.Element {
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const selector = FOCUS_TARGET[id];
    if (selector === undefined || !window.location.hash.includes(id)) return;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    root.current?.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }, [id]);
  return <div ref={root}><Page>
    <ProjectSetupBody snapshot={snapshot} {...(ask === undefined ? {} : { ask })}
      {...(readFailed === undefined ? {} : { readFailed })} onRun={noop} onAsk={noop} />
  </Page></div>;
}

export const PROJECT_SETUP_GALLERY: Gallery = {
  id: 'project-setup', title: 'Setup script', subtitle: 'Read-only saved scripts and explicit agent recovery, in the column Project settings gives them.',
  categories: STATES.map((state) => ({
    id: state.id, title: state.id,
    stories: [{
      id: `project-setup-${state.id}`, title: state.id,
      ...(state.note === undefined ? {} : { note: state.note }),
      render: () => <SectionStill {...state} />,
    }],
  })),
};
