import { CONTENT_KEYS, scrubPaths, type LogLevel, type RendererLogLine } from '@studio/events';
import { rendererDoor } from './bridge.js';

export interface RendererLogger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

/**
 * ⚠️ The depth cap is what ends a cycle: unbounded, a self-referential `fields`
 * value throws a RangeError out of `write`, making the logger the thing that
 * crashes the code reporting an error.
 */
function scrubValue(value: unknown, depth = 0): unknown {
  if (value instanceof Error) return { type: value.name, message: scrubPaths(value.message) };
  if (typeof value === 'string') return scrubPaths(value);
  if (Array.isArray(value)) return depth > 1 ? `[array ${String(value.length)}]` : value.slice(0, 20).map((item) => scrubValue(item, depth + 1));
  if (value !== null && typeof value === 'object') {
    if (depth > 1) return '[object]';
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      // The SAME list main applies, from the same module: two hand-kept lists
      // drift apart, and a miss here is a prompt in a devtools console.
      if (CONTENT_KEYS.has(key)) continue;
      out[key] = scrubValue(inner, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * The top level gets the deny-list too — `scrubValue` only sees nested keys.
 * Values enter at depth 1, so the cap bites in the same place.
 */
function denyListed(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (CONTENT_KEYS.has(key)) continue;
    out[key] = scrubValue(value, 1);
  }
  return out;
}

let mirror = import.meta.env?.DEV === true;

export function setLogMirror(enabled: boolean): void {
  mirror = enabled;
}

function write(level: LogLevel, subsystem: string, msg: string, fields?: Record<string, unknown>): void {
  try {
    const scrubbedFields = fields === undefined ? undefined : denyListed(fields);
    const line: RendererLogLine = {
      process: 'tab',
      level,
      subsystem,
      msg: scrubPaths(msg),
      ...(scrubbedFields === undefined ? {} : { fields: scrubbedFields }),
    };
    const target = rendererDoor();
    if (target !== undefined) target.log({ ...line, process: target.process });
    if (mirror) {
      const method = level === 'debug' ? 'debug' : level;
      console[method](`[${subsystem}] ${line.msg}`, ...(scrubbedFields === undefined ? [] : [scrubbedFields]));
    }
  } catch {
    // A torn bridge, or a value that defeats the scrub, is not the caller's
    // problem — a log line must never be why the code reporting an error fails.
  }
}

export function log(subsystem: string): RendererLogger {
  return {
    debug: (msg, fields) => write('debug', subsystem, msg, fields),
    info: (msg, fields) => write('info', subsystem, msg, fields),
    warn: (msg, fields) => write('warn', subsystem, msg, fields),
    error: (msg, fields) => write('error', subsystem, msg, fields),
  };
}
