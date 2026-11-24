/** The renderer-shell limit. Preparing a canvas afterward has its own single-tab memory guard. */
export const PREWARM_LIMIT = 3;

/** One renderer at a time: three built at once compete with the window the user is already looking at. */
export const PREWARM_GAP_MS = 1_500;

/** A renderer that never reports is not a reason to leave the rest of the queue cold. */
export const PREWARM_READY_TIMEOUT_MS = 20_000;

export interface PrewarmCandidate {
  id: string;
  isCold: boolean;
  isProject: boolean;
  isSelected: boolean;
}

/** The selected Tab first, then strip order: a person comes back to what they left (ONL-3153). */
export function prewarmQueue(candidates: readonly PrewarmCandidate[], limit = PREWARM_LIMIT): string[] {
  const cold = candidates.filter((candidate) => candidate.isCold && candidate.isProject);
  return [...cold.filter((candidate) => candidate.isSelected), ...cold.filter((candidate) => !candidate.isSelected)]
    .slice(0, limit)
    .map((candidate) => candidate.id);
}
