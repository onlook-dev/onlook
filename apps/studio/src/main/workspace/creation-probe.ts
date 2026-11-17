/** Import-free on purpose: reaching `create-project.ts` from `setup-proof.ts` is a cycle the lint refuses. */
type RunningProbe = (workspacePath: string) => boolean;

let probe: RunningProbe | undefined;

export function observeCreationRunning(listener: RunningProbe): void {
  probe = listener;
}

export function isCreationRunningFor(workspacePath: string): boolean {
  return probe?.(workspacePath) ?? false;
}
