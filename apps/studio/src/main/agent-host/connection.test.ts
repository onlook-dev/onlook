// Verbatim SDK messages, captured at 0.3.220: a bump that rewords them fails here rather than degrading the surface.

import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { outcome } from '@studio/fixtures';
import { classifyError, classifySessionError, probeMemo } from './connection.js';
import { shareInFlight, type InFlight } from './single-flight.js';
import {
  connectionStatusFromSetup,
  probeCodexConnection,
  probeCodexInstall,
} from './codex-connection.js';

const CLI_MISSING =
  'Claude Code native binary not found at /nonexistent/claude-code-cli. ' +
  'Please ensure Claude Code is installed via native installer or specify a ' +
  'valid path with options.pathToClaudeCodeExecutable.';

const LAUNCH_FAILED =
  "Claude Code native binary at /some/path exists but failed to launch. This " +
  "usually means the binary does not match this system's libc.";

describe('classifyError', () => {
  it('buckets the captured missing-binary message', () => {
    expect(classifyError(CLI_MISSING)).toBe('cli_missing');
  });

  it('buckets a binary that exists but will not launch', () => {
    expect(classifyError(LAUNCH_FAILED)).toBe('cli_missing');
    expect(classifyError('spawn /Applications/Onlook.app/claude EACCES')).toBe('cli_missing');
    expect(classifyError('spawn /Applications/Onlook.app/claude ENOEXEC')).toBe('cli_missing');
    expect(classifyError('spawn /Applications/Onlook.app/app.asar/claude ENOTDIR')).toBe('cli_missing');
  });

  it('buckets auth-shaped failures', () => {
    // Neither arrives as a throw: both ride a `subtype: 'success'` result with `is_error: true` (ONL-2080).
    expect(classifyError('Not logged in · Please run /login')).toBe('unauthenticated');
    expect(
      classifyError('Failed to authenticate: OAuth session expired and could not be refreshed'),
    ).toBe('unauthenticated');
    expect(classifyError('401 Unauthorized')).toBe('unauthenticated');
  });

  it('falls back to error rather than guessing', () => {
    expect(classifyError('something entirely new')).toBe('error');
    expect(classifyError('EACCES: permission denied, open /project/settings.json')).toBe('error');
  });
});

describe('classifySessionError', () => {
  it('classifies thrown billing prose without classifying an ordinary numeric message', () => {
    expect(classifySessionError('API Error: 402 Payment required')).toBe('billing_error');
    expect(classifySessionError('Your credit balance is too low to access the Anthropic API.')).toBe('billing_error');
    expect(classifySessionError('Error processing request 402')).toBe('unknown');
  });
  it('keeps spawn_failed distinct from the generic bucket', () => {
    expect(classifySessionError('spawn ENOTDIR')).toBe('cli_missing');
    expect(classifySessionError('process exited with code 1')).toBe('spawn_failed');
    // ENOENT alone means no binary.
    expect(classifySessionError('spawn claude ENOENT')).toBe('cli_missing');
    expect(classifySessionError(CLI_MISSING)).toBe('cli_missing');
    expect(classifySessionError('error_during_execution')).toBe('unknown');
  });
});


function healthyCodexRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'studio-codex-probe-'));
  for (const name of ['codex', 'codex-code-mode-host']) {
    const path = join(root, name);
    writeFileSync(path, '#!/bin/sh\n');
    chmodSync(path, 0o755);
  }
  return root;
}

describe('connectionStatusFromSetup', () => {
  it('maps the two states that have codex-specific copy', () => {
    expect(connectionStatusFromSetup('ready')).toBe('ok');
    expect(connectionStatusFromSetup('signed-out')).toBe('unauthenticated');
  });

  it('collapses the three unusable-runtime states onto one banner', () => {
    expect(connectionStatusFromSetup('failed')).toBe('cli_missing');
    expect(connectionStatusFromSetup('broken')).toBe('cli_missing');
    expect(connectionStatusFromSetup('unsupported')).toBe('cli_missing');
  });

  it('reports in-flight setup as unknown, which draws no banner', () => {
    for (const status of ['checking', 'downloading', 'validating', 'signing-in'] as const) {
      expect(connectionStatusFromSetup(status)).toBe('unknown');
    }
  });

  it('has no answer for idle, so disk decides', () => {
    expect(connectionStatusFromSetup('idle')).toBeUndefined();
  });
});

describe('probeCodexInstall', () => {
  it('passes a healthy install', () => {
    expect(probeCodexInstall(healthyCodexRoot())).toEqual({ status: 'ok', harness: 'codex' });
  });

  it('refuses an install missing the sibling that fails silently', () => {
    const root = mkdtempSync(join(tmpdir(), 'studio-codex-probe-'));
    const bin = join(root, 'codex');
    writeFileSync(bin, '#!/bin/sh\n');
    chmodSync(bin, 0o755);

    const answer = probeCodexInstall(root);
    expect(answer.status).toBe('cli_missing');
    expect(answer.harness).toBe('codex');
    expect(answer.detail).toContain('codex-code-mode-host');
  });

  it('reports no located install rather than throwing', () => {
    expect(probeCodexInstall(undefined).status).toBe('cli_missing');
  });
});

describe('probeCodexConnection', () => {
  it('prefers a definite setup verdict over disk', () => {
    expect(probeCodexConnection('signed-out', healthyCodexRoot())).toEqual({
      status: 'unauthenticated',
      harness: 'codex',
    });
  });

  it('falls through to disk when setup has not run this launch', () => {
    expect(probeCodexConnection('idle', healthyCodexRoot()).status).toBe('ok');
    expect(probeCodexConnection(undefined, healthyCodexRoot()).status).toBe('ok');
  });

  it('always says which runtime it answered for', () => {
    for (const setup of ['ready', 'signed-out', 'broken', 'idle', undefined] as const) {
      expect(probeCodexConnection(setup, undefined).harness).toBe('codex');
    }
  });
});

describe('shareInFlight', () => {
  function countedWork(): { start: () => Promise<number>; starts: () => number } {
    let starts = 0;
    return {
      starts: () => starts,
      start: () => {
        starts += 1;
        const mine = starts;
        return new Promise<number>((resolve) => setTimeout(() => resolve(mine), 10));
      },
    };
  }

  it('runs the work ONCE when a second caller arrives mid-flight', async () => {
    const slot: InFlight<number> = {};
    const work = countedWork();

    const first = shareInFlight(slot, work.start);
    const second = shareInFlight(slot, work.start);

    // Both resolving to 1 is true of the broken shape too; the count is the discriminating assertion.
    expect(work.starts()).toBe(1);
    expect(await first).toBe(1);
    expect(await second).toBe(1);
    expect(first).toBe(second);
  });

  it('starts fresh work once the first has settled', async () => {
    const slot: InFlight<number> = {};
    const work = countedWork();

    expect(await shareInFlight(slot, work.start)).toBe(1);
    expect(await shareInFlight(slot, work.start)).toBe(2);
    expect(work.starts()).toBe(2);
  });

  it('clears the slot when the work REJECTS, not only when it resolves', async () => {
    const slot: InFlight<number> = {};
    let starts = 0;
    const start = (): Promise<number> => {
      starts += 1;
      return starts === 1 ? Promise.reject(new Error('probe blew up')) : Promise.resolve(7);
    };

    expect(await outcome(shareInFlight(slot, start))).toThrow('probe blew up');
    expect(slot.current).toBeUndefined();
    expect(await shareInFlight(slot, start)).toBe(7);
  });
});

describe('probeMemo (ONL-2080)', () => {
  it('holds a settled verdict when the request is not fresh', () => {
    const settled = { status: 'unauthenticated', detail: 'Not logged in' } as const;
    expect(probeMemo(settled, {})).toBe(settled);
    expect(probeMemo({ status: 'ok' }, { fresh: false })).toEqual({ status: 'ok' });
  });

  it('is the one write back to unknown, from any status', () => {
    for (const status of ['ok', 'unauthenticated', 'cli_missing', 'error'] as const) {
      expect(probeMemo({ status }, { fresh: true })).toEqual({ status: 'unknown' });
    }
  });
});
