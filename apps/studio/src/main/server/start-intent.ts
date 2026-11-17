// The agent host imports the server host, never the reverse: the press is announced here and answered there (ONL-2179).

type StartIntentListener = (worktree: string, folders: readonly string[]) => void;

let onStart: StartIntentListener | undefined;

export function observeStartIntent(listener: StartIntentListener): void {
  onStart = listener;
}

export function noteStartIntent(worktree: string, folders: readonly string[]): void {
  onStart?.(worktree, folders);
}
