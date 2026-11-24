import { expect, it } from 'bun:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordProjectPreviewDiagnostics } from './preview-diagnostics.js';
import { newPreviewAttempt, notePreviewDiagnostics, previewDiagnostics, resetPreviewDiagnostics } from '../telemetry/preview-diagnostics.js';

it('keeps detected project tools through the frame-state recording path', () => {
  const folder = mkdtempSync(join(tmpdir(), 'preview-metadata-'));
  try {
    writeFileSync(join(folder, 'package.json'), JSON.stringify({ dependencies: { vite: '1.0.0' }, packageManager: 'pnpm@10.0.0' }));
    notePreviewDiagnostics(folder, { project_source: 'imported' });
    recordProjectPreviewDiagnostics(folder, { ...newPreviewAttempt(), expected_port: 4100, cause: 'not_started' });
    expect(previewDiagnostics(folder)).toMatchObject({ framework: 'Vite', package_manager: 'pnpm', project_source: 'imported' });
    rmSync(join(folder, 'package.json'));
    recordProjectPreviewDiagnostics(folder, { ...newPreviewAttempt(), expected_port: 4200, cause: 'server_down' });
    expect(previewDiagnostics(folder)).toMatchObject({ framework: 'Vite', package_manager: 'pnpm', project_source: 'imported', expected_port: 4200, cause: 'server_down' });
  } finally {
    resetPreviewDiagnostics();
    rmSync(folder, { recursive: true, force: true });
  }
});
