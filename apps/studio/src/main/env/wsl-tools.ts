import { t } from '@studio/i18n';
import { runCli } from './cli.js';
import { wslProject } from './wsl.js';

export async function checkWslTools(cwd: string, tools: readonly string[], run = runCli): Promise<void> {
  const project = wslProject(cwd);
  if (project === undefined) return;
  const checked = await Promise.all(tools.map(async (tool) => ({ tool, result: await run(tool, cwd, ['--version'], { timeoutMs: 8_000, maxBuffer: 16_384 }) })));
  const failed = checked.filter(({ result }) => !result.ok).map(({ tool }) => tool);
  if (failed.length > 0) throw new Error(t('machine.wsl.toolsUnavailable', { tools: failed.join(', '), distro: project.distro }));
}
