import type { ProjectCreateState, TabAssignment } from '@studio/events';
import { screenForCreate } from './activation/advance.js';

/** The project a booting tab should reopen: a reload lands here holding one, and only a parked birth waits to be told (ONL-2593). */
export function heldProjectPath(
  birth: 'projects' | 'parked',
  assignment: TabAssignment | null,
): string | undefined {
  if (birth === 'parked' || assignment?.purpose !== 'project') return undefined;
  return assignment.workspacePath;
}

/** The creation record's read lands this view; taking the assignment too raises a switch no landing lowers (ONL-2744). */
export function parkedAssignment(
  assignment: TabAssignment | null,
  creating: ProjectCreateState | null,
): TabAssignment | null {
  if (creating !== null && screenForCreate(creating) !== null) return null;
  return assignment;
}
