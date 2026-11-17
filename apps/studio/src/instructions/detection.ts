import type { HarnessId } from '@studio/events';

export type SetupQuestionKind = 'app' | 'plan' | 'port';

export interface BriefedApp {
  name: string;
  path: string;
  framework?: string;
  electron?: true;
  port?: number;
  frameworkPort?: number;
}

export interface DetectionBriefing {
  apps: readonly BriefedApp[];
  /** The user's own dev server on that app's port. */
  busy: readonly { port: number; path: string }[];
  /** A port something else holds. */
  conflicts: readonly { port: number }[];
  /** One of `apps[].path`. */
  remembered?: string;
  harness: HarnessId;
  monorepo?: boolean;
}

export type UnusualStart = 'monorepo' | 'electron' | 'no-dev-script';

export function unusualStarts(briefing: DetectionBriefing): UnusualStart[] {
  const found: UnusualStart[] = [];
  if (briefing.monorepo === true) found.push('monorepo');
  if (briefing.apps.some((app) => app.electron === true)) found.push('electron');
  if (briefing.apps.length === 0) found.push('no-dev-script');
  return found;
}

/** Empty on codex, which starts a default instead (ONL-2494). */
export function detectionAsks(briefing: DetectionBriefing): SetupQuestionKind[] {
  if (briefing.harness !== 'claude') return [];
  const asks: SetupQuestionKind[] = [];
  if (briefing.apps.length > 1 && briefing.remembered === undefined) asks.push('app');
  else if (briefing.remembered === undefined && unusualStarts(briefing).length > 0) asks.push('plan');
  if (briefing.busy.length > 0) asks.push('port');
  return asks;
}

export type DefaultStart =
  | { kind: 'copy'; port: number; path: string }
  | { kind: 'start'; path: string }
  | { kind: 'work-out' };

export function defaultStart(briefing: DetectionBriefing): DefaultStart {
  const chosen = briefing.remembered ?? briefing.apps[0]?.path;
  const busy = briefing.busy.find((entry) => entry.path === chosen);
  if (busy !== undefined) return { kind: 'copy', port: busy.port, path: busy.path };
  return chosen === undefined ? { kind: 'work-out' } : { kind: 'start', path: chosen };
}

function portFact(app: BriefedApp): string {
  if (app.port !== undefined) return `port ${String(app.port)}, set by the project`;
  if (app.frameworkPort !== undefined) return `no port set; the framework's default is ${String(app.frameworkPort)}`;
  return 'no port set';
}

export function detectionContext(
  briefing: DetectionBriefing,
  asks: readonly SetupQuestionKind[] = detectionAsks(briefing),
): string | undefined {
  const { apps, busy, conflicts } = briefing;
  const unusual = unusualStarts(briefing);
  if (apps.length === 0 && busy.length === 0 && conflicts.length === 0 && unusual.length === 0) return undefined;

  const lines: string[] = [];
  if (apps.length > 0) {
    lines.push(
      'Onlook looked at this repository before this turn. Packages with a `dev` script (name, path, ' +
        'framework, port):',
    );
    for (const app of apps) {
      const framework = app.framework === undefined ? '' : ` (${app.framework})`;
      const electron = app.electron === true && unusual.includes('electron') ? ', an Electron app, whose window runs outside a browser' : '';
      lines.push(`- ${app.name} at ${app.path}${framework}${electron}, ${portFact(app)}`);
    }
    if (unusual.includes('monorepo')) {
      lines.push('This repository is a monorepo: it declares workspace packages.');
    }
  } else {
    lines.push('Onlook found no package with a `dev` script here; work out how to run it from the code.');
  }
  if (briefing.remembered !== undefined) {
    lines.push(`The user chose ${briefing.remembered} last time. Start that one without asking.`);
  }
  for (const entry of busy) {
    lines.push(
      `Port ${String(entry.port)} already answers, from the user's own checkout of ${entry.path} — ` +
        'their dev server, not a stranger, and not this worktree: a frame on it never shows your ' +
        'edits. The default is to leave it running and start a separate copy of ' +
        `${entry.path} here on another free port. The alternative is to use theirs: report that ` +
        'port with `server_running` and start nothing on it. If a second copy cannot run here — ' +
        'a fixed port or a shared service — say so and leave theirs running. Either way, tell ' +
        `the user what you found on port ${String(entry.port)} and what you did about it.`,
    );
  }
  for (const conflict of conflicts) {
    lines.push(`Port ${String(conflict.port)} is taken by something else; start on another port.`);
  }

  if (briefing.harness === 'claude') {
    if (asks.length > 0) {
      const parts: string[] = [];
      if (asks.includes('plan')) {
        parts.push(
          'how you will run it — your pick first, saying what it runs (the package, ' +
            'the command and the port) and what the frame will show; then any other real way to run it you ' +
            'found, such as another package or a smaller target the project already has',
        );
      }
      if (asks.includes('app')) {
        parts.push(
          'which app to run — one option per package above, labelled with its name, with the path, ' +
            'framework and port as listed above in the description',
        );
      }
      for (const entry of busy) {
        parts.push(
          `whether to start a separate copy here or use the server already on port ${String(entry.port)} ` +
            '— two options, "Start a separate copy" first as the default',
        );
      }
      lines.push(
        `Before starting anything, ask with \`AskUserQuestion\`: ${parts.join('; and ')}. ` +
          'Start nothing until the answer arrives.',
      );
      if (asks.includes('plan')) {
        lines.push(
          'How to run this project is not obvious, and a wrong start costs the user minutes before they can ' +
            'redirect it, so the proposal comes first even when you are confident. If get_project_setup ' +
            'already holds a saved setup, run that without asking.',
        );
      }
    }
    return lines.join('\n');
  }

  const start = defaultStart(briefing);
  const action =
    start.kind === 'copy'
      ? `leave the user's server on port ${String(start.port)} running and start a separate copy of ${start.path} here on another free port`
      : start.kind === 'work-out'
        ? 'work out what to start from the code'
        : `start ${start.path}`;
  lines.push(`Do this without asking: ${action}. Say which you chose and why, in one line.`);
  return lines.join('\n');
}
