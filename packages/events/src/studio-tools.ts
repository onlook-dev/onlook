/** The Studio tool names `packages/chat-ui` reads; every other verb lives in `main/agent-host/tool-names.ts` (ONL-2181). */
export const STUDIO_TOOL_SERVER = 'studio';
export const RENAME_PROJECT_TOOL_NAME = 'rename_project';
export const RENAME_PROJECT_TOOL = `mcp__${STUDIO_TOOL_SERVER}__${RENAME_PROJECT_TOOL_NAME}`;
export const SUGGEST_NEXT_TASKS_TOOL_NAME = 'suggest_next_tasks';
export const SUGGEST_NEXT_TASKS_TOOL = `mcp__${STUDIO_TOOL_SERVER}__${SUGGEST_NEXT_TASKS_TOOL_NAME}`;
export const MAX_NEXT_TASKS = 3;
export const MAX_NEXT_TASK_TITLE = 60;
export const MAX_NEXT_TASK_LINE = 100;
export const PROJECT_SETUP_TOOL_NAMES = {
  read: 'get_project_setup', save: 'save_project_setup', run: 'run_project_setup',
} as const;
export const SERVER_RUNNING_TOOL_NAME = 'server_running';

const RENAMED_PROJECT = /^Renamed to "(.+)"$/;

/** The model reads this as `rename_project`'s result, and the chat reads the name back out of it. */
export function renamedProjectResult(name: string): string {
  return `Renamed to "${name}"`;
}

/** Undefined for a skipped rename, so the chat never claims a rename that did not happen (ONL-2181). */
export function renamedProjectName(result: string | undefined): string | undefined {
  return result === undefined ? undefined : RENAMED_PROJECT.exec(result)?.[1];
}
