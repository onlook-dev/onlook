export const MESSAGE_MAX = 300;
export const CLASS_MAX = 64;
export const FRAMES_MAX = 30;
export const FILENAME_MAX = 300;
export const FUNCTION_MAX = 200;
const STACK_LINE_MAX = 1000;

/** A space stays in the path only when a later separator follows it; stopping at the first space leaked every later segment (ONL-2343). */
const TAIL = String.raw`(?:[^\s"'()\]]|[ ](?=[^\s"'()\]]*[\\/]))*`;

/** Greedy on purpose: a false positive costs a placeholder, a miss costs a username. */
const PATH_SHAPES: readonly RegExp[] = [
  new RegExp(String.raw`(?:file|https?|ssh|git):\/\/${TAIL}`, 'g'),
  new RegExp(String.raw`git@[^\s"'()\]:]+:${TAIL}`, 'g'),
  new RegExp(String.raw`\\\\[^\s"'()\]\\]+\\${TAIL}`, 'g'),
  new RegExp(String.raw`(?<![A-Za-z0-9])[A-Za-z]:[\\/]${TAIL}`, 'g'),
  new RegExp(
    String.raw`\/(?:Users|home|var|tmp|private|opt|srv|mnt|media|run|root|Volumes)\/${TAIL}`,
    'g',
  ),
  new RegExp(String.raw`(?<![A-Za-z0-9~])~[\\/]${TAIL}`, 'g'),
];

/** Never a basename: a filename is the codebase. */
export const REDACTED_PATH = '<path>';
export const REDACTED_REF = '<ref>';

export function scrubPaths(text: string): string {
  let out = text;
  for (const shape of PATH_SHAPES) out = out.replace(shape, REDACTED_PATH);
  return out;
}

const RELATIVE_PATH = new RegExp(
  String.raw`(?<![\w@.:\\/-])(?:\.{1,2}[\\/][^\s"'()\]]+|(?:[\w@.-]+[\\/])+[\w@.-]*\.[A-Za-z][A-Za-z0-9]{0,9}(?![\w\\/-]))`,
  'g',
);

function scrubRelativePaths(text: string): string {
  return text.replace(RELATIVE_PATH, REDACTED_PATH);
}

const BARE_FILENAME = /(?<![^\s"'`()[\]<>:\\/])[^\s"'`()[\]<>:\\/]*\.[\p{L}\p{N}_][^\s"'`()[\]<>:\\/]*/gu;
const FILE_OPERAND = /\b(open|stat|lstat|scandir|unlink|readlink|readfile|writefile|mkdir|rmdir|access|rename|copyfile|realpath|watch|chmod|chown|utime|truncate|symlink|link)[ \t]+([^\r\n]+)/gi;
const INDENTED_OUTPUT = /^(\t[ \t]*| {2,})\S[^\r\n]*/gm;
const GIT_DIAGNOSTIC = /\b(?:fatal|error|warning|hint): [^\n]*|Preparing worktree [^\n]*/g;
const QUOTED_NAME = /(?<!\w)(['"`])((?:(?!\1).)*)\1(?!\w)/g;
const NAME_AFTER_KEYWORD = /\b(remote ref|refspec|reference:|current branch) (?!<)[^\s'"]+/g;
const REF_UPDATE = /(?<!\S)[^\s'"]+ -> [^\s'"]+/g;

function scrubGitRefs(text: string): string {
  return text
    .replace(GIT_DIAGNOSTIC, (line) =>
      line
        .replace(QUOTED_NAME, (span, quote: string, name: string) =>
          name === REDACTED_PATH ? span : `${quote}${REDACTED_REF}${quote}`,
        )
        .replace(NAME_AFTER_KEYWORD, (_match, keyword: string) => `${keyword} ${REDACTED_REF}`),
    )
    .replace(REF_UPDATE, `${REDACTED_REF} -> ${REDACTED_REF}`);
}

export function scrubMessage(text: string): string {
  // Scrubbed before it is cut: half a path is still a username.
  const scrubbed = scrubGitRefs(scrubRelativePaths(scrubPaths(text)))
    .replace(FILE_OPERAND, (span, operation: string, operand: string) =>
      operand === REDACTED_PATH || operand === `${REDACTED_PATH} failed` ? span : `${operation} ${REDACTED_PATH}`,
    )
    .replace(INDENTED_OUTPUT, `$1${REDACTED_PATH}`)
    .replace(QUOTED_NAME, (span, _quote: string, name: string) => name.includes('.') ? REDACTED_PATH : span)
    .replace(BARE_FILENAME, REDACTED_PATH);
  return scrubbed.length <= MESSAGE_MAX ? scrubbed : `${scrubbed.slice(0, MESSAGE_MAX - 1)}…`;
}

const CLASS_NAME = new RegExp(String.raw`^[A-Za-z_$][A-Za-z0-9_$]{0,${CLASS_MAX - 1}}$`);

export function scrubClass(name: string): string {
  return CLASS_NAME.test(name) ? name : 'Error';
}

function scrubFunction(name: string): string {
  return scrubPaths(name).slice(0, FUNCTION_MAX);
}

function position(digits: string | undefined): number | undefined {
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : undefined;
}

/** Which runtime parsed the stack; PostHog's processing rejects a frame without it (ONL-2532). */
export type FramePlatform = 'node:javascript' | 'web:javascript';

export interface ScrubbedFrame {
  platform: FramePlatform;
  filename: string;
  function: string;
  lineno?: number;
  colno?: number;
  in_app: boolean;
}

export function scrubStack(stack: string, platform: FramePlatform): ScrubbedFrame[] {
  const frames: ScrubbedFrame[] = [];
  for (const line of stack.split('\n')) {
    if (line.length > STACK_LINE_MAX) continue;
    const match = /^\s*at\s+(?:(.+?)\s+\()?(.+?)(?::(\d+):(\d+))?\)?$/.exec(line);
    // Dropped: an unparseable line cannot be proven path-free.
    if (match === null) continue;
    const [, fn, location, lineno, colno] = match;
    if (location === undefined || location === '') continue;
    const inApp = isAppFrame(location);
    const lineNumber = position(lineno);
    const columnNumber = position(colno);
    frames.push({
      platform,
      filename: inApp ? appFilename(location) : REDACTED_PATH,
      function: fn === undefined ? '<anonymous>' : scrubFunction(fn),
      ...(lineNumber === undefined ? {} : { lineno: lineNumber }),
      ...(columnNumber === undefined ? {} : { colno: columnNumber }),
      in_app: inApp,
    });
    if (frames.length >= FRAMES_MAX) break;
  }
  return frames;
}

function isAppFrame(location: string): boolean {
  return /(?:[\\/]out[\\/](?:main|preload|renderer)[\\/]|app\.asar[\\/])/.test(location);
}

function appFilename(location: string): string {
  if (location.length > STACK_LINE_MAX) return REDACTED_PATH;
  const match = /(?:[\\/]out[\\/]|app\.asar[\\/])(.+?)(?::\d+:\d+)?$/.exec(location);
  return match?.[1] === undefined ? REDACTED_PATH : appUrl(match[1].replaceAll("\\", "/"));
}

export interface ScrubbedException {
  type: string;
  value: string;
  stacktrace?: { type: 'raw'; frames: ScrubbedFrame[] };
}

/** Total, never throwing: this runs inside main's `uncaughtException` listener, where a throw is fatal (ONL-2348). */
export function scrubException(error: unknown, platform: FramePlatform): ScrubbedException {
  try {
    if (error instanceof Error) {
      const frames = error.stack === undefined ? [] : scrubStack(error.stack, platform);
      return {
        type: scrubClass(error.name),
        value: scrubMessage(error.message),
        ...(frames.length === 0 ? {} : { stacktrace: { type: 'raw' as const, frames } }),
      };
    }
    return { type: 'Error', value: scrubMessage(typeof error === 'string' ? error : String(error)) };
  } catch {
    return { type: 'Error', value: '<unreadable>' };
  }
}

const APP_PREFIX = 'app://studio/';

function appUrl(rest: string): string {
  return `${APP_PREFIX}${rest}`.slice(0, FILENAME_MAX);
}

/** An `app://studio/` prefix is a claim a compromised renderer can make, so that branch is re-scrubbed and bounded too (ONL-2343). */
export function scrubFrame(frame: unknown, platform: FramePlatform): ScrubbedFrame {
  const record = (frame ?? {}) as Record<string, unknown>;
  const filename = typeof record['filename'] === 'string' ? record['filename'] : '';
  const inApp = isAppFrame(filename) || filename.startsWith(APP_PREFIX);
  const lineno = typeof record['lineno'] === 'number' ? record['lineno'] : undefined;
  const colno = typeof record['colno'] === 'number' ? record['colno'] : undefined;
  return {
    platform,
    filename: filename.startsWith(APP_PREFIX)
      ? appUrl(scrubPaths(filename.slice(APP_PREFIX.length, APP_PREFIX.length + FILENAME_MAX)))
      : inApp
        ? appFilename(filename)
        : REDACTED_PATH,
    function: typeof record['function'] === 'string' ? scrubFunction(record['function']) : '<anonymous>',
    ...(lineno === undefined ? {} : { lineno }),
    ...(colno === undefined ? {} : { colno }),
    in_app: inApp,
  };
}
