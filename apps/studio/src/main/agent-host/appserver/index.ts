import type { HarnessId } from '@studio/events';
import { t } from '@studio/i18n';
import { codexInstallRoot } from '../../codex/paths.js';
import { prepareCodexForSession } from '../../codex/index.js';
import { log } from '../../log/index.js';
import { resolvedHarness } from '../../settings/resolve.js';
import { stateRoot } from '../../state/root.js';
import type { AgentBackend } from '../backend.js';
import { checkHealth, resolveCodex } from './resolve.js';
import { AppServerSession } from './session.js';
import type { AppServerSessionOptions } from './session.js';
import { devSwitches } from '../../env/dev-switches.js';


const logger = log('agent-host');

/** Only an explicit `codex` selects codex; an absent or unreadable choice is Claude (ONL-2120). */
export function selectedHarness(): HarnessId {
  return resolvedHarness() === 'codex' ? 'codex' : 'claude';
}

/** No PATH lookup: `which codex` finds the JS shim, which answers wrongly without crashing. */
export function codexRoot(): string | undefined {
  return devSwitches.codexRoot ?? codexInstallRoot();
}

/** Always a session: returning nothing on an unusable codex made the host fall through to Claude. */
export function createAppServerSession(
  options: Omit<AppServerSessionOptions, 'codexRoot' | 'captureRoot'>,
): AgentBackend {
  const root = codexRoot();
  const problem = devSwitches.codexRoot === undefined ? undefined : setupProblem(root);
  logger.info('preparing codex');

  return new AppServerSession({
    ...options,
    codexRoot: root ?? '',
    captureRoot: stateRoot(),
    prepare: prepareCodexForSession,
    ...(problem === undefined ? {} : { setupProblem: problem }),
    // Without this, reasoning items arrive with empty summary and content.
    reasoningSummary: 'detailed',
  });
}

function setupProblem(root: string | undefined): string | undefined {
  if (root === undefined) return t('chat.codex.notLocated');
  const health = checkHealth(resolveCodex(root), root);
  if (health.ok) return undefined;
  logger.warn('codex install unusable', { problems: health.problems.join('; ') });
  return t('chat.codex.unusable');
}
