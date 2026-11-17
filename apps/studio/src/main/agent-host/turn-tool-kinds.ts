import { STUDIO_MCP_SERVER, STUDIO_TOOL_NAMES, STUDIO_TOOLS } from './tool-names.js';

const TURN_TOOL_KINDS = [
  'read',
  'search',
  'file_edit',
  'file_delete',
  'shell',
  'canvas_edit',
  'canvas_navigate',
  'frame_check',
  'fetch',
  'plan',
  'question',
  'subagent',
  'other',
] as const;

export type TurnToolKind = (typeof TURN_TOOL_KINDS)[number];

export type TurnToolKindCounts = Record<TurnToolKind, number>;

export function emptyToolKindCounts(): TurnToolKindCounts {
  return Object.fromEntries(TURN_TOOL_KINDS.map((kind) => [kind, 0])) as TurnToolKindCounts;
}

export const UNFINISHED_OUTCOMES = ['failed', 'denied', 'canceled'] as const;

export type UnfinishedOutcome = (typeof UNFINISHED_OUTCOMES)[number];

export const OUTCOME_TOOL_KINDS = [...TURN_TOOL_KINDS, 'external_mcp'] as const;

export type OutcomeToolKind = (typeof OUTCOME_TOOL_KINDS)[number];

export type UnfinishedByKind = Record<UnfinishedOutcome, Record<OutcomeToolKind, number>>;

export function emptyUnfinishedByKind(): UnfinishedByKind {
  const counts = (): Record<OutcomeToolKind, number> => Object.fromEntries(OUTCOME_TOOL_KINDS.map((kind) => [kind, 0])) as Record<OutcomeToolKind, number>;
  return { failed: counts(), denied: counts(), canceled: counts() };
}

export const STUDIO_TOOL_KINDS: Readonly<Record<string, TurnToolKind>> = Object.fromEntries(
  STUDIO_TOOL_NAMES.map((name) => [name, STUDIO_TOOLS[name].turnKind]),
);

export const BUILT_IN_KINDS: Readonly<Record<string, TurnToolKind>> = {
  Read: 'read',
  Glob: 'search',
  Grep: 'search',
  Write: 'file_edit',
  Edit: 'file_edit',
  NotebookEdit: 'file_edit',
  Delete: 'file_delete',
  Bash: 'shell',
  Monitor: 'shell',
  TaskStop: 'shell',
  WebFetch: 'fetch',
  WebSearch: 'fetch',

  TaskCreate: 'plan',
  TaskGet: 'plan',
  TaskList: 'plan',
  TaskUpdate: 'plan',
  EnterPlanMode: 'plan',
  ExitPlanMode: 'plan',
  AskUserQuestion: 'question',
  Task: 'subagent',
  Agent: 'subagent',
  SendMessage: 'subagent',
  ListAgents: 'subagent',
  Workflow: 'subagent',
  Skill: 'other',
  ToolSearch: 'other',
  CronCreate: 'other',
  CronDelete: 'other',
  CronList: 'other',
  ScheduleWakeup: 'other',
  RemoteTrigger: 'other',
  PushNotification: 'other',
  EnterWorktree: 'other',
  ExitWorktree: 'other',
  Artifact: 'other',
  ArtifactComments: 'other',
  ArtifactData: 'other',
  DesignSync: 'other',
  ReportFindings: 'other',
  SendToProject: 'other',
  SendToProjectContext: 'other',
};

export const CODEX_ROW_ITEMS: ReadonlySet<string> = new Set(['commandExecution', 'fileChange', 'dynamicToolCall']);

export const CODEX_EXTERNAL_MCP_ITEM = 'mcpToolCall';

export const CODEX_UNROWED_ITEM_KINDS: Readonly<Record<string, TurnToolKind>> = {
  webSearch: 'fetch',
  imageView: 'read',
  imageGeneration: 'other',
  collabAgentToolCall: 'subagent',
  sleep: 'other',
};

export const CODEX_NON_TOOL_ITEMS: ReadonlySet<string> = new Set([
  'agentMessage',
  'reasoning',
  'userMessage',
  'plan',
  'contextCompaction',
  'enteredReviewMode',
  'exitedReviewMode',
  'hookPrompt',
  'functionCallOutput',
  'subAgentActivity',
]);

export function codexUnrowedItemKind(type: string): TurnToolKind | undefined {
  if (CODEX_ROW_ITEMS.has(type) || CODEX_NON_TOOL_ITEMS.has(type) || type === CODEX_EXTERNAL_MCP_ITEM) return undefined;
  return CODEX_UNROWED_ITEM_KINDS[type] ?? 'other';
}

const STUDIO_PREFIX = `mcp__${STUDIO_MCP_SERVER}__`;

export function turnToolKind(presentedName: string): TurnToolKind | undefined {
  if (presentedName.startsWith(STUDIO_PREFIX)) return STUDIO_TOOL_KINDS[presentedName.slice(STUDIO_PREFIX.length)] ?? 'other';
  if (presentedName.startsWith('mcp__')) return undefined;
  return BUILT_IN_KINDS[presentedName] ?? 'other';
}
