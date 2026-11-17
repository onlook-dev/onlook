const RESIZE_OBSERVER_NOTICES = new Set([
  'ResizeObserver loop completed with undelivered notifications.',
  'ResizeObserver loop limit exceeded',
]);

const CONNECTION_CODES = new Set([
  'ERR_INTERNET_DISCONNECTED',
  'ERR_NETWORK_CHANGED',
  'ERR_NAME_NOT_RESOLVED',
  'ERR_CONNECTION_REFUSED',
  'ERR_CONNECTION_RESET',
  'ERR_CONNECTION_CLOSED',
  'ERR_CONNECTION_ABORTED',
  'ERR_CONNECTION_TIMED_OUT',
  'ERR_TIMED_OUT',
  'ERR_ADDRESS_UNREACHABLE',
  'ERR_PROXY_CONNECTION_FAILED',
  'ERR_TUNNEL_CONNECTION_FAILED',
  'ERR_CERT_DATE_INVALID',
  'ERR_CERT_AUTHORITY_INVALID',
  'ERR_CERT_COMMON_NAME_INVALID',
]);

const DISK_CODES = new Set(['EACCES', 'EPERM', 'EROFS', 'ENOSPC', 'EDQUOT']);

export function isDiskFull(error: unknown): boolean {
  try {
    const code = error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
    const message = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
    return code === 'ENOSPC' || /^(?:ENOSPC)(?=:|$)/.test(message) || /\bno space left on device\b/i.test(message);
  } catch {
    return false;
  }
}

export function isResizeObserverNotice(message: unknown): boolean {
  return typeof message === 'string' && RESIZE_OBSERVER_NOTICES.has(message);
}

export function failureOwner(error: unknown): 'ours' | 'environment' {
  try {
    if (isDiskFull(error)) return 'environment';
    const message = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
    const networkCode = /^(?:Error: )?net::(ERR_[A-Z0-9_]+)\b/.exec(message)?.[1];
    if (networkCode !== undefined && CONNECTION_CODES.has(networkCode)) return 'environment';
    const code = error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (typeof code === 'string' && DISK_CODES.has(code)) return 'environment';
    const diskCode = /^(EACCES|EPERM|EROFS|ENOSPC|EDQUOT)(?=:|$)/.exec(message)?.[1];
    return diskCode === undefined ? 'ours' : 'environment';
  } catch {
    return 'ours';
  }
}
