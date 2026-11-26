import './node-live-preload.ts';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// The Node tier's twin of `src/preload.ts`.
const processRoot = mkdtempSync(join(tmpdir(), 'studio-test-'));
process.env['TMPDIR'] = processRoot;
process.on('exit', () => {
  rmSync(processRoot, { recursive: true, force: true });
});
