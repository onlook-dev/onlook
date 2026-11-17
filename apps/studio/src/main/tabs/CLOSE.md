# Closing a Tab

`requestClose` decides and `close` tears down. The teardown is synchronous and unconditional; only the decision is asked, so nothing is half-closed while the confirm dialog is up. A Tab that disappears while the dialog is up isn't closed again and records nothing.

`requestClose` resolves to whether the Tab actually closed, so a caller acting on the Tab's Project can stop when the user declines. A Tab that is already gone resolves `true`. `closeForWorkspace` asks every Tab on one worktree in turn and stops at the first refusal. The dialog is app-modal.

The dialog appears only when closing would lose something the user can see:

- a running turn (it is interrupted, bounded by `CLOSE_INTERRUPT_LIMIT_MS`);
- an approval the agent is waiting on;
- a Project still being set up.

A prompt waiting in main goes back to the composer draft; pending composer images stay with that draft; a server the agent started is stopped with the session. None of these asks. **Wait** keeps the Tab and still records `tab_closed`, with `modal_choice: 'wait'`, so a count of `tab_closed` includes refusals unless it filters on that property.

## The sweep

After the session stops, `sweepWorktree` ends processes running from the Project's worktree. The worktree is the boundary, not the agent's process group, because each Harness runs shell commands in a session of its own (ONL-2306). `sweepWorktree` refuses any target outside `workspaceRoot()`, which is what keeps it away from the user's own dev server in their own checkout. It can't see a server whose process runs from outside the worktree, such as one handed to Docker or launchd.

## Reopening and cooling

Closing and reopening quickly keeps the live session: `requestStart` bumps the generation, and the queued stop returns without stopping (ONL-2264). A reopen after `CLOSE_INTERRUPT_LIMIT_MS` can briefly run a second SDK process beside one still being interrupted.

Starting a session fresh clears its stored transcript (ONL-1913). So before cooling frees an idle Tab, it asks `isSessionResumable`, and a Tab whose next start would be fresh stays warm.
