import { IDLE_CODEX_SETUP_STATE, type CodexSetupState } from '@studio/events';

export interface CodexSetupMachineOptions {
  emit: (next: CodexSetupState) => void;
}

export interface CodexAccount {
  email?: string;
  plan?: string;
}

export function codexDeviceAuthCommand(bin: string): string {
  const path = /[\s"'\\]/.test(bin) ? `'${bin.replace(/'/g, "'\\''")}'` : bin;
  return `${path} login --device-auth`;
}

export class CodexSetupMachine {
  private state: CodexSetupState = IDLE_CODEX_SETUP_STATE;
  private readonly emit: (next: CodexSetupState) => void;
  private command: string | undefined;

  constructor(options: CodexSetupMachineOptions) {
    this.emit = options.emit;
  }

  current(): CodexSetupState {
    return this.state;
  }

  isReady(): boolean {
    return this.state.status === 'ready';
  }

  installationLost(): void {
    if (!this.isReady()) return;
    this.command = undefined;
    this.set({ status: 'idle' });
  }

  checking(): void {
    this.set({ status: 'checking' });
  }

  downloading(message?: string): void {
    this.set({ status: 'downloading', ...(message === undefined ? {} : { message }) });
  }

  /** A late chunk after `downloading` would walk `ready` backwards; every emit is an IPC broadcast, hence the whole-percent dedupe. */
  progress(receivedBytes: number, totalBytes?: number): void {
    if (this.state.status !== 'downloading') return;
    if (totalBytes === undefined || totalBytes <= 0) return;

    const percent = Math.max(0, Math.min(100, Math.floor((receivedBytes / totalBytes) * 100)));
    if (this.state.percent === percent) return;
    this.set({ status: 'downloading', percent });
  }

  validating(): void {
    this.set({ status: 'validating' });
  }

  ready(account: CodexAccount = {}): void {
    this.set({
      status: 'ready',
      ...(account.email === undefined ? {} : { email: account.email }),
      ...(account.plan === undefined ? {} : { plan: account.plan }),
    });
  }

  binaryResolved(bin: string): void {
    this.command = codexDeviceAuthCommand(bin);
  }

  /** Retryable; `broken` and `outdated` offer reinstall, `unsupported` offers nothing. Four states, not one. */
  failed(message?: string): void {
    this.set({ status: 'failed', ...(message === undefined ? {} : { message }) });
  }

  broken(message?: string): void {
    this.set({ status: 'broken', ...(message === undefined ? {} : { message }) });
  }

  outdated(message: string): void {
    this.set({ status: 'outdated', message });
  }

  signedOut(message?: string): void {
    this.set({
      status: 'signed-out',
      ...(message === undefined ? {} : { message }),
      ...(this.command === undefined ? {} : { command: this.command }),
    });
  }

  signingIn(authUrl?: string): void {
    this.set({ status: 'signing-in', ...(authUrl === undefined ? {} : { authUrl }) });
  }

  unsupported(message: string): void {
    this.set({ status: 'unsupported', message });
  }

  private set(next: CodexSetupState): void {
    this.state = next;
    this.emit(next);
  }
}
