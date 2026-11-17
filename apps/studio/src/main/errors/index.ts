import { failureOwner, scrubException, type ScrubbedException } from '@studio/events';
import { FILE_ONLY_KEYS, log, scrubFields, type LogFields } from '../log/index.js';
import { captureException, flush } from '../telemetry/index.js';

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
    captureError(error, { owner: failureOwner(error), subsystem: 'process', mechanism });
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
