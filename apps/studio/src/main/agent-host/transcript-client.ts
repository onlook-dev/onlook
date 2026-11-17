import type { StudioEvent } from '@studio/events';
import { MessageChannel, receiveMessageOnPort, Worker } from 'node:worker_threads';
import type { SessionHarness } from './backend.js';
import { isStoredHarness, STORED_HARNESSES } from './harness.js';
import { transcriptKey, type TranscriptOperation, type TranscriptReply, type TranscriptRequest } from './transcript-protocol.js';

interface Snapshot {
  cwd: string;
  harness: SessionHarness;
  events: StudioEvent[];
}

const SHUTDOWN_DEADLINE_MS = 800;

export class TranscriptClient {
  private readonly root: string;
  private readonly workerUrl: URL;
  private readonly report: (error: string) => void;
  private worker: Worker | undefined;
  private nextId = 0;
  private revision = 0;
  private readonly snapshots = new Map<string, Snapshot>();
  private readonly dirty = new Map<string, number>();
  private readonly sealed = new Set<string>();
  private readonly forgottenInventory = new Set<string>();
  private readonly generations = new Map<string, number>();
  private readonly readOnly = new Set<string>();
  private readonly resync = new Set<string>();
  private readonly pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  private error: string | undefined;
  private closed = false;
  private accepting = true;
  private closing: Promise<void> | undefined;
  private inventoried = false;
  private rootsAreComplete = false;

  constructor(root: string, workerUrl: URL, report: (error: string) => void) {
    this.root = root;
    this.workerUrl = workerUrl;
    this.report = report;
  }

  private failed(error: string): void {
    this.rootsAreComplete = false;
    this.error = error;
    this.report(error);
  }

  private start(): Worker {
    if (this.closed) throw new Error('transcript client is closed');
    if (this.worker !== undefined) return this.worker;
    const worker = new Worker(this.workerUrl, { workerData: { root: this.root } });
    this.worker = worker;
    worker.unref();
    worker.on('message', (reply: TranscriptReply) => {
      if (this.worker !== worker) return;
      if (reply.kind === 'failure') {
        this.failed(reply.error);
      } else if (reply.kind === 'persisted') {
        for (const [cwd, revision] of Object.entries(reply.revisions)) {
          if ((this.dirty.get(cwd) ?? Infinity) <= revision) this.dirty.delete(cwd);
        }
      } else if (reply.kind === 'inventory') {
        if (reply.transcripts !== undefined) this.acceptInventory(reply.transcripts);
        this.rootsAreComplete = reply.rootsComplete;
      } else {
        const waiting = this.pending.get(reply.id);
        this.pending.delete(reply.id);
        if (reply.ok) waiting?.resolve(reply.value);
        else waiting?.reject(new Error(reply.error));
      }
      if (this.pending.size === 0) worker.unref();
    });
    const died = (error: string): void => {
      if (this.worker !== worker) return;
      this.worker = undefined;
      this.failed(error);
      for (const waiting of this.pending.values()) waiting.reject(new Error(error));
      this.pending.clear();
    };
    worker.on('error', (error) => died(error.message));
    worker.on('exit', (code) => died(`transcript worker exited (${String(code)})`));
    for (const snapshot of this.snapshots.values()) {
      const revision = this.dirty.get(snapshot.cwd);
      if (revision === undefined || this.sealed.has(snapshot.cwd)) continue;
      this.post({ kind: 'patch', ...snapshot, start: 0, revision }).catch((error: unknown) => {
        this.failed(error instanceof Error ? error.message : 'transcript retry failed');
      });
    }
    return worker;
  }

  private post(operation: TranscriptOperation): Promise<unknown> {
    let worker: Worker;
    try {
      worker = this.start();
    } catch (error) {
      return Promise.reject(error);
    }
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.ref();
      try {
        worker.postMessage({ id, operation } satisfies TranscriptRequest);
      } catch (error) {
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  private sync(operation: TranscriptOperation): unknown {
    const worker = this.start();
    const { port1, port2 } = new MessageChannel();
    const signal = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
    try {
      worker.postMessage({ id: ++this.nextId, operation, port: port2, signal } satisfies TranscriptRequest, [port2]);
      if (Atomics.wait(new Int32Array(signal), 0, 0, 15_000) === 'timed-out') {
        this.worker = undefined;
        void worker.terminate();
        for (const waiting of this.pending.values()) waiting.reject(new Error('transcript worker did not respond'));
        this.pending.clear();
        throw new Error('transcript worker did not respond');
      }
      const reply = receiveMessageOnPort(port1)?.message as TranscriptReply | undefined;
      if (reply?.kind !== 'reply') throw new Error('missing transcript worker reply');
      if (!reply.ok) throw new Error(reply.error);
      return reply.value;
    } catch (error) {
      this.failed(error instanceof Error ? error.message : 'transcript request failed');
      throw error;
    } finally {
      port1.close();
      port2.close();
    }
  }

  read(cwd: string, harness: SessionHarness): StudioEvent[] {
    const key = transcriptKey(cwd, harness);
    const cached = this.snapshots.get(key);
    if (cached !== undefined) return cached.events.slice();
    try {
      const events = this.sync({ kind: 'read', cwd, harness }) as StudioEvent[];
      this.snapshots.set(key, { cwd, harness, events });
      return events.slice();
    } catch (error) {
      if (error instanceof Error && error.message.includes('newer')) this.readOnly.add(cwd);
      return [];
    }
  }

  all(): Record<string, StudioEvent[]> {
    if (!this.inventoried) {
      try {
        const stored = this.sync({ kind: 'all' }) as { transcripts: Record<string, StudioEvent[]>; rootsComplete: boolean };
        this.acceptInventory(stored.transcripts);
        this.rootsAreComplete = stored.rootsComplete;
      } catch {
        this.rootsAreComplete = false;
      }
      this.inventoried = true;
    }
    const result: Record<string, StudioEvent[]> = {};
    for (const [key, snapshot] of this.snapshots) result[key] = snapshot.events;
    return result;
  }

  private acceptInventory(transcripts: Record<string, StudioEvent[]>): void {
    for (const [key, events] of Object.entries(transcripts)) {
      if (this.snapshots.has(key)) continue;
      const delimiter = key.lastIndexOf('::');
      const cwd = key.slice(0, delimiter);
      const harness = key.slice(delimiter + 2);
      if (!isStoredHarness(harness)) continue;
      if (!this.sealed.has(cwd) && !this.forgottenInventory.has(cwd)) this.snapshots.set(key, { cwd, harness, events });
    }
    this.inventoried = true;
  }

  rootsComplete(): boolean {
    if (!this.inventoried && this.error !== undefined) return false;
    if (!this.inventoried) this.all();
    return this.rootsAreComplete;
  }

  write(cwd: string, harness: SessionHarness, events: readonly StudioEvent[]): void {
    if (!this.accepting || this.closed || this.sealed.has(cwd)) return;
    let ready = true;
    try {
      this.start();
    } catch (error) {
      ready = false;
      this.failed(error instanceof Error ? error.message : 'transcript worker could not start');
    }
    const key = transcriptKey(cwd, harness);
    const previous = this.snapshots.get(key)?.events ?? [];
    let start = 0;
    while (start < previous.length && start < events.length && previous[start] === events[start]) start += 1;
    if (this.resync.has(key)) start = 0;
    const suffix = events.slice(start);
    previous.length = start;
    for (const event of suffix) previous.push(event);
    this.snapshots.set(key, { cwd, harness, events: previous });
    const revision = ++this.revision;
    const generation = this.generations.get(cwd) ?? 0;
    this.dirty.set(cwd, revision);
    if (!ready) return;
    void this.post({ kind: 'patch', cwd, harness, start, events: suffix, revision }).catch((error: unknown) => {
      if (generation !== (this.generations.get(cwd) ?? 0)) return;
      const message = error instanceof Error ? error.message : 'transcript save failed';
      if (message.includes('newer')) this.readOnly.add(cwd);
      this.resync.add(key);
      this.failed(message);
    });
  }

  clear(cwd: string, harness: SessionHarness): void {
    this.sync({ kind: 'clear', cwd, harness });
    this.snapshots.set(transcriptKey(cwd, harness), { cwd, harness, events: [] });
    this.dirty.delete(cwd);
  }

  forget(cwd: string): void {
    this.sync({ kind: 'forget', cwd });
    this.sealed.add(cwd);
    this.forgottenInventory.add(cwd);
    this.generations.set(cwd, (this.generations.get(cwd) ?? 0) + 1);
    this.readOnly.delete(cwd);
    for (const harness of STORED_HARNESSES) {
      const key = transcriptKey(cwd, harness);
      this.snapshots.delete(key);
      this.resync.delete(key);
    }
    this.dirty.delete(cwd);
  }

  reopen(cwd: string): void {
    if (!this.sealed.has(cwd)) return;
    this.sync({ kind: 'reopen', cwd });
    this.sealed.delete(cwd);
  }

  async flush(): Promise<void> {
    if (this.worker === undefined && this.dirty.size === 0) return;
    const barrier = this.revision;
    try {
      for (const key of this.resync) {
        const snapshot = this.snapshots.get(key);
        if (snapshot === undefined || this.sealed.has(snapshot.cwd)) continue;
        const revision = this.dirty.get(snapshot.cwd);
        if (revision === undefined) continue;
        await this.post({ kind: 'patch', ...snapshot, start: 0, revision });
        this.resync.delete(key);
      }
      const revisions = await this.post({ kind: 'flush' }) as Record<string, number>;
      for (const [cwd, revision] of Object.entries(revisions)) {
        if ((this.dirty.get(cwd) ?? Infinity) <= revision) this.dirty.delete(cwd);
        this.readOnly.delete(cwd);
      }
      if ([...this.dirty.values()].some((revision) => revision <= barrier)) throw new Error(this.error ?? 'transcript saves were not acknowledged');
      if (this.readOnly.size === 0 && this.dirty.size === 0) this.error = undefined;
    } catch (error) {
      this.failed(error instanceof Error ? error.message : 'transcript drain failed');
      throw error;
    }
  }

  reset(): void {
    if (this.worker !== undefined || this.dirty.size > 0) this.sync({ kind: 'flush' });
    this.closed = true;
    const worker = this.worker;
    this.worker = undefined;
    if (worker !== undefined) void worker.terminate();
    for (const waiting of this.pending.values()) waiting.resolve(undefined);
    this.pending.clear();
  }

  async close(): Promise<void> {
    this.closing ??= this.drainAndClose();
    return this.closing;
  }

  private async drainAndClose(): Promise<void> {
    this.accepting = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failure: Error | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error(`transcript shutdown timed out after ${String(SHUTDOWN_DEADLINE_MS)} ms`)), SHUTDOWN_DEADLINE_MS);
    });
    try {
      await Promise.race([this.flush(), deadline]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'transcript shutdown failed';
      failure = new Error(`${message} (${String(this.dirty.size)} undrained Projects, ${String(this.pending.size)} pending requests)`);
      this.failed(failure.message);
      throw failure;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      this.closed = true;
      const worker = this.worker;
      this.worker = undefined;
      for (const waiting of this.pending.values()) waiting.reject(failure ?? new Error('transcript client is closed'));
      this.pending.clear();
      if (worker !== undefined) {
        void worker.terminate().catch((error: unknown) => {
          this.failed(error instanceof Error ? error.message : 'transcript worker termination failed');
        });
        worker.unref();
      }
    }
  }

  status(): { pendingProjects: number; error: string | undefined; readOnlyProjects: string[] } {
    return { pendingProjects: this.dirty.size, error: this.error, readOnlyProjects: [...this.readOnly] };
  }
}
