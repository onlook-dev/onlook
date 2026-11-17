import { join } from 'node:path';
import { writeAtomicFile } from '../fs-atomic.js';

export const READY_LINE_PATTERN = /^starter ready http:\/\/127\.0\.0\.1:(\d+)$/m;

export const STARTER_SERVER_FILE = 'server.mjs';

// Interpolated into every adapter's `server.mjs`; no backticks below (template literals).
export const STARTER_PORT_GUARD_JS = `const PORT = Number(process.env.PORT);
if (!Number.isInteger(PORT) || PORT <= 0) {
  console.error('PORT must be set to the port to listen on');
  process.exit(2);
}`;

export const STARTER_BACKSTOP_JS = `const parentPort =
  process.parentPort ??
  (typeof process.send === 'function'
    ? { on: (_event, listener) => process.on('message', (data) => listener({ data })) }
    : undefined);
if (parentPort) {
  let deadline;
  const arm = (windowMs) => {
    clearTimeout(deadline);
    deadline = setTimeout(() => process.exit(3), windowMs);
  };
  arm(15000);
  parentPort.on('message', (event) => {
    const message = event.data;
    if (message && message.type === 'heartbeat' && Number.isFinite(message.windowMs)) {
      arm(message.windowMs);
    }
  });
}`;

export function writeScaffold(dir: string, files: Readonly<Record<string, string>>): string[] {
  for (const [name, content] of Object.entries(files)) {
    writeAtomicFile(join(dir, name), content);
  }
  return Object.keys(files);
}
