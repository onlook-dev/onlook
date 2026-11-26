import { app, clipboard } from 'electron';
import { handle } from './ipc/bridge.js';
import { IPC_INVOKE, type AppInfo, type PtyEchoRequest, type StudioFlags } from '@studio/events';
import { COMMIT_SHA } from './build-info.js';
import { rendererFlags } from './flags/index.js';
import { ptyEcho } from './pty.js';
import { log } from './log/index.js';
import { hostPlatform, isWindows } from './env/platform.js';
import { openWindowsTerminal } from './terminal.js';
import { APP_ENV, startChild } from './env/child.js';
import { devSwitches } from './env/dev-switches.js';

const logger = log('ipc');

function devMs(isPackaged: boolean, raw: string | undefined): number | undefined {
  if (isPackaged || raw === undefined || raw.trim() === '') return undefined;
  const ms = Number(raw);
  return Number.isFinite(ms) && ms >= 0 ? ms : undefined;
}

function devTipMomentGap(isPackaged: boolean, raw: string | undefined): { tipMomentGapMs?: number } {
  const ms = devMs(isPackaged, raw);
  return ms === undefined ? {} : { tipMomentGapMs: ms };
}

function devTipsEveryProject(isPackaged: boolean, raw: string | undefined): { tipsEveryProject?: true } {
  return !isPackaged && raw === '1' ? { tipsEveryProject: true } : {};
}

export function registerIpcHandlers(): void {
  handle(IPC_INVOKE.appInfo, (): AppInfo => {
    return {
      version: app.getVersion(),
      commit: COMMIT_SHA,
      electronVersion: process.versions.electron ?? 'unknown',
      chromeVersion: process.versions.chrome ?? 'unknown',
      nodeVersion: process.versions.node,
      platform: hostPlatform(),
      isPackaged: app.isPackaged,
      ...devTipsEveryProject(app.isPackaged, devSwitches.tipsEveryProject),
      ...devTipMomentGap(app.isPackaged, devSwitches.tipMomentGapMs),
    };
  });

  let stars: Promise<number | null> | undefined;
  handle(IPC_INVOKE.githubStars, () => {
    stars ??= fetch('https://api.github.com/repos/onlook-dev/onlook', { signal: AbortSignal.timeout(5_000) })
      .then(async (response) => {
        const repo: unknown = response.ok ? await response.json() : undefined;
        const count = (repo as { stargazers_count?: unknown } | undefined)?.stargazers_count;
        return typeof count === 'number' ? count : null;
      })
      .catch(() => null)
      .then((count) => {
        if (count === null) stars = undefined;
        return count;
      });
    return stars;
  });

  handle(IPC_INVOKE.appFlags, (): StudioFlags => rendererFlags());

  handle(IPC_INVOKE.ptyEcho, (_event, req: PtyEchoRequest) => ptyEcho(req));

  // Detached so the Terminal child outlives the invoke (ONL-2186).
  handle(IPC_INVOKE.openTerminal, () => {
    if (isWindows()) return openWindowsTerminal();
    const child = startChild('open', ['-a', 'Terminal'], { env: APP_ENV, detached: true, stdio: 'ignore' });
    child.on('error', (error) => logger.warn('could not open Terminal', { error }));
    child.unref();
  });

  // In main because the renderer's async clipboard needs a focused document, which a never-shown harness window lacks.
  handle(IPC_INVOKE.readClipboardText, () => ({ text: clipboard.readText() }));
  handle(IPC_INVOKE.pasteClipboard, (event) => event.sender.paste());
}
