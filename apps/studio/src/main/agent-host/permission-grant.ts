import type { PermissionRuleValue, PermissionUpdate } from '@anthropic-ai/claude-agent-sdk';
import { classifyDestructiveGit, externallyVisibleGit } from './destructive-git.js';

type AddRules = Extract<PermissionUpdate, { type: 'addRules' }>;

/**
 * The only two a suggestion may be taken from; every grant is then scoped to the session.
 * `userSettings` would outlive every project, `projectSettings` would land in the user's own
 * commit (ONL-2562).
 */
const GRANT_SCOPES: ReadonlySet<string> = new Set(['session', 'localSettings']);

/** Lowercased, the way `requiresShellApproval` reads a tool name. */
const SHELL_TOOLS: ReadonlySet<string> = new Set(['bash', 'powershell']);

/** What an "always allow" would actually grant. */
export interface AlwaysAllowGrant {
  /** Returned as `updatedPermissions`: allow rules only, so the row writes exactly what it names (ONL-2562). */
  readonly updates: AddRules[];
  /** Every suggested rule, as a settings `allow` list holds it; the grant is withheld when one of them would not be stored (ONL-2933). */
  readonly rules: string[];
  /** Every rule covers one request rather than the tool, so the row may not promise the tool. */
  readonly oneRequest: boolean;
  /** The one thing the grant names, so the row can say it rather than "this" (ONL-2562). */
  readonly covers?: string;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : undefined;
}

function allowRule(update: unknown): AddRules | undefined {
  const found = record(update);
  if (found?.['type'] !== 'addRules' || found['behavior'] !== 'allow') return undefined;
  const destination = found['destination'];
  if (typeof destination !== 'string' || !GRANT_SCOPES.has(destination)) return undefined;
  const rules = found['rules'];
  if (!Array.isArray(rules) || rules.length === 0) return undefined;
  // A rule naming no tool grants nothing, and would leave the row promising what it cannot keep.
  return rules.every((entry) => typeof record(entry)?.['toolName'] === 'string')
    ? (found as AddRules)
    : undefined;
}

function ruleContent(value: unknown): string | undefined {
  const content = record(value)?.['ruleContent'];
  return typeof content === 'string' && content !== '' ? content : undefined;
}

/** The widest rule decides the words, so one tool-wide entry makes the whole set tool-wide. */
function coversOneRequest(rule: AddRules): boolean {
  return rule.rules.every((value) => ruleContent(value) !== undefined);
}

/** A name the CLI could have minted, so a rule pattern cannot ride in wearing one (ONL-2933). */
const TOOL_NAME = /^[A-Za-z0-9_-]+$/u;

/** The verbs Studio asks about every time, in a wrapper its classifiers do not read, such as `sudo` (ONL-2933). */
const ASKED_ABOUT = /\bgit\s+push\b|\bgit\s+branch\s+-[dD]\b|\bgh\s+pr\s+(?:create|merge)\b/u;

/** Replayed into every later spawn, so a shell rule holds only as the one command the card named (ONL-2933). */
function boundedShellCommand(toolName: string, content: string, command: string | undefined): boolean {
  // No classifier here reads PowerShell, and Windows asks about every shell command anyway.
  if (toolName.toLowerCase() !== 'bash') return false;
  if (command === undefined || content.trim() !== command.trim()) return false;
  // What `$(…)`, a backtick or `*` stands for is decided later, by the shell or the CLI's matcher.
  if (/[*$`]/u.test(content) || ASKED_ABOUT.test(content)) return false;
  try {
    return classifyDestructiveGit(content) === undefined && !externallyVisibleGit(content);
  } catch {
    return false;
  }
}

/** `undefined` for a rule Studio will not store, which is a rule the row must not promise (ONL-2933). */
function persistableRule(rule: PermissionRuleValue, command: string | undefined): string | undefined {
  if (!TOOL_NAME.test(rule.toolName)) return undefined;
  const content = ruleContent(rule);
  const shell = SHELL_TOOLS.has(rule.toolName.toLowerCase());
  if (content === undefined) return shell ? undefined : rule.toolName;
  if (shell && !boundedShellCommand(rule.toolName, content, command)) return undefined;
  return `${rule.toolName}(${content})`;
}

/**
 * `undefined` when the CLI suggested no persistent allow rule, suppressed one (ONL-2562), or
 * suggested one Studio will not store; `command` is the shell command the card is asking about (ONL-2933).
 * Only its allow rules are forwarded: `setMode` would move the posture the composer
 * publishes (ONL-2190), and a directory the row never names would grant past it.
 */
export function alwaysAllowGrant(
  suggestions: readonly unknown[] | undefined,
  suppressAlwaysAllowRule?: boolean,
  command?: string,
): AlwaysAllowGrant | undefined {
  if (suppressAlwaysAllowRule === true) return undefined;
  const found = (suggestions ?? []).flatMap((update) => allowRule(update) ?? []);
  if (found.length === 0) return undefined;
  const rules: string[] = [];
  for (const rule of found) {
    for (const value of rule.rules) {
      const stored = persistableRule(value, command);
      // A row promising a rule Studio will not keep would ask again at the next launch (ONL-2933).
      if (stored === undefined) return undefined;
      rules.push(stored);
    }
  }
  const oneRequest = found.every(coversOneRequest);
  const named = found.flatMap((rule) => rule.rules.flatMap((value) => ruleContent(value) ?? []));
  // Named only when the set holds exactly one, so the row never speaks for a rule it is not showing.
  const covers = oneRequest && named.length === 1 ? named[0] : undefined;
  return {
    // Session-scoped whatever the CLI suggested: `localSettings` writes a file this session's
    // `settingSources` never reads back, so Studio is what remembers the rule (ONL-2933).
    updates: found.map((rule) => ({ ...rule, destination: 'session' as const })),
    rules,
    oneRequest,
    ...(covers === undefined ? {} : { covers }),
  };
}
