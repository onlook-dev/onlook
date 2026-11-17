# Starting a new chat

`newChat` decides whether to proceed; `startSession` acts. `newChat` refuses, before anything is queued, when a turn is running, when no live session exists, or when the chat holds nothing the user said. Only the archive-and-restart sequence goes through the lifecycle queue, so nothing runs between the archive and the fresh start.

```
archive the rows -> forget both stored records and the always-allow grants -> stop the old session -> start a fresh one
```

The order matters. Each Harness clears its transcript when a new session starts (Claude in `startSession`, Codex inside the new session object), so the archive is written first. A write that throws leaves the old session live and resumable, with its grants intact.

Forgetting is what makes the chat new. Without it, `planSession` returns the stored Claude record and `storedAppServerThread` hands Codex a thread id, so the agent remembers a chat the user was told is gone. Both Harnesses' records are forgotten, since a Project that switches Harness later would otherwise resume the other one. Always-allow grants outlive the CLI process that took them, and this is the only control that clears them; the confirm dialog says so (ONL-2933).

A late row from the replaced session is dropped, never written into the fresh chat. An ordinary close still writes its own last rows (ONL-2254).

## Switching agent

`session.switchHarness` is a new chat on the other Harness, for this Project only (ONL-2903):

```
archive the rows -> forget both stored records and the always-allow grants -> stop -> write the Project's agent -> start
```

It refuses mid-turn, when the requested Harness is already running, and under a `STUDIO_HARNESS` pin, which outranks the Project's own choice. Each refusal comes before the archive. A chat with nothing the user said is not archived but still switches. The Harness being left names where it saved the chat (`AgentBackend.transcriptPath`), and the next user prompt carries that path once, in context only the model sees.

## What counts as a conversation

A row the user didn't write doesn't count: not `session.welcome`, and not a `message.user` with `origin: 'studio'`, which Onlook sends on the user's behalf. `isUserSpoken` in `@studio/events` is the one test for this, and `isUserSpokenItem` answers it for a projected row.

The archive keeps `MAX_ARCHIVED_CHATS` and drops the oldest, and it holds a chat's only copy, so archiving an empty chat would cost a real one.

`chat-history.ts` migrates an archive from an older version entry by entry instead of quarantining it, because a migration that returned empty state would be written back over the only copy.

## Telemetry

`chat_new_started` and `chat_agent_switched` are captured after the fresh session starts, so a refused or cancelled step records nothing. Only the renderer knows where the user chose, so the command carries it as `entry` (ONL-2612).
