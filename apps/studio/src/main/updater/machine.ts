import { IDLE_UPDATE_STATE, isDiskFull, type UpdateState } from '@studio/events';

const UP_TO_DATE_LINGER_MS = 3_000;

const REFUSED_CHECK_DELAY_MS = 1_200;

const CHECK_INTERVAL_MS = 1 * 60 * 60 * 1000;

const SHOWN_AFTER_FAILURES = 3;

export interface UpdateMachineOptions {
  emit: (next: UpdateState) => void;
  lingerMs?: number;
  checkIntervalMs?: number;
  shownAfterFailures?: number;
  waitForNativeStage?: boolean;
  restartTimeoutMs?: number;
  onInstallFailure?: (error: Error) => void;
}

export class UpdateMachine {
  private state: UpdateState = IDLE_UPDATE_STATE;
  private lingerTimer: NodeJS.Timeout | undefined;
  private lingerLandsOn: UpdateState = IDLE_UPDATE_STATE;
  private checkTimer: NodeJS.Timeout | undefined;
  private readonly emit: (next: UpdateState) => void;
  private readonly lingerMs: number;
  private readonly checkIntervalMs: number;
  private readonly shownAfterFailures: number;
  private requested = false;
  private failures = 0;
  private refreshing = false;
  private staging = false;
  private heldInstall: (() => void) | undefined;
  private restartTimer: NodeJS.Timeout | undefined;

  constructor(private readonly options: UpdateMachineOptions) {
    this.emit = options.emit;
    this.lingerMs = options.lingerMs ?? UP_TO_DATE_LINGER_MS;
    this.checkIntervalMs = options.checkIntervalMs ?? CHECK_INTERVAL_MS;
    this.shownAfterFailures = options.shownAfterFailures ?? SHOWN_AFTER_FAILURES;
  }

  current(): UpdateState {
    return this.state;
  }

  /** Configure-phase only; a failed check is `failed()`. Collapsing the two disabled the menu item for an offline launch (ONL-1844). */
  unsupported(message: string): void {
    this.set({ status: 'unsupported', message });
  }

  /** A check nobody asked for leaves a shown pill alone to start; only its verdict may replace one (ONL-2620). */
  checking(): void {
    this.refreshing = true;
    if (this.state.status === 'downloaded') return;
    if (!this.requested && this.state.status === 'error') return;
    this.set({ status: 'checking', ...this.claim() });
  }

  /** For a check already in flight, whose own verdict is the answer; moving the status here would strand the pill mid-walk, except the `checking` that walk suppressed under a shown failure (ONL-2620). */
  claimCheck(): void {
    this.requested = true;
    if (this.refreshing && this.state.status === 'error') this.checking();
  }

  requestCheck(): void {
    this.requested = true;
    this.checking();
  }

  available(version: string): void {
    this.failures = 0;
    if (this.state.status === 'downloaded') return;
    this.set({ status: 'available', version });
  }

  downloading(percent: number): void {
    if (this.state.status === 'downloaded') return;
    this.set({ status: 'downloading', percent, version: this.state.version });
  }

  downloaded(version: string): void {
    this.failures = 0;
    const restarting = this.state.restarting;
    this.refreshing = false;
    this.staging = this.options.waitForNativeStage ?? false;
    this.set({ status: 'downloaded', version, ...(restarting ? { restarting } : {}) });
    this.finishRestart();
  }

  upToDate(): void {
    this.failures = 0;
    if (this.state.status === 'downloaded') return;
    this.set({ status: 'up-to-date', ...this.claim() });
  }

  /** Read before `set()`, which spends the request on any status but `checking`. */
  private claim(): { requested?: true } {
    return this.requested ? { requested: true } : {};
  }

  /** A background failure is silent until `shownAfterFailures` in a row; a reopen on a new network fails its launch check once (ONL-2402). */
  failed(message: string, stage: 'check' | 'download' | 'install' = this.state.status === 'downloaded' ? 'install' : 'check'): void {
    this.refreshing = false;
    if (stage !== 'install' && this.state.status === 'downloaded') return;
    const installFailed = stage === 'install' || this.state.status === 'downloaded';
    this.staging = false;
    this.heldInstall = undefined;
    clearTimeout(this.restartTimer);
    const requested = this.requested;
    this.failures += 1;
    if (installFailed || isDiskFull(message) || requested || this.failures >= this.shownAfterFailures) {
      this.failures = Math.max(this.failures, this.shownAfterFailures);
      this.set({ status: 'error', message });
      return;
    }
    this.set(IDLE_UPDATE_STATE);
  }

  canRestart(): boolean {
    return this.state.status === 'downloaded' && !this.state.restarting;
  }

  restart(quitAndInstall: () => void): boolean {
    if (!this.canRestart()) return false;
    this.heldInstall = quitAndInstall;
    this.set({ ...this.state, restarting: true });
    this.finishRestart();
    return true;
  }

  checkFinished(): void {
    this.requested = false;
    this.refreshing = false;
    this.finishRestart();
  }

  nativeStaged(): void {
    if (!this.staging) return;
    this.staging = false;
    this.finishRestart();
  }

  isStaging(): boolean {
    return this.staging;
  }

  dispose(): void {
    this.stopPeriodicChecks();
    clearTimeout(this.lingerTimer);
    clearTimeout(this.restartTimer);
  }

  private finishRestart(): void {
    if (this.refreshing || this.staging || !this.heldInstall) return;
    const install = this.heldInstall;
    this.heldInstall = undefined;
    this.restartTimer = setTimeout(() => this.installFailed(new Error('Restarting to install the update timed out.')), this.options.restartTimeoutMs ?? 30_000);
    this.restartTimer.unref?.();
    try {
      install();
    } catch (error) {
      this.installFailed(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private installFailed(error: Error): void {
    this.options.onInstallFailure?.(error);
    this.failed(error.message, 'install');
  }

  startPeriodicChecks(check: () => void): void {
    this.stopPeriodicChecks();
    this.checkTimer = setInterval(check, this.checkIntervalMs);
    this.checkTimer.unref?.();
  }

  stopPeriodicChecks(): void {
    clearInterval(this.checkTimer);
    this.checkTimer = undefined;
  }

  /** Walks checking -> up-to-date -> the interrupted state; landing on idle would erase `unsupported` for the session (ONL-1844). */
  refusedCheck(delayMs = REFUSED_CHECK_DELAY_MS): void {
    // A second click mid-walk would capture the walk's own `up-to-date` as the verdict to restore, losing `unsupported` for the session (ONL-1844).
    if (this.state.status === 'checking' || this.state.status === 'up-to-date') return;
    const prior = this.state;
    this.requestCheck();
    const timer = setTimeout(() => {
      this.lingerLandsOn = prior;
      this.upToDate();
    }, delayMs);
    timer.unref?.();
  }

  private set(next: UpdateState): void {
    clearTimeout(this.lingerTimer);
    this.lingerTimer = undefined;
    if (next.status !== 'up-to-date') this.lingerLandsOn = IDLE_UPDATE_STATE;
    if (next.status !== 'checking') this.requested = false;
    this.state = next;
    this.emit(next);

    if (next.status === 'up-to-date') {
      this.lingerTimer = setTimeout(() => {
        const lands = this.lingerLandsOn;
        this.lingerLandsOn = IDLE_UPDATE_STATE;
        this.set(lands);
      }, this.lingerMs);
      this.lingerTimer.unref?.();
    }
  }
}
