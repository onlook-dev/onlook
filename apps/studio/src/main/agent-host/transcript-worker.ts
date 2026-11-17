import { parentPort, workerData } from 'node:worker_threads';
import type { TranscriptReply, TranscriptRequest } from './transcript-protocol.js';
import { TranscriptStorage, TRANSCRIPT_SAVE_DELAY_MS } from './transcript-storage.js';

const parent = parentPort;
if (parent === null) throw new Error('transcript worker requires a parent');
const storage = new TranscriptStorage((workerData as { root: string }).root);
let timer: ReturnType<typeof setTimeout> | undefined;
let inventoried = false;

function inventory(): void {
  const transcripts = inventoried ? undefined : storage.all();
  parent?.postMessage({ kind: 'inventory', rootsComplete: storage.rootsComplete(), ...(transcripts === undefined ? {} : { transcripts }) } satisfies TranscriptReply);
  inventoried = true;
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : 'transcript persistence failed';
}

function flush(): Record<string, number> {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  const revisions = storage.flush();
  inventory();
  parent?.postMessage({ kind: 'persisted', revisions } satisfies TranscriptReply);
  return revisions;
}

try {
  storage.migrate();
  inventory();
} catch (error) {
  parent.postMessage({ kind: 'failure', error: failure(error) } satisfies TranscriptReply);
}

parent.on('message', (request: TranscriptRequest) => {
  let reply: TranscriptReply;
  try {
    const operation = request.operation;
    let value: unknown;
    switch (operation.kind) {
      case 'read': value = storage.read(operation.cwd, operation.harness); break;
      case 'all': value = { transcripts: storage.all(), rootsComplete: storage.rootsComplete() }; break;
      case 'patch':
        storage.patch(operation.cwd, operation.harness, operation.start, operation.events, operation.revision);
        if (timer === undefined) timer = setTimeout(() => {
          try { flush(); } catch (error) {
            parent.postMessage({ kind: 'failure', error: failure(error) } satisfies TranscriptReply);
          }
        }, TRANSCRIPT_SAVE_DELAY_MS);
        break;
      case 'clear': storage.clear(operation.cwd, operation.harness); inventory(); break;
      case 'forget': storage.forget(operation.cwd); inventory(); break;
      case 'reopen': storage.reopen(operation.cwd); inventory(); break;
      case 'flush': value = flush(); break;
    }
    reply = { kind: 'reply', id: request.id, ok: true, value };
  } catch (error) {
    reply = { kind: 'reply', id: request.id, ok: false, error: failure(error) };
  }
  if (request.port !== undefined && request.signal !== undefined) {
    request.port.postMessage(reply);
    request.port.close();
    const signal = new Int32Array(request.signal);
    Atomics.store(signal, 0, 1);
    Atomics.notify(signal, 0);
  } else {
    parent.postMessage(reply);
  }
});
