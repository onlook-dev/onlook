import type { StudioEvent, ToolFileChange, ToolStatus, TouchedFileView } from './events.js';

interface FileCall {
  order: number;
  status: ToolStatus;
  changes: Map<string, ToolFileChange>;
}

function terminal(status: ToolStatus): boolean {
  return status === 'completed' || status === 'canceled' || status === 'failed' || status === 'denied';
}

export function touchedFilesOf(events: readonly StudioEvent[]): TouchedFileView[] {
  const calls = new Map<string, FileCall>();
  const files = new Map<string, Set<FileCall>>();
  let live = false;
  let turnId: string | undefined;

  let start = events.length - 1;
  while (start >= 0 && events[start]?.type !== 'turn.started') start -= 1;
  if (start === -1) return [];
  for (let index = start; index < events.length; index += 1) {
    const event = events[index];
    if (event === undefined) continue;
    if (event.type === 'turn.started') {
      calls.clear();
      files.clear();
      turnId = event.turnId;
      live = true;
    } else if (live && ((event.type === 'turn.ended' && event.turnId === turnId) || event.type === 'session.ended')) {
      for (const call of calls.values()) if (!terminal(call.status)) call.status = 'canceled';
      live = false;
    } else if (live && (event.type === 'tool.start' || event.type === 'tool.update')) {
      let call = calls.get(event.toolCallId);
      const frozen = call !== undefined && terminal(call.status);
      if (call === undefined) {
        if (event.type !== 'tool.start') continue;
        call = { order: calls.size, status: event.status, changes: new Map() };
        calls.set(event.toolCallId, call);
      } else if (!terminal(call.status) && event.status !== undefined) {
        call.status = event.status;
      }
      for (const change of event.fileChanges ?? []) {
        if (!frozen || !call.changes.has(change.path)) call.changes.set(change.path, change);
        const owners = files.get(change.path) ?? new Set<FileCall>();
        owners.add(call);
        files.set(change.path, owners);
      }
    } else if (live && event.type === 'tool.end') {
      const call = calls.get(event.toolCallId);
      if (call !== undefined && !terminal(call.status)) call.status = event.status;
    }
  }

  return [...files].map(([path, owners]) => {
    const ordered = [...owners].sort((first, second) => first.order - second.order);
    const editing = ordered.some((call) => !terminal(call.status));
    let status: TouchedFileView['status'] = 'stopped';
    let successful: TouchedFileView['status'] | undefined;
    let additions = 0;
    let deletions = 0;
    let hasCounts = false;
    let unknownCounts = false;
    for (const call of ordered) {
      if (call.status === 'completed') {
        const change = call.changes.get(path);
        const operation = change?.operation;
        if (change?.additions !== undefined && change.deletions !== undefined) {
          additions += change.additions;
          deletions += change.deletions;
          hasCounts = true;
        } else unknownCounts = true;
        if (operation === 'create') successful = 'created';
        else if (operation === 'delete') successful = 'deleted';
        else if (successful !== 'created') successful = 'edited';
        status = successful;
      } else {
        status = call.status === 'failed' ? 'failed' : call.status === 'denied' ? 'denied' : 'stopped';
      }
    }
    return { path, status: editing ? 'editing' : status, ...(successful === undefined ? {} : { hasSuccessfulChange: true }), ...(hasCounts && !unknownCounts ? { additions, deletions } : {}) };
  });
}
