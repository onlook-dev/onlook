import { createServer } from 'node:net';
import { StarterFailure } from './failure.js';

// A range no framework defaults to, so the agent's own dev server never collides with the starter.
export const STARTER_PORT_RANGE = { first: 4700, last: 4799 } as const;

const FRAMEWORK_DEFAULTS: ReadonlySet<number> = new Set([3000, 5173, 8080, 4321, 8000]);

export function isFrameworkDefaultPort(port: number): boolean {
  return FRAMEWORK_DEFAULTS.has(port);
}

// The same address the starter binds; never throws.
function isPortFree(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.unref();
    server.once('error', () => resolve(false));
    server.listen(port, host, () => server.close(() => resolve(true)));
  });
}

export async function pickStarterPort(
  preferred?: number,
  isFree: (port: number) => Promise<boolean> = isPortFree,
): Promise<number> {
  if (
    preferred !== undefined &&
    Number.isInteger(preferred) &&
    preferred > 0 &&
    !isFrameworkDefaultPort(preferred) &&
    (await isFree(preferred))
  ) {
    return preferred;
  }
  for (let port = STARTER_PORT_RANGE.first; port <= STARTER_PORT_RANGE.last; port += 1) {
    if (isFrameworkDefaultPort(port)) continue;
    if (await isFree(port)) return port;
  }
  throw new StarterFailure('no_free_port',
    `no free port between ${STARTER_PORT_RANGE.first} and ${STARTER_PORT_RANGE.last}`,
  );
}
