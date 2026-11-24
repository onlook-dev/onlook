import { failureOwner, scrubException, type ScrubbedException, type ProcessGone } from '@studio/events';
import { FILE_ONLY_KEYS, log, scrubFields, type LogFields } from '../log/index.js';
import { capture, captureException, correlation, flush } from '../telemetry/index.js';

export type ErrorOwner = 'ours' | 'environment' | 'user_app' | 'expected';

export interface CaptureErrorOptions extends LogFields {
  owner: ErrorOwner;
  subsystem: string;
  mechanism?: string;
}

export function fingerprintFor(subsystem: string, exception: ScrubbedException): string {
  const normalized = exception.value
    .toLowerCase()
    .replace(/<path>/g, 'P')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return [subsystem, exception.type, normalized].join('::');
}

const LEVEL: Record<ErrorOwner, 'error' | 'warn' | 'info'> = {
  ours: 'error',
  environment: 'warn',
  user_app: 'warn',
  expected: 'info',
};

export function captureError(error: unknown | ScrubbedException, options: CaptureErrorOptions): void {
  const { owner, subsystem, mechanism, ...fields } = options;
  const scrubbed = isScrubbed(error) ? error : scrubException(error, 'node:javascript');
  log(subsystem)[LEVEL[owner]](scrubbed.value, {
    ...fields,
    owner,
    error_type: scrubbed.type,
    ...(mechanism === undefined ? {} : { mechanism }),
  });
  if (owner !== 'ours') return;
  const safe = scrubFields(fields);
  for (const key of FILE_ONLY_KEYS) delete safe[key];
  captureException(scrubbed, {
    ...safe,
    subsystem,
    ...(mechanism === undefined ? {} : { mechanism }),
    // PostHog reads `$exception_fingerprint` as one string; Sentry's array shape silently loses the grouping.
    $exception_fingerprint: fingerprintFor(subsystem, scrubbed),
  });
}

export function recordProcessExit(details: ProcessGone): void {
  capture('process_gone', details);
  if (details.reason !== 'crashed' && details.reason !== 'oom' && details.reason !== 'integrity-failure') return;
  if (details.process_class === 'frame' || details.process_class === 'dev_server') return;
  const processType = details.process_class === 'tab' || details.process_class === 'band' ? 'renderer' : details.process_class === 'gpu' || details.process_class === 'utility' ? details.process_class : 'other';
  const version = correlation()?.appVersion ?? null;
  capture('crash_detected', { app_version: version, reporter_app_version: version ?? 'unknown', process_type: processType, reason: details.reason, exit_code: details.exit_code });
  captureError({ type: 'NativeProcessCrash', value: `${processType}: ${details.reason} (${details.exit_code})` }, { owner: 'ours', subsystem: 'process', process_type: processType, ...details });
  void flush();
}

function isScrubbed(value: unknown): value is ScrubbedException {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof (value as ScrubbedException).type === 'string' &&
    typeof (value as ScrubbedException).value === 'string' &&
    !(value instanceof Error)
  );
}

export interface HookTarget {
  on(event: 'uncaughtException', listener: (error: Error, origin: string) => void): unknown;
  on(event: 'unhandledRejection', listener: (reason: unknown) => void): unknown;
}

let hooksInstalled = false;

export function installProcessHooks(target: HookTarget = process): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  // A listener on `uncaughtException` itself is what suppresses Electron's crash box; `uncaughtExceptionMonitor` does not (ONL-2348).
  target.on('uncaughtException', (error, origin) => {
    report(error, origin);
  });
  target.on('unhandledRejection', (reason) => {
    report(reason, 'unhandled-rejection');
  });
}

function report(error: unknown, mechanism: string): void {
  try {
    captureError(error, { owner: failureOwner(error), subsystem: 'process', process_type: 'main', mechanism });
  } catch {
    try {
      log('process').error('the error reporter threw while reporting', { mechanism });
    } catch {
      // A throw inside an `uncaughtException` listener kills the process.
    }
  }
  try {
    void flush();
  } catch {
    // Same: a flush that cannot be scheduled is swallowed, not fatal.
  }
}

export function resetErrorsForTesting(): void {
  hooksInstalled = false;
}
