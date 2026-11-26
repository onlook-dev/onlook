import { describe, expect, it } from 'bun:test';
import type { ServerEntryState } from '@studio/events';
import { startControlShown, type StartControlFacts } from './toolbarRunControl.js';

const BLANK: StartControlFacts = { isOn: true, isBlankProject: true, isImportSettingUp: false, hasBeenUp: false, serverEntries: [], hasFrames: false, isCreating: false };
const IMPORTING: StartControlFacts = { ...BLANK, isBlankProject: false, isImportSettingUp: true };

function stoppedServer(overrides: Partial<ServerEntryState> = {}): ServerEntryState {
  return {
    entryId: 'app-server',
    folderName: 'app',
    ownership: 'studio-started',
    status: 'stopped',
    ports: [{ port: 3000, origin: 'http://localhost:3000', measured: 'unverified', everLive: true }],
    everMeasuredLive: true,
    ...overrides,
  };
}

describe('whether the toolbar shows Start (ONL-2960)', () => {
  it('always shows it with start-control off, as main does', () => {
    expect(startControlShown({ ...BLANK, isOn: false })).toBe(true);
    expect(startControlShown({ ...IMPORTING, isOn: false })).toBe(true);
  });

  it('hides it while a new draft or an import sets up', () => {
    expect(startControlShown(BLANK)).toBe(false);
    expect(startControlShown(IMPORTING)).toBe(false);
  });

  it('shows it once the app is first up', () => {
    expect(startControlShown({ ...BLANK, hasBeenUp: true })).toBe(true);
    expect(startControlShown({ ...IMPORTING, hasBeenUp: true })).toBe(true);
  });

  it('keeps it after the server stops, since the app was up once', () => {
    expect(startControlShown({ ...BLANK, hasBeenUp: true, isImportSettingUp: true })).toBe(true);
  });

  it('shows it on a project that is not setting up', () => {
    expect(startControlShown({ ...IMPORTING, isImportSettingUp: false })).toBe(true);
  });

  it('shows it on an established blank project after a fresh launch, before its port is verified', () => {
    expect(startControlShown({ ...BLANK, serverEntries: [stoppedServer()] })).toBe(true);
  });

  it('shows it for restored blank-project frames even when no server claims were saved', () => {
    expect(startControlShown({ ...BLANK, hasFrames: true })).toBe(true);
  });

  it('does not reveal it for frames added during a new draft or import setup', () => {
    expect(startControlShown({ ...BLANK, hasFrames: true, isCreating: true })).toBe(false);
    expect(startControlShown({ ...IMPORTING, hasFrames: true, isCreating: true })).toBe(false);
  });

  it('keeps it available when an established project is stopped, restarting or its old port serves another app', () => {
    for (const ownership of ['studio-started', 'agent-started', 'unknown'] as const) {
      for (const status of ['stopped', 'starting'] as const) {
        for (const measured of ['dead', 'stranger', 'unverified'] as const) {
          const server = stoppedServer({ ownership, status, ports: [{ port: 3000, origin: 'http://localhost:3000', measured, everLive: true }] });
          expect(startControlShown({ ...BLANK, serverEntries: [server] })).toBe(true);
        }
      }
    }
  });

  it('keeps it available when an established import sets up again after a relaunch', () => {
    expect(startControlShown({ ...IMPORTING, serverEntries: [stoppedServer()] })).toBe(true);
  });

  it('does not reveal it during initial setup before an owned server has ever been live', () => {
    const server = stoppedServer({ status: 'starting', everMeasuredLive: false, ports: [] });
    expect(startControlShown({ ...BLANK, serverEntries: [server] })).toBe(false);
    expect(startControlShown({ ...IMPORTING, serverEntries: [server] })).toBe(false);
  });

  it('does not count a server in the user checkout as the project having been up', () => {
    const server = stoppedServer({ ownership: 'users-own' });
    expect(startControlShown({ ...BLANK, serverEntries: [server] })).toBe(false);
    expect(startControlShown({ ...IMPORTING, serverEntries: [server] })).toBe(false);
  });
});
