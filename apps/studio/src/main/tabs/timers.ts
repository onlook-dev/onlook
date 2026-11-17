/** `unref` so a pending timer is never the reason Electron will not quit (`server/monitor.ts`). */
export function unrefTimer(fn: () => void, ms: number): ReturnType<typeof setTimeout> {
  const timer = setTimeout(fn, ms);
  timer.unref?.();
  return timer;
}
