/** Electron-free, and SDK-free: importing the agent host here would pull the SDK into every tab suite (ONL-2206). */
type ResumableProbe = (workspacePath: string) => Promise<boolean>;

let probe: ResumableProbe | undefined;

export function observeSessionResumable(listener: ResumableProbe): void {
  probe = listener;
}

/** Unprobed answers NO: cooling may free a project only when the wake is known to resume (ONL-2210). */
export function isSessionResumable(workspacePath: string): Promise<boolean> {
  return probe?.(workspacePath) ?? Promise.resolve(false);
}
