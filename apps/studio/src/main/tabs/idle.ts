export interface TabIdleDeps {
  canSleep(): boolean;
  frames(discarded: boolean): Promise<void>;
  lifecycle(state: 'frozen' | 'active'): Promise<void>;
  fallback(error: unknown): void;
}

export function createTabIdle(deps: TabIdleDeps) {
  let wantsSleep = true;
  let discarded = false;
  let frozen = false;
  let retired = false;
  let pending = Promise.resolve();

  const awake = async (): Promise<void> => {
    if (retired) return;
    if (frozen) {
      await deps.lifecycle('active');
      frozen = false;
    }
    if (discarded) {
      await deps.frames(false);
      discarded = false;
    }
  };

  return {
    sleep(): Promise<void> {
      pending = pending.then(async () => {
        if (!wantsSleep || !deps.canSleep()) return;
        try {
          discarded = true;
          await deps.frames(true);
          if (!wantsSleep || !deps.canSleep()) { await awake(); return; }
          await deps.lifecycle('frozen');
          frozen = true;
          if (!wantsSleep || !deps.canSleep()) await awake();
        } catch (error) {
          if (wantsSleep && deps.canSleep()) {
            retired = true;
            deps.fallback(error);
          } else {
            await deps.lifecycle('active');
            frozen = false;
            await awake();
          }
        }
      });
      return pending;
    },
    wake(): Promise<void> {
      wantsSleep = false;
      pending = pending.catch(() => undefined).then(awake);
      return pending;
    },
  };
}
