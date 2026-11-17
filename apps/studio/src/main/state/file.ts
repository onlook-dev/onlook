import { readFileSync } from 'node:fs';
import { removeAtomicFile, writeAtomicFile } from '../fs-atomic.js';

export interface StateFileFormat {
  inline?: boolean;
  versionKey?: 'version' | 'schemaVersion';
}

export type StateFileRead =
  | { kind: 'missing' }
  | { kind: 'future'; version: number; data: unknown }
  | { kind: 'data'; version: number; data: unknown };

export function decodeStateFile(parsed: unknown, supportedVersion: number, format: StateFileFormat = {}): Exclude<StateFileRead, { kind: 'missing' }> {
  const record = typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : undefined;
  const rawVersion = record?.[format.versionKey ?? 'version'];
  const version = typeof rawVersion === 'number' ? rawVersion : 0;
  const data = record !== undefined && !format.inline && 'data' in record && typeof rawVersion === 'number' ? record['data'] : parsed;
  if (version > supportedVersion) return { kind: 'future', version, data };
  return { kind: 'data', version, data };
}

export function readStateFile(path: string, supportedVersion: number, format: StateFileFormat = {}): StateFileRead {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { kind: 'missing' };
    throw error;
  }
  return decodeStateFile(JSON.parse(raw) as unknown, supportedVersion, format);
}

export function canWriteStateFile(path: string, supportedVersion: number, format: StateFileFormat = {}): boolean {
  try {
    return readStateFile(path, supportedVersion, format).kind !== 'future';
  } catch (error) {
    if (error instanceof SyntaxError) return true;
    throw error;
  }
}

export function encodeStateFile(version: number, data: unknown, format: StateFileFormat = {}): string {
  const value = format.inline ? { ...data as Record<string, unknown>, [format.versionKey ?? 'version']: version } : { version, data };
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function writeStateFile(path: string, version: number, data: unknown, format: StateFileFormat = {}): boolean {
  if (!canWriteStateFile(path, version, format)) return false;
  writeAtomicFile(path, encodeStateFile(version, data, format), { mode: 0o600 });
  return true;
}

export function eraseStateFile(path: string, version: number, format: StateFileFormat = {}): boolean {
  if (!canWriteStateFile(path, version, format)) return false;
  removeAtomicFile(path);
  return true;
}
