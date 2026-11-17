import { log } from './log/index.js';

const logger = log('quit');

export interface QuitTeardownOptions {
  synchronous: ReadonlyArray<() => void>;
  drainChain: ReadonlyArray<() => Promise<unknown>>;
  capMs: number;
  onDone: () => void;
}

export interface QuitTeardown {
  readonly hasRun: boolean;
  run(): void;
}

export function createQuitTeardown(options: QuitTeardownOptions): QuitTeardown {
  let ran = false;

  return {
    get hasRun(): boolean {
      return ran;
    },
    run(): void {
      if (ran) return;
      ran = true;

      // The latch is set: a throw escaping from here leaves an app that can never quit again (ONL-2119).
      for (const dispose of options.synchronous) {
        try {
          dispose();
        } catch (error) {
          logger.error('a synchronous disposer failed', { error });
        }
      }

      const [first, ...rest] = options.drainChain;
      let chain: Promise<unknown>;
      try {
        chain = first ? first() : Promise.resolve();
      } catch (error) {
        logger.error('a drain step failed', { error });
        chain = Promise.resolve();
      }
      for (const step of rest) chain = chain.then(() => step());

      // `.finally()` passes rejections through; without the `.catch()` a failing drain step is a crash dialog on quit.
      void Promise.race([
        chain,
        new Promise((resolve) => setTimeout(resolve, options.capMs)),
      ])
        .catch((error: unknown) => {
          logger.error('a drain step failed', { error });
        })
        .finally(() => options.onDone());
    },
  };
}
