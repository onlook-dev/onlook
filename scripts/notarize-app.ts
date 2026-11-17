import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { notarizeAndStaple, notaryCredentials } from './mac-notarization.js';

const app = process.argv[2];
if (!app) throw new Error('A signed app path is required');
const directory = mkdtempSync(join(tmpdir(), 'onlook-notarize-'));
try {
  await notarizeAndStaple(app, join(directory, 'app.zip'), notaryCredentials(process.env));
} finally {
  rmSync(directory, { recursive: true, force: true });
}
