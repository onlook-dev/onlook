import { describe, expect, it } from 'bun:test';
import type { PermissionUpdate } from '@anthropic-ai/claude-agent-sdk';
import { alwaysAllowGrant } from './permission-grant.js';

/** The set the CLI sent on a `default`-mode Bash ask, measured at SDK 0.3.284. */
const RULE: Extract<PermissionUpdate, { type: 'addRules' }> = {
  type: 'addRules',
  rules: [{ toolName: 'Bash', ruleContent: 'touch probe.txt' }],
  behavior: 'allow',
  destination: 'localSettings',
};
const WHOLE_TOOL: Extract<PermissionUpdate, { type: 'addRules' }> = {
  ...RULE,
  rules: [{ toolName: 'Bash' }],
};
/** A Studio tool's suggestion carries no content, and the tool is the whole of what the card named. */
const WHOLE_MCP_TOOL: Extract<PermissionUpdate, { type: 'addRules' }> = {
  ...RULE,
  rules: [{ toolName: 'mcp__studio__create_frame' }],
};
const DIRECTORIES: PermissionUpdate = {
  type: 'addDirectories',
  directories: ['/w'],
  destination: 'session',
};
const ACCEPT_EDITS: PermissionUpdate = {
  type: 'setMode',
  mode: 'acceptEdits',
  destination: 'session',
};

/** The command the card is asking about; the CLI's suggestion names it verbatim. */
const COMMAND = 'touch probe.txt';

const grant = (
  suggestions: readonly unknown[] | undefined,
  suppress?: boolean,
  command: string | undefined = COMMAND,
): ReturnType<typeof alwaysAllowGrant> => alwaysAllowGrant(suggestions, suppress, command);

describe('what an always-allow would grant (ONL-2562)', () => {
  it('is nothing when the CLI suggested no rule, because the next identical request would ask again', () => {
    expect(grant(undefined)).toBeUndefined();
    expect(grant([])).toBeUndefined();
    expect(grant([ACCEPT_EDITS, DIRECTORIES])).toBeUndefined();
  });

  it('is nothing when the CLI says this ask carries no persistent choice', () => {
    expect(grant([RULE], true)).toBeUndefined();
  });

  it('is nothing for a rule that denies or asks, which would not silence anything', () => {
    expect(grant([{ ...RULE, behavior: 'deny' }])).toBeUndefined();
    expect(grant([{ ...RULE, behavior: 'ask' }])).toBeUndefined();
  });

  it('is nothing for a rule that would outlive the project the user approved in', () => {
    for (const destination of ['userSettings', 'projectSettings', 'cliArg'] as const) {
      expect(grant([{ ...RULE, destination }])).toBeUndefined();
    }
    expect(grant([{ ...RULE, destination: 'session' }])?.updates).toHaveLength(1);
  });

  it('is nothing for a rule that names no tool, which would grant nothing', () => {
    expect(grant([{ ...RULE, rules: [] }])).toBeUndefined();
    expect(grant([{ ...RULE, rules: [{} as never] }])).toBeUndefined();
    expect(
      grant([{ ...RULE, rules: [{ toolName: 'Bash' }, {} as never] }]),
    ).toBeUndefined();
  });

  it('forwards the allow rules and nothing else, so the row writes exactly what it names', () => {
    // A mode change would move the posture the composer publishes; a directory would
    // grant past the command the row names. Neither is something the row says.
    expect(grant([RULE, ACCEPT_EDITS, DIRECTORIES])?.updates).toEqual([
      { ...RULE, destination: 'session' },
    ]);
  });

  it('scopes every rule to the session, because the file it would write is never read back (ONL-2933)', () => {
    for (const destination of ['localSettings', 'session'] as const) {
      expect(grant([{ ...RULE, destination }])?.updates).toEqual([
        { ...RULE, destination: 'session' },
      ]);
    }
  });

  it('names the rules as a settings allow list holds them, for Studio to remember (ONL-2933)', () => {
    expect(grant([RULE])?.rules).toEqual(['Bash(touch probe.txt)']);
  });

  it('remembers a tool-wide grant, which grants no more than the tool the card named (ONL-2933)', () => {
    expect(grant([WHOLE_MCP_TOOL])?.rules).toEqual(['mcp__studio__create_frame']);
  });

  it('is nothing for a shell rule that reaches past the one command it is stored for (ONL-2933)', () => {
    // Replayed into the next spawn, each of these would stand above the gate's own classifiers,
    // whatever the request the card actually asked about.
    for (const content of [
      '*',
      ':*',
      'git:*',
      'bash:*',
      'npm run build:*',
      'git push origin main',
      'git push --force',
      'gh pr create --fill',
      'npm run build && git push',
      'bash -lc "git push origin main"',
      'git branch -D topic',
    ]) {
      expect(
        grant([{ ...RULE, rules: [{ toolName: 'Bash', ruleContent: content }] }], undefined, content),
      ).toBeUndefined();
    }
  });

  it('is nothing for a shell rule that is not the command the card named (ONL-2933)', () => {
    // The row says "this request", so a rule naming anything else is a promise about another one.
    for (const content of ['touch other.txt', 'touch probe.txt --now', 'touch probe', '']) {
      expect(
        grant([{ ...RULE, rules: [{ toolName: 'Bash', ruleContent: content }] }]),
      ).toBeUndefined();
    }
    // Surrounding space is the CLI's, not a second command.
    expect(grant([{ ...RULE, rules: [{ toolName: 'Bash', ruleContent: ' touch probe.txt ' }] }])?.rules)
      .toEqual(['Bash( touch probe.txt )']);
    // A shell rule with no command to compare against, as a non-shell tool's card carries.
    expect(alwaysAllowGrant([RULE], undefined, undefined)).toBeUndefined();
  });

  it('is nothing for a command that publishes inside a wrapper no classifier reads (ONL-2933)', () => {
    // The card offers the row for these — `sudo` is not a transparent wrapper to the gate — but a
    // standing grant for one would silence a push, which Studio asks about every time.
    for (const content of [
      'sudo git push origin main',
      'doas gh pr create --fill',
      'sudo git branch -D topic',
      'env FOO=1 sudo git push',
    ]) {
      expect(
        grant([{ ...RULE, rules: [{ toolName: 'Bash', ruleContent: content }] }], undefined, content),
      ).toBeUndefined();
    }
  });

  it('is nothing for a command whose meaning is decided after it is stored (ONL-2933)', () => {
    // The classifiers read the text; `$(…)` and a backtick are text that runs something else.
    for (const content of [
      'touch $(git push origin main)',
      'touch `git push origin main`',
      'echo ${PUSH}',
      'ls *.ts',
    ]) {
      expect(
        grant([{ ...RULE, rules: [{ toolName: 'Bash', ruleContent: content }] }], undefined, content),
      ).toBeUndefined();
    }
  });

  it('is nothing for a rule whose tool name is a pattern wearing a name (ONL-2933)', () => {
    // `allowRule` only asks that the name is a string, and a content-less rule is stored as the
    // name itself, so the name is the one field left to check.
    for (const toolName of ['Bash(*)', 'Bash(git push:*)', 'Bash ', 'Bash)', '*', 'a b']) {
      expect(grant([{ ...RULE, rules: [{ toolName }] }])).toBeUndefined();
      expect(
        grant([{ ...RULE, rules: [{ toolName, ruleContent: COMMAND }] }]),
      ).toBeUndefined();
    }
  });

  it('is nothing for a shell rule naming no command at all, which would carry every command (ONL-2933)', () => {
    expect(grant([WHOLE_TOOL])).toBeUndefined();
    expect(grant([{ ...RULE, rules: [{ toolName: 'PowerShell' }] }])).toBeUndefined();
    // No classifier here reads PowerShell, so even one named command is unbounded.
    expect(
      grant([{ ...RULE, rules: [{ toolName: 'PowerShell', ruleContent: 'Get-Date' }] }]),
    ).toBeUndefined();
    expect(
      grant([{ ...RULE, rules: [{ toolName: 'Bash', ruleContent: '' }] }]),
    ).toBeUndefined();
    expect(
      grant([{ ...RULE, rules: [{ toolName: '', ruleContent: 'touch probe.txt' }] }]),
    ).toBeUndefined();
  });

  it('is nothing for a mixed set, rather than a row promising the part that is kept (ONL-2933)', () => {
    // The benign request is the dangerous case: the row reads as "this command" while the set
    // carries a rule that outlives it.
    expect(grant([RULE, WHOLE_TOOL])).toBeUndefined();
    expect(
      grant([
        RULE,
        { ...RULE, rules: [{ toolName: 'Bash', ruleContent: 'git:*' }] },
      ]),
    ).toBeUndefined();
    expect(
      grant([
        {
          ...RULE,
          rules: [
            { toolName: 'Bash', ruleContent: 'touch probe.txt' },
            { toolName: 'Bash', ruleContent: 'git push origin main' },
          ],
        },
      ]),
    ).toBeUndefined();
  });

  it('reads one bare tool rule as covering the tool, however many request rules ride with it', () => {
    expect(grant([RULE])?.oneRequest).toBe(true);
    expect(grant([WHOLE_MCP_TOOL])?.oneRequest).toBe(false);
    // The widest rule decides the words: naming one command beside a tool-wide grant is the defect.
    expect(grant([RULE, WHOLE_MCP_TOOL])?.oneRequest).toBe(false);
  });

  it('names the one command it grants', () => {
    expect(grant([RULE])?.covers).toBe('touch probe.txt');
    expect(grant([RULE, ACCEPT_EDITS, DIRECTORIES])?.covers).toBe('touch probe.txt');
  });

  it('names nothing when the set reaches past one command, however it is spread', () => {
    expect(grant([WHOLE_MCP_TOOL])?.covers).toBeUndefined();
    expect(grant([RULE, WHOLE_MCP_TOOL])?.covers).toBeUndefined();
    // Two entries inside one update, and one entry across two updates: both reach wider than a name.
    expect(
      grant([
        { ...RULE, rules: [{ toolName: 'Bash', ruleContent: 'a' }, { toolName: 'Bash', ruleContent: 'b' }] },
      ])?.covers,
    ).toBeUndefined();
    expect(
      grant([RULE, { ...RULE, rules: [{ toolName: 'Bash', ruleContent: 'other' }] }])?.covers,
    ).toBeUndefined();
  });

  it('ignores a malformed suggestion rather than forwarding it as a rule', () => {
    expect(
      grant([null, 'addRules', { type: 'addRules', behavior: 'allow' }]),
    ).toBeUndefined();
  });
});
