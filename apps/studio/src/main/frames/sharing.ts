const checks = new Set<{ check: () => void }>();
let timer: ReturnType<typeof setInterval> | undefined;

export function watchRendererSharing(check: () => void): () => void {
  const watcher = { check };
  checks.add(watcher);
  timer ??= setInterval(() => {
    for (const current of checks) current.check();
  }, 250);
  timer.unref();
  return () => {
    checks.delete(watcher);
    if (checks.size !== 0) return;
    clearInterval(timer);
    timer = undefined;
  };
}
