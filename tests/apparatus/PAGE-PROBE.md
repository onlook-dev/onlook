# Page probe

`installPageProbe(send, options?)` and `withPageProbe(target, use, options?)` from `@studio/fixtures` record, over CDP, where each ResizeObserver was constructed, every callback it delivered, and the page's errors and unhandled rejections, without changing product code. The types are in `src/page-instrumentation.ts`.

```ts
import { installPageProbe } from '@studio/fixtures';

const probe = await installPageProbe((method, params) => session.send(method, params));
try {
  const snapshot = await probe.reload();
} finally {
  await probe.dispose();
}
```

- `send`'s session must stay attached until `dispose()` succeeds. `withPageProbe` owns its session and disposes the probe before closing it.
- Only the target's top-level document is recorded. Other Tabs, guest webviews and child frames need their own target.
- The probe instruments each new document before its scripts run, and also the current one, which can't recover observers or errors from before installation. Reload for startup coverage, or pass `currentDocument: 'skip'`. Keep one probe per target.
- `read()` returns the current document's snapshot, or `null` if this probe hasn't instrumented it, and doesn't clear it. Each navigation starts empty, so read before navigating.
- Buffers keep the newest records up to the limits in `PageProbeOptions` and count what they drop.
- The probe never changes what the page sees: callbacks get their original arguments, errors still reach the browser, and `window.onerror` is left alone. `dispose()` restores the ResizeObserver constructor, but observers created meanwhile keep running, now unrecorded.
