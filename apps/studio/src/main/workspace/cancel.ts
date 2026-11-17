export interface CancelToken {
  readonly canceled: boolean;
  readonly whenCanceled: Promise<void>;
  cancel(): void;
}

export function createCancelToken(): CancelToken {
  let canceled = false;
  let flip: () => void = () => undefined;
  const whenCanceled = new Promise<void>((resolve) => {
    flip = resolve;
  });
  return {
    get canceled() {
      return canceled;
    },
    whenCanceled,
    cancel() {
      canceled = true;
      flip();
    },
  };
}
