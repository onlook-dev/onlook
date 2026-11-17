import { PROJECT_SETUP_REPAIR_PROMPT, projectSetupAskKind, setupRepairStep, type ProjectSetupAskKind, type ProjectSetupAskResult, type ProjectSetupSnapshot } from '@studio/events';
import { repairContext } from '../../instructions/repair.js';
import { startPrompt } from '../../instructions/start.js';
import { t } from '@studio/i18n';
import { canonicalPath } from '../lib/canonical-path.js';
import { flagOn } from '../flags/index.js';
import { log } from '../log/index.js';

export function createProjectSetupAsk(deps: {
  read(cwd: string): ProjectSetupSnapshot;
  busy(cwd: string): boolean;
  /** The briefing project creation pairs with the same prompt: without it the agent picks a port the user's own server already answers on (ONL-2499). */
  detect(cwd: string): Promise<string | undefined>;
  deliver(cwd: string, prompt: string, context?: string): Promise<boolean>;
  completed?(cwd: string, result: ProjectSetupAskResult, kind: ProjectSetupAskKind | null): void;
}) {
  const pending = new Set<string>();
  const logger = log('project-setup');
  const deliverRepair = (cwd: string, snapshot: ProjectSetupSnapshot): Promise<boolean> => {
    const failure = snapshot.failure;
    if (failure === null) return deps.deliver(cwd, PROJECT_SETUP_REPAIR_PROMPT, JSON.stringify(snapshot));
    const shown = setupRepairStep(failure) === 'install' ? t('projectSetup.ask.install') : t('projectSetup.ask.start');
    return deps.deliver(cwd, shown, repairContext({ ...snapshot, failure }));
  };
  return async (cwd: string): Promise<ProjectSetupAskResult> => {
    cwd = canonicalPath(cwd);
    const finish = (result: ProjectSetupAskResult, kind: ProjectSetupAskKind | null): ProjectSetupAskResult => {
      try { deps.completed?.(cwd, result, kind); }
      catch { logger.error('setup request analytics callback failed'); }
      return result;
    };
    const snapshot = deps.read(cwd);
    const kind = projectSetupAskKind(snapshot);
    // Read before the refusals, so a refused press still records which request it was.
    if (pending.has(cwd) || deps.busy(cwd)) return finish({ ok: false, reason: 'busy' }, kind);
    if (kind === null) return finish({ ok: false, reason: 'not-applicable' }, null);
    pending.add(cwd);
    let result: ProjectSetupAskResult;
    try {
      const sent = kind === 'setup'
        ? await deps.deliver(cwd, startPrompt([], { pendingFrame: flagOn('frame-covers') }), await deps.detect(cwd))
        : await deliverRepair(cwd, snapshot);
      result = sent ? { ok: true } : { ok: false, reason: deps.busy(cwd) ? 'busy' : 'unavailable' };
    } catch {
      result = { ok: false, reason: 'unavailable' };
    } finally { pending.delete(cwd); }
    return finish(result, kind);
  };
}
