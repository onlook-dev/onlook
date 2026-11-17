export interface Playback {
  stop: () => void;
  finished: Promise<unknown>;
}

/** One row's running animations, counted into the list's moving flag. A stopped animation never settles its promise, so a stop finishes its count here. */
export class RowRuns {
  private readonly running = new Set<{ playback: Playback; finish: () => void }>();
  private released = false;
  private readonly counter: () => { begin: () => void; end: () => void };

  constructor(counter: () => { begin: () => void; end: () => void }) {
    this.counter = counter;
  }

  run(start: () => Playback): Playback {
    const { begin, end } = this.counter();
    begin();
    const playback = start();
    let done = false;
    const entry = {
      playback,
      finish: () => {
        if (done) return;
        done = true;
        this.running.delete(entry);
        end();
      },
    };
    this.running.add(entry);
    void playback.finished.then(entry.finish, entry.finish);
    return playback;
  }

  stopAll(): void {
    for (const entry of [...this.running]) {
      entry.playback.stop();
      entry.finish();
    }
  }

  get count(): number {
    return this.running.size;
  }

  mount(): void {
    this.released = false;
  }

  /** Deferred by a microtask: StrictMode runs this cleanup straight after mount, and its replayed mount must not find its launch stopped (ONL-2973). */
  dispose(): void {
    if (this.released) return;
    this.released = true;
    queueMicrotask(() => {
      if (this.released) this.stopAll();
    });
  }
}
