/** `up-to-date` is transient: main returns to `idle` on its own, so a surface keeps no timer for it (ONL-1844). */
export type UpdateStatus =
  | 'unsupported'
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  version?: string;
  percent?: number;
  message?: string;
  restarting?: boolean;
  /** The user asked for this check: `checking` and `up-to-date` earn a pill only then (ONL-2620). */
  requested?: boolean;
}

export const IDLE_UPDATE_STATE: UpdateState = { status: 'idle' };
