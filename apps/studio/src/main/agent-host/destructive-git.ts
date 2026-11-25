import type { DestructiveClass } from '@studio/events';

const REASONS: Record<DestructiveClass, string> = {
  force_push: 'Force-pushing rewrites published history, so it needs the user to approve it first.',
  branch_delete: 'Deleting a branch can discard unmerged work, so it needs the user to approve it first.',
  hard_reset: 'A hard reset throws away committed and uncommitted work, so it needs the user to approve it first.',
};

/** Model-facing, never rendered, so not a `strings.ts` key. */
export function destructiveReason(found: DestructiveClass): string {
  return REASONS[found];
}

/** Wrappers that run their remaining argv unchanged; the built-in list the CLI strips. */
const TRANSPARENT = new Set([
  'timeout',
  'time',
  'nice',
  'nohup',
  'stdbuf',
  'command',
  'builtin',
  'env',
  'noglob',
]);

/** `timeout 30s` and `nice -n 10` take an operand of their own before the command they wrap (ONL-2190). */
const WRAPPER_OPERAND = /^\d+(?:\.\d+)?[smhd]?$/;

/** Runners that execute their arguments, which a prefix rule matches past. */
const RUNNERS = new Set(['mise', 'npx', 'direnv', 'devbox', 'docker', 'pnpm', 'bunx', 'xargs']);

/** Keywords and grouping that stand before the real program in a loop, a conditional or a subshell. */
const LEADERS = new Set(['if', 'while', 'until', 'do', 'then', 'else', 'elif']);

/** Subverbs those runners take before the command they run. */
const RUNNER_VERBS = new Set(['exec', 'run', 'x']);

const SHELLS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh']);

/** `git`'s own options that consume the token after them, so the subcommand is not mistaken for a value. */
const GIT_VALUE_OPTIONS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--exec-path', '--namespace']);

/** Wrapper and runner options that require a value, so the token after them is not the command. */
const VALUE_OPTIONS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['env', new Set(['-u', '-C', '-P', '--unset', '--chdir'])],
  ['nice', new Set(['-n', '--adjustment'])],
  ['stdbuf', new Set(['-i', '-o', '-e', '--input', '--output', '--error'])],
  ['timeout', new Set(['-s', '-k', '--signal', '--kill-after'])],
  [
    'xargs',
    new Set([
      '-a',
      '-d',
      '-E',
      '-I',
      '-J',
      '-L',
      '-n',
      '-P',
      '-R',
      '-S',
      '-s',
      '--arg-file',
      '--delimiter',
      '--max-args',
      '--max-chars',
      '--max-procs',
      '--process-slot-var',
    ]),
  ],
]);

/** Whether an option leaves its value to the next token, as getopt reads `-rn 1` but not `-n1`. */
function takesValue(options: ReadonlySet<string> | undefined, token: string): boolean {
  if (options === undefined || !token.startsWith('-')) return false;
  if (token.startsWith('--')) return options.has(token);
  const letters = [...token.slice(1)];
  const at = letters.findIndex((letter) => options.has(`-${letter}`));
  return at !== -1 && at === letters.length - 1;
}

function basename(program: string): string {
  const slash = program.lastIndexOf('/');
  return slash === -1 ? program : program.slice(slash + 1);
}

/** Splits on the shell's command separators and respects quotes, so a quoted separator stays one token. */
function segments(command: string): string[] {
  const out: string[] = [];
  let current = '';
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i] as string;
    if (quote !== null) {
      if (ch === quote) quote = null;
      current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      current += ch;
      continue;
    }
    // A continued line is one command, so the newline it escapes must not split it.
    if (ch === '\\' && command[i + 1] === '\n') {
      current += ' ';
      i++;
      continue;
    }
    if (ch === ';' || ch === '\n') {
      out.push(current);
      current = '';
      continue;
    }
    if ((ch === '&' || ch === '|') && command[i + 1] === ch) {
      out.push(current);
      current = '';
      i++;
      continue;
    }
    if (ch === '|' || ch === '&') {
      out.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

/** Quotes are stripped here, so a quoted subcommand reads the same as a bare one. */
function tokenize(segment: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  let quote: "'" | '"' | null = null;

  const flush = (): void => {
    if (current !== '' || quoted) out.push(current);
    current = '';
    quoted = false;
  };

  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i] as string;
    if (quote !== null) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      quoted = true;
      continue;
    }
    if (ch === ' ' || ch === '\t') {
      flush();
      continue;
    }
    current += ch;
  }
  flush();
  return out;
}

function isEnvAssignment(token: string): boolean {
  const eq = token.indexOf('=');
  return eq > 0 && !token.startsWith('-') && /^[A-Za-z_][A-Za-z0-9_]*$/.test(token.slice(0, eq));
}

/** `-fu` is one token carrying two short options, so an exact match on `-f` misses it (ONL-2190). */
function shortFlag(token: string, letter: string): boolean {
  return (
    token.length > 1 && token[0] === '-' && token[1] !== '-' && token.slice(1).includes(letter)
  );
}

function classifyPush(args: string[]): DestructiveClass | undefined {
  const deletes = args.some(
    (a) => a === '--delete' || shortFlag(a, 'd') || (a.startsWith(':') && a.length > 1),
  );
  if (deletes) return 'branch_delete';
  const forces = args.some(
    (a) =>
      a === '--force' ||
      a === '--force-with-lease' ||
      a.startsWith('--force-with-lease=') ||
      shortFlag(a, 'f') ||
      (a.startsWith('+') && a.length > 1),
  );
  return forces ? 'force_push' : undefined;
}

/** One program the command would actually run, with its own argv; wrappers, runners and shells unwrapped. */
interface Invocation {
  program: string;
  args: string[];
}

function* invocationsOf(tokens: string[], depth: number): Generator<Invocation> {
  if (depth > 4) return;

  let rest = tokens.filter((t) => t !== '');
  for (;;) {
    const head = rest[0];
    if (head === undefined) return;
    if (isEnvAssignment(head) || LEADERS.has(head)) {
      rest = rest.slice(1);
      continue;
    }
    // `(git push -f)` and `{ git push -f; }` put the grouping on the program token itself.
    const bare = head.replace(/^[({!]+/u, '');
    if (bare === head) break;
    rest = bare === '' ? rest.slice(1) : [bare, ...rest.slice(1)];
  }

  const program = basename(rest[0] as string);

  if (TRANSPARENT.has(program)) {
    let i = 1;
    while (i < rest.length) {
      const token = rest[i] as string;
      if (takesValue(VALUE_OPTIONS.get(program), token)) {
        i += 2;
        continue;
      }
      if (token.startsWith('-') || WRAPPER_OPERAND.test(token)) {
        i++;
        continue;
      }
      break;
    }
    if (i < rest.length) yield* invocationsOf(rest.slice(i), depth + 1);
    return;
  }

  if (SHELLS.has(program)) {
    for (let i = 1; i < rest.length; i++) {
      const token = rest[i] as string;
      if (shortFlag(token, 'c')) {
        const script = rest[i + 1];
        if (script !== undefined) yield* invocations(script, depth + 1);
        return;
      }
    }
    return;
  }

  if (RUNNERS.has(program)) {
    let i = 1;
    while (i < rest.length) {
      const token = rest[i] as string;
      if (takesValue(VALUE_OPTIONS.get(program), token)) {
        i += 2;
        continue;
      }
      if (token === '--' || token.startsWith('-') || RUNNER_VERBS.has(token)) {
        i++;
        continue;
      }
      break;
    }
    if (i < rest.length) yield* invocationsOf(rest.slice(i), depth + 1);
    return;
  }

  yield { program, args: rest.slice(1) };
}

function* invocations(command: string, depth: number): Generator<Invocation> {
  // A group closes on the last token, which is the one a subcommand is read from; a closing
  // quote sits past the paren, so this never reaches quoted text (ONL-2933).
  for (const segment of segments(command)) {
    yield* invocationsOf(tokenize(segment.replace(/[)}\s]+$/u, '')), depth);
  }
}

/** The subcommand past the program's own options, with the arguments that follow it. */
function subcommandOf(
  args: string[],
  valueOptions: ReadonlySet<string>,
): { subcommand: string; args: string[] } | undefined {
  let i = 0;
  while (i < args.length) {
    const token = args[i] as string;
    if (valueOptions.has(token)) {
      i += 2;
      continue;
    }
    if (token.startsWith('-')) {
      i++;
      continue;
    }
    break;
  }
  const subcommand = args[i];
  return subcommand === undefined ? undefined : { subcommand, args: args.slice(i + 1) };
}

function classifyInvocation({ program, args }: Invocation): DestructiveClass | undefined {
  if (program !== 'git') return undefined;
  const found = subcommandOf(args, GIT_VALUE_OPTIONS);
  if (found === undefined) return undefined;

  if (found.subcommand === 'push') return classifyPush(found.args);
  if (found.subcommand === 'branch') {
    return found.args.some((a) => a === '--delete' || shortFlag(a, 'd') || shortFlag(a, 'D'))
      ? 'branch_delete'
      : undefined;
  }
  if (found.subcommand === 'reset') {
    return found.args.includes('--hard') ? 'hard_reset' : undefined;
  }
  return undefined;
}

/** `gh`'s own options that consume the token after them; `--repo` is the one routine work carries. */
const GH_VALUE_OPTIONS = new Set(['-R', '--repo']);

const GH_EXTERNAL_VERBS = new Set(['create', 'merge']);

function leavesTheMachine({ program, args }: Invocation): boolean {
  if (program === 'git') return subcommandOf(args, GIT_VALUE_OPTIONS)?.subcommand === 'push';
  if (program !== 'gh') return false;
  const found = subcommandOf(args, GH_VALUE_OPTIONS);
  if (found?.subcommand !== 'pr') return false;
  const verb = subcommandOf(found.args, GH_VALUE_OPTIONS)?.subcommand;
  return verb !== undefined && GH_EXTERNAL_VERBS.has(verb);
}

/**
 * Matches the command text, never the program: a rename or an alias routes around it (ONL-2190).
 */
export function classifyDestructiveGit(command: string): DestructiveClass | undefined {
  for (const invocation of invocations(command, 0)) {
    const found = classifyInvocation(invocation);
    if (found !== undefined) return found;
  }
  return undefined;
}

/** Whether any part of the command publishes work; wider than `EXTERNALLY_VISIBLE_GIT_RULES` on purpose (ONL-2933). */
export function externallyVisibleGit(command: string): boolean {
  for (const invocation of invocations(command, 0)) {
    if (leavesTheMachine(invocation)) return true;
  }
  return false;
}
