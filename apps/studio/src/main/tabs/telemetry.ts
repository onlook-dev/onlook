/** Hashed ids and counts only; a project path is a customer's directory in a dashboard (ONL-2213). */

import type { TelemetryProperties, WorkspaceTelemetryProperties } from '../telemetry/events.js';

export type TabSelectMethod = TelemetryProperties<'tab_selected'>['method'];
export type TabCreateMethod = TelemetryProperties<'tab_created'>['method'];
export type TabCloseMethod = TelemetryProperties<'tab_closed'>['method'];

export interface TabFacts {
  workspacePath?: string;
  isWorking: boolean;
}

export type ProjectIdOf = (workspacePath: string) => string | undefined;

function idOf(tab: TabFacts | undefined, projectIdOf: ProjectIdOf): string | undefined {
  return tab?.workspacePath === undefined ? undefined : projectIdOf(tab.workspacePath);
}

export function tabSelected(
  input: { from: TabFacts | undefined; to: TabFacts; openCount: number; method: TabSelectMethod },
  projectIdOf: ProjectIdOf,
): TelemetryProperties<'tab_selected'> {
  const from = idOf(input.from, projectIdOf);
  const to = idOf(input.to, projectIdOf);
  return {
    method: input.method,
    open_count: input.openCount,
    ...(from === undefined ? {} : { from_project_id: from }),
    ...(to === undefined ? {} : { to_project_id: to }),
    to_was_working: input.to.isWorking,
  };
}

export function tabCreated(
  input: { tab: TabFacts; openCount: number; method: TabCreateMethod },
  workspacePropertiesOf: (workspacePath: string) => WorkspaceTelemetryProperties | undefined,
): TelemetryProperties<'tab_created'> {
  const workspace = input.tab.workspacePath === undefined ? undefined : workspacePropertiesOf(input.tab.workspacePath);
  return {
    method: input.method,
    open_count: input.openCount,
    ...workspace,
  };
}

export function tabClosed(input: {
  tab: TabFacts;
  openCount: number;
  method: TabCloseMethod;
  modalChoice?: 'close_anyway' | 'wait';
}): TelemetryProperties<'tab_closed'> {
  return {
    method: input.method,
    open_count: input.openCount,
    had_running_work: input.tab.isWorking,
    ...(input.modalChoice === undefined ? {} : { modal_choice: input.modalChoice }),
  };
}
