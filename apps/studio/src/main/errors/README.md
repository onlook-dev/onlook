# Error ownership

Every captured error names an owner, and only `owner: 'ours'` is sent to error tracking. Failures caused by the user's environment, such as a dropped connection, a read-only volume or a full disk, stay in the local log. Anything unrecognised stays ours: an unknown network code or a broken updater can still be an Onlook bug.

The environmental cases are listed in `packages/events/src/error-classification.ts` and decided by `failureOwner`. The exact ResizeObserver loop notices are dropped before the renderer sends them.

From `initLog` on, `main/log/` owns the `error` listener on Onlook's own stderr, on every build, so a failed write there is a local warning with `owner: environment`, not an uncaught exception (ONL-2944). A bare `EPIPE` anywhere else is still ours.

Nothing here sends a path, file content, raw stderr or a crash dump. Messages and stacks go through the existing scrubbers, and main scrubs renderer reports again.
