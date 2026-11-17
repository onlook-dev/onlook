export type StarterFailureCause = 'no_free_port' | 'starter_exited' | 'starter_never_ready';

export class StarterFailure extends Error {
  readonly failureCause: StarterFailureCause;
  readonly exitCode: number | undefined;

  constructor(failureCause: StarterFailureCause, message: string, exitCode?: number) {
    super(message);
    this.failureCause = failureCause;
    this.exitCode = exitCode;
  }
}
