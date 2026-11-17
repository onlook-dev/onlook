export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export type LogProcess = 'tab' | 'chrome' | 'task-manager';

export interface RendererLogLine {
  process: LogProcess;
  level: LogLevel;
  /** The module directory, lowercase kebab. */
  subsystem: string;
  msg: string;
  /** Scalars; keys in `CONTENT_KEYS` are dropped by main. */
  fields?: Record<string, unknown>;
}

/** Dropped from log fields by main's logger and the renderer's alike. */
export const CONTENT_KEYS: ReadonlySet<string> = new Set([
  'text',
  'prompt',
  'content',
  'delta',
  'input',
  'output',
  'result',
  'body',
  'message',
  'transcript',
  'diff',
  'source',
  'html',
]);

/** Written to the log file only: child-process output can name a remote, a branch, a gateway host or an account id. */
export const FILE_ONLY_KEYS: ReadonlySet<string> = new Set(['stderr', 'stdout', 'cli_sentence', 'error_class']);
