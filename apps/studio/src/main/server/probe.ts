import { connect } from 'node:net';

// Literal addresses, never `localhost`: a resolved name answers by the resolver and happy-eyeballs.
const LOOPBACK_HOSTS: readonly string[] = ['127.0.0.1', '::1'];

function probeHost(port: number, host: string, timeoutMs: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const socket = connect({ port, host });

    const done = (answered: boolean): void => {
      if (settled) return;
      settled = true;
      // `destroy`, not `end`: a half-open socket to a wedged server keeps the process alive.
      socket.destroy();
      resolve(answered);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

// A TCP connect, not an HTTP request: a server mid-compile answers the socket long before a 200.
// Both loopback families, concurrently: either alone misses a single-family bind (ONL-1896).
export async function probePort(
  port: number,
  {
    hosts = LOOPBACK_HOSTS,
    timeoutMs = 1_000,
  }: { hosts?: readonly string[]; timeoutMs?: number } = {},
): Promise<boolean> {
  const answers = await Promise.all(hosts.map((host) => probeHost(port, host, timeoutMs)));
  return answers.some(Boolean);
}
