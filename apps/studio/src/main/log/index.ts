// Imports no telemetry: telemetry logs through here (ONL-2347).

import { join } from 'node:path';
import {
  CONTENT_KEYS,
  FILE_ONLY_KEYS,
  scrubException,
  scrubPaths,
  type LogLevel,
  type LogProcess,
} from '@studio/events';

export { FILE_ONLY_KEYS };
import { stateRoot } from '../state/root.js';
import { createLogExporter, type ExportRecord, type LogExportTarget } from './export.js';
import { createLogFile, type LogFile } from './file.js';

export type { LogLevel } from '@studio/events';

export interface LogCorrelation {
  installId: string;
  launchId: string;
  sessionId: string;
  distinctId: string;
  appVersion: string;
  releaseChannel: string;
}

export interface LogFields {
  [key: string]: unknown;
}

export interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
}

export interface LogLine {
  ts: string;
  level: LogLevel;
  subsystem: string;
  msg: string;
  process: 'main' | LogProcess;
  install_id?: string;
  launch_id?: string;
  session_id?: string;
  app_version?: string;
  release_channel?: string;
  [field: string]: unknown;
}


const STRING_MAX = 500;
const MSG_MAX = 300;
// A width bound: a renderer can hand main thousands of keys, and one wide line
// past the rotation threshold costs a generation of history (ONL-2343).
const FIELDS_MAX_KEYS = 32;
const EXPORT_INTERVAL_MS = 10_000;
const SUBSYSTEM_SHAPE = /^[a-z0-9-]{1,32}$/;

let correlation: LogCorrelation | undefined;
let file: LogFile | undefined;
let mirrorToStderr = false;
let stderr: NodeJS.WriteStream = process.stderr;
let stderrFailed = false;
let lines: LogLine[] = [];
let recording = false;
// `logFile().append`, not `writeLine`: a line through `writeLine` joins the next batch and every batch after carries it.
const exporter = createLogExporter({
  intervalMs: EXPORT_INTERVAL_MS,
  onDropped(status, count) {
    const line: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level: 'warn',
      subsystem: 'log',
      msg: 'the log mirror refused a batch',
      process: 'main',
      status,
      dropped: count,
    };
    logFile().append(`${JSON.stringify(line)}\n`);
  },
});

function logFile(): LogFile {
  file ??= createLogFile(join(stateRoot(), 'logs'));
  return file;
}

// Attached on every build, mirroring or not: unheard, a closed pipe's `error` event becomes an uncaughtException the hooks file as ours (ONL-2944).
function onStderrError(error: unknown): void {
  mirrorToStderr = false;
  if (stderrFailed) return;
  stderrFailed = true;
  try {
    const code = error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
    log('log').warn('a write to stderr failed', {
      owner: 'environment',
      error,
      ...(typeof code === 'string' ? { code } : {}),
    });
  } catch {
    // Swallowed: a throw here is the uncaughtException this listener exists to prevent.
  }
}

export function initLog(options: { mirror: boolean }, target: NodeJS.WriteStream = process.stderr): void {
  stderr.off('error', onStderrError);
  stderr = target;
  stderrFailed = false;
  mirrorToStderr = options.mirror;
  stderr.on('error', onStderrError);
}

export function setLogCorrelation(next: LogCorrelation): void {
  correlation = next;
}

export function configureLogExport(target: LogExportTarget | undefined): void {
  exporter.configure(target);
}

function scrubString(value: string, max = STRING_MAX): string {
  const scrubbed = scrubPaths(value);
  return scrubbed.length <= max ? scrubbed : `${scrubbed.slice(0, max)}…`;
}

function scrubValue(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    const scrubbed = scrubException(value, 'node:javascript');
    return {
      type: scrubbed.type,
      message: scrubbed.value,
      ...(scrubbed.stacktrace === undefined ? {} : { frames: scrubbed.stacktrace.frames.slice(0, 10) }),
    };
  }
  if (typeof value === 'string') return scrubString(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return depth > 1 ? `[array ${String(value.length)}]` : value.slice(0, 20).map((item) => scrubValue(item, depth + 1));
  if (typeof value === 'object') {
    if (depth > 1) return '[object]';
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (CONTENT_KEYS.has(key) || FILE_ONLY_KEYS.has(key)) continue;
      const scrubbed = scrubValue(inner, depth + 1);
      if (scrubbed !== undefined) out[key] = scrubbed;
    }
    return out;
  }
  return String(value);
}

const RESERVED = new Set(['ts', 'level', 'subsystem', 'msg', 'process', 'install_id', 'launch_id', 'session_id', 'app_version', 'release_channel']);

// Reserved keys are dropped, never honoured: `writeLine` spreads fields after
// the stamped ids, so a caller's `session_id` would replace the stamp.
export function scrubFields(fields: LogFields | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (fields === undefined) return out;
  let kept = 0;
  let dropped = 0;
  for (const [key, value] of Object.entries(fields)) {
    if (CONTENT_KEYS.has(key) || RESERVED.has(key)) continue;
    if (kept >= FIELDS_MAX_KEYS) {
      dropped += 1;
      continue;
    }
    const scrubbed = scrubValue(value);
    if (scrubbed !== undefined) {
      out[key] = scrubbed;
      kept += 1;
    }
  }
  if (dropped > 0) out['fields_dropped'] = dropped;
  return out;
}

function humanLine(line: LogLine): string {
  const extras = Object.entries(line)
    .filter(([key]) => !RESERVED.has(key))
    .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' ');
  return `[${line.subsystem}] ${line.msg}${extras ? ` ${extras}` : ''}\n`;
}

function exportRecord(line: LogLine): ExportRecord {
  const attributes: Record<string, string | number | boolean> = {
    subsystem: line.subsystem,
    process: line.process,
  };
  if (correlation !== undefined) {
    attributes['posthogDistinctId'] = correlation.distinctId;
    attributes['sessionId'] = line.session_id ?? correlation.sessionId;
    attributes['installId'] = correlation.installId;
    attributes['launchId'] = correlation.launchId;
    attributes['appVersion'] = correlation.appVersion;
    attributes['releaseChannel'] = correlation.releaseChannel;
  }
  for (const [key, value] of Object.entries(line)) {
    if (RESERVED.has(key) || FILE_ONLY_KEYS.has(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') attributes[key] = value;
    else attributes[key] = JSON.stringify(value);
  }
  return { ts: Date.parse(line.ts), level: line.level, msg: line.msg, attributes };
}

export function writeLine(process: LogLine['process'], level: LogLevel, subsystem: string, msg: string, fields?: LogFields): void {
  try {
    const line: LogLine = {
      ts: new Date().toISOString(),
      level,
      subsystem: SUBSYSTEM_SHAPE.test(subsystem) ? subsystem : 'unknown',
      msg: scrubString(msg, MSG_MAX),
      process,
      ...(correlation === undefined
        ? {}
        : {
            install_id: correlation.installId,
            launch_id: correlation.launchId,
            session_id: correlation.sessionId,
            app_version: correlation.appVersion,
            release_channel: correlation.releaseChannel,
          }),
      ...scrubFields(fields),
    };
    if (recording) lines.push(line);
    logFile().append(`${JSON.stringify(line)}\n`);
    exporter.push(exportRecord(line));
    if (mirrorToStderr) process_stderr(humanLine(line));
  } catch {
    // Swallowed: a sink failure is never the caller's.
  }
}

function process_stderr(text: string): void {
  try {
    stderr.write(text);
  } catch {
    // Swallowed: a closed stderr.
  }
}

export function log(subsystem: string): Logger {
  return {
    debug: (msg, fields) => writeLine('main', 'debug', subsystem, msg, fields),
    info: (msg, fields) => writeLine('main', 'info', subsystem, msg, fields),
    warn: (msg, fields) => writeLine('main', 'warn', subsystem, msg, fields),
    error: (msg, fields) => writeLine('main', 'error', subsystem, msg, fields),
  };
}

/** The one sanctioned stdout write — a probe's answer, not a log line. */
export function probeOutput(text: string): void {
  try {
    process.stdout.write(`${text}\n`);
  } catch {
    // Swallowed: a closed stdout.
  }
}

export function flushLog(): Promise<void> {
  return exporter.flush();
}

export function recordLinesForTesting(): void {
  recording = true;
  lines = [];
}

export function peekLinesForTesting(): readonly LogLine[] {
  return [...lines];
}

export function resetLogForTesting(): void {
  correlation = undefined;
  file = undefined;
  stderr.off('error', onStderrError);
  stderr = process.stderr;
  stderrFailed = false;
  mirrorToStderr = false;
  lines = [];
  recording = false;
  exporter.dispose();
}
