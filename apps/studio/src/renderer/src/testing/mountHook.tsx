import { takeComplaints } from './dom.js';
import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';

export interface MountedHook<P, T> {
  /** What the hook returned on its last settled render. */
  readonly current: T;
  rerender: (props: P) => Promise<void>;
  /** Runs work and lets every render and effect it causes settle. */
  settle: (work?: () => unknown) => Promise<void>;
  /** Also fails the test on any React complaint the run collected, which React itself only logs. */
  unmount: () => Promise<void>;
}

/** A hook on a real React root, so its effects, cleanups and late writes are the ones the app runs. */
export async function mountHook<P, T>(use: (props: P) => T, props: P): Promise<MountedHook<P, T>> {
  takeComplaints();
  const sink: { current: T } = { current: undefined as T };
  function Probe({ given }: { given: P }): null {
    const value = use(given);
    useEffect(() => {
      sink.current = value;
    });
    return null;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  await act(async () => {
    root = createRoot(container);
    root.render(<Probe given={props} />);
  });

  return {
    get current(): T {
      return sink.current;
    },
    rerender: async (next: P) => {
      await act(async () => {
        root?.render(<Probe given={next} />);
      });
    },
    settle: async (work?: () => unknown) => {
      await act(async () => {
        await work?.();
      });
    },
    unmount: async () => {
      await act(async () => {
        root?.unmount();
      });
      container.remove();
      const complaints = takeComplaints();
      if (complaints.length > 0) throw new Error(`React complained during this test: ${complaints.join(' / ')}`);
    },
  };
}
