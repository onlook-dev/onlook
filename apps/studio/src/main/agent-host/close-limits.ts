// `DISPOSE_SESSION_LIMIT_MS` exceeds the interrupt limit plus the tick allowance, or quit gives up before `agent_session_ended` is recorded (ONL-2254).
export const CLOSE_INTERRUPT_LIMIT_MS = 250;

/** Projects are waited on in parallel, so quit costs one of these, not N. */
export const DISPOSE_SESSION_LIMIT_MS = 400;

export async function settleWithin(work: Promise<unknown>, ms: number): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  try {
    return await Promise.race([
      work.then(
        () => true,
        () => true,
      ),
      expired,
    ]);
  } finally {
    clearTimeout(timer);
  }
}
