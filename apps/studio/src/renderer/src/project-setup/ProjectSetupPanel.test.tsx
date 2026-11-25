import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Dialog } from '@astryxdesign/core/Dialog';
import type { ProjectSetupSnapshot } from '@studio/events';
import { t } from '@studio/i18n';
import { ProjectSetupBody } from './ProjectSetupPanel.js';
import { setupSnapshot, twoServerSetup } from './fixtures.test-support.js';
import type { AskState } from './store.js';

function render(snapshot: ProjectSetupSnapshot | null, ask: AskState = 'idle', isServerLive = false): string {
  return renderToStaticMarkup(<ProjectSetupBody snapshot={snapshot} ask={ask} isServerLive={isServerLive}
    onRun={() => undefined} onAsk={() => undefined} />);
}

describe('the read-only project setup surface', () => {
  it('explains an automatic port change in one sentence', () => {
    const snapshot = { ...setupSnapshot('running'), portMoves: [{ from: 48001, to: 4700 }] };
    expect(render(snapshot)).toContain(t('projectSetup.portMoved', snapshot.portMoves[0]!));
  });

  it('renders without a browser or preload, including the loading and empty states', () => {
    expect(render(null)).toContain(t('projectSetup.loading'));
    expect(render({ saved: null, verified: null, state: 'idle', failure: null })).toContain(t('projectSetup.empty'));
  });

  it('walks preparation, installation and every server as one sequence, in saved order', () => {
    const markup = render(twoServerSetup());
    const order = ['project-setup-preparation', 'project-setup-install', 'project-setup-server-web', 'project-setup-server-api']
      .map((id) => markup.indexOf(`data-testid="${id}"`));
    expect(order.every((at) => at > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('shows every command in a code region, with no hand-rolled read-only textbox', () => {
    const markup = render(setupSnapshot());
    expect(markup).toContain('corepack enable');
    expect(markup).toContain('pnpm install --frozen-lockfile');
    expect(markup).toContain('pnpm dev --port 3000');
    expect(markup).toContain('apps/web');
    expect(markup).toContain('role="group"');
    expect(markup).not.toContain('role="textbox"');
    expect(markup).not.toContain('aria-readonly');
    expect(markup).not.toContain('<textarea');
    expect(markup).not.toContain('contenteditable');
    expect(markup).not.toContain('project-setup-ask');
  });

  it('puts a long start command into the markup whole, never truncated', () => {
    const snapshot = setupSnapshot();
    const long = `bun --filter ./apps/web dev --host 127.0.0.1 --port 3000 ${'--define __BUILD__=local '.repeat(5)}`.trim();
    snapshot.saved!.definition.servers = [{ id: 'web', cwd: 'apps/web', start: long, port: 3000 }];
    expect(long.length).toBeGreaterThan(150);
    expect(render(snapshot)).toContain(long);
  });

  it('names install inputs and outputs as chips, and says so plainly when there are none', () => {
    const snapshot = setupSnapshot();
    snapshot.saved!.definition.install.inputs = ['package.json', 'bun.lock', 'apps/web/package.json'];
    snapshot.saved!.definition.install.outputs = [];
    const markup = render(snapshot);
    expect(markup).toContain(t('projectSetup.installInputs'));
    expect(markup).toContain('bun.lock');
    expect(markup).toContain('apps/web/package.json');
    expect(markup).toContain(t('projectSetup.none'));
  });

  it('says a step needs no command rather than drawing an empty code block', () => {
    const snapshot = setupSnapshot();
    snapshot.saved!.definition.prepare = '';
    expect(render(snapshot)).toContain(t('projectSetup.noCommand'));
  });

  it('distinguishes the saved version from the last version verified by main', () => {
    const snapshot = setupSnapshot();
    expect(render(snapshot)).toContain(t('projectSetup.unverified'));
    expect(render(snapshot)).toContain(t('projectSetup.state.unverified'));
    snapshot.verified = snapshot.saved;
    expect(render(snapshot)).toContain(t('projectSetup.state.idle'));
    snapshot.verified = { ...snapshot.saved!, revision: 'older' };
    expect(render(snapshot)).toContain(t('projectSetup.previousVerified'));
  });

  it('leads with the execution state and publishes it for a walk to read', () => {
    for (const state of ['idle', 'preparing', 'installing', 'starting', 'running', 'stopping', 'failed'] as const) {
      const snapshot = setupSnapshot(state);
      snapshot.verified = snapshot.saved;
      const markup = render(snapshot);
      expect(markup).toContain(t(`projectSetup.state.${state}`));
      expect(markup).toContain(`data-setup-state="${state}"`);
    }
  });

  it('announces the state politely, because the dialog title is read only on open', () => {
    const markup = render(setupSnapshot('running'));
    const at = markup.indexOf('data-testid="project-setup-status-text"');
    expect(at).toBeGreaterThan(-1);
    expect(markup.slice(at, at + 200)).toContain(t('projectSetup.state.running'));
    expect(markup.slice(0, at)).toContain('role="status"');
  });

  it('keeps two steps apart when a server is named after one of them', () => {
    const snapshot = setupSnapshot();
    snapshot.saved!.definition.servers = [{ id: 'install', cwd: 'apps/web', start: 'bun dev', port: 3000 }];
    const markup = render(snapshot);
    expect(markup).toContain('data-testid="project-setup-install"');
    expect(markup).toContain('data-testid="project-setup-server-install"');
  });

  it('drops the previous run\'s failure once the next run is in flight', () => {
    const snapshot = setupSnapshot('failed');
    expect(render(snapshot)).toContain('project-setup-failure');
    snapshot.state = 'installing';
    const markup = render(snapshot);
    expect(markup).not.toContain('project-setup-failure');
    expect(markup).not.toContain('project-setup-ask');
  });

  it('stops a running project, starts a settled one, and waits out a run in flight', () => {
    expect(render(setupSnapshot('running'))).toContain(t('projectSetup.stop'));
    expect(render(setupSnapshot())).toContain(t('projectSetup.run'));
    expect(render(setupSnapshot('failed'))).toContain(t('projectSetup.run'));
    for (const state of ['preparing', 'installing', 'starting', 'stopping'] as const) {
      const at = render(setupSnapshot(state)).indexOf('data-testid="project-setup-run"');
      expect(at, state).toBeGreaterThan(-1);
      expect(render(setupSnapshot(state)).slice(0, at)).toContain('disabled');
    }
  });

  it('offers Stop, not Start, beside a server the canvas already reports live', () => {
    expect(render(setupSnapshot(), 'idle', true)).toContain(t('projectSetup.stop'));
    expect(render(setupSnapshot(), 'idle', true)).not.toContain(t('projectSetup.run'));
  });

  it('offers only the agent request when there is no script to run, and never a Close of its own', () => {
    const markup = render({ saved: null, verified: null, state: 'idle', failure: null });
    expect(markup).not.toContain('project-setup-run');
    expect(markup).toContain('data-testid="project-setup-ask"');
    expect(markup).toContain(t('projectSetup.ask.setup'));
    expect(markup).not.toContain('project-setup-close');
    expect(render(setupSnapshot('failed'))).not.toContain('project-setup-close');
  });

  it('says what a setup script is for, and reports an empty project’s request back', () => {
    const empty: ProjectSetupSnapshot = { saved: null, verified: null, state: 'idle', failure: null };
    expect(render(empty)).toContain(t('projectSetup.noScript'));
    expect(render(empty)).toContain(t('projectSetup.empty'));
    for (const ask of ['sending', 'sent', 'busy', 'unavailable'] as const) {
      const markup = render(empty, ask);
      expect(markup).toContain(t(`projectSetup.ask.setup.${ask}`));
      expect(markup).not.toContain(t('projectSetup.ask.repair'));
      // Only a request still in flight takes the press away: a delivered one the agent never answers must stay askable.
      expect(markup.includes('disabled')).toBe(ask === 'sending');
    }
  });

  it('renders no dialog heading, so the modal around it keeps its own name', () => {
    const markup = renderToStaticMarkup(
      <Dialog isOpen isInline aria-label="Settings" onOpenChange={() => undefined}>
        <ProjectSetupBody snapshot={setupSnapshot()} onRun={() => undefined} onAsk={() => undefined} />
      </Dialog>,
    );
    expect(markup).toContain(t('projectSetup.state.unverified'));
    expect(markup).not.toMatch(/<h\d[^>]*\bid=/);
  });

  it('keeps failure evidence visible through pending, busy and unavailable repair delivery', () => {
    for (const ask of ['sending', 'sent', 'busy', 'unavailable'] as const) {
      const markup = render(setupSnapshot('failed'), ask);
      expect(markup).toContain(t('projectSetup.ask.repair'));
      expect(markup).toContain('Lockfile changed');
      expect(markup).toContain('ERR_PNPM_OUTDATED_LOCKFILE');
      expect(markup).toContain(t(`projectSetup.ask.repair.${ask}`));
      expect(markup.includes('disabled')).toBe(ask === 'sending');
    }
  });

  it('escapes script and failure content instead of rendering markup', () => {
    const snapshot = setupSnapshot('failed');
    snapshot.saved!.definition.prepare = '<script>run()</script>';
    snapshot.failure!.reason = '<img src=x onerror=run()>';
    const markup = render(snapshot);
    expect(markup).toContain('&lt;script&gt;');
    expect(markup).not.toContain('<script>run()');
    expect(markup).not.toContain('<img src=x');
  });
});
