import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { CLAUDE_SHIM_SOURCE } from './shim-source.js';

export type ClaudeShimAuthState = 'signed-in' | 'signed-out' | 'failed';
export type ClaudeShimLogin = 'loopback' | 'paste-accept' | 'paste-invalid' | 'server-reject';

export interface ClaudeShimState {
  state: ClaudeShimAuthState;
  email?: string;
  plan?: string;
}

export interface ClaudeShimOptions {
  state?: ClaudeShimAuthState;
  email?: string;
  plan?: string;
  login?: ClaudeShimLogin;
}

export interface ClaudeShimEnv {
  STUDIO_CLAUDE_BIN: string;
  STUDIO_CLAUDE_SHIM_STATE: string;
  STUDIO_CLAUDE_SHIM_LOGIN: ClaudeShimLogin;
  STUDIO_CLAUDE_OPEN: '0';
}

export interface ClaudeShim {
  bin: string;
  statePath: string;
  loginLog: string;
  env: ClaudeShimEnv;
}

export function writeClaudeShim(stateRoot: string, opts: ClaudeShimOptions = {}): ClaudeShim {
  const dir = join(stateRoot, 'claude-shim');
  mkdirSync(dir, { recursive: true });
  const bin = join(dir, 'claude.mjs');
  const statePath = join(dir, 'state.json');
  const loginLog = claudeShimLoginLog(statePath);
  // The writer's own execPath: a PATH `node` is not guaranteed where the app launches the shim.
  writeFileSync(bin, `#!${process.execPath}\n${CLAUDE_SHIM_SOURCE}`);
  chmodSync(bin, 0o755);
  rmSync(loginLog, { force: true });
  setClaudeShimState(statePath, {
    state: opts.state ?? 'signed-out',
    ...(opts.email === undefined ? {} : { email: opts.email }),
    ...(opts.plan === undefined ? {} : { plan: opts.plan }),
  });
  return {
    bin,
    statePath,
    loginLog,
    env: {
      STUDIO_CLAUDE_BIN: bin,
      STUDIO_CLAUDE_SHIM_STATE: statePath,
      STUDIO_CLAUDE_SHIM_LOGIN: opts.login ?? 'loopback',
      STUDIO_CLAUDE_OPEN: '0',
    },
  };
}

export function setClaudeShimState(statePath: string, state: ClaudeShimState): void {
  writeFileSync(statePath, JSON.stringify(state));
}

export function readClaudeShimState(statePath: string): ClaudeShimState {
  return JSON.parse(readFileSync(statePath, 'utf8')) as ClaudeShimState;
}

function claudeShimLoginLog(statePath: string): string {
  return join(dirname(statePath), 'login.log');
}

export function claudeShimLogins(statePath: string): number {
  const log = claudeShimLoginLog(statePath);
  if (!existsSync(log)) return 0;
  return readFileSync(log, 'utf8').split('\n').filter((line) => line.length > 0).length;
}
