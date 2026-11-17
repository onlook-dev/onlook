import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { StudioIdentity } from '@studio/events';
import { canWriteStateFile, eraseStateFile, readStateFile, writeStateFile } from '../state/file.js';
import { usesDevelopmentNames } from '../state/build.js';
import { stateRoot } from '../state/root.js';
import type { ProviderIdentity } from './provider-shape.js';

// Beside the credentials they describe: a shared record let one build answer with the other's account (ONL-2882).
function accountPath(): string {
  return join(stateRoot(), usesDevelopmentNames() ? 'account-development.json' : 'account.json');
}

/** The only record a build before `account.json` reads or writes, kept current so that build still opens signed in. */
function legacyPath(): string {
  return join(stateRoot(), usesDevelopmentNames() ? 'identity-development.json' : 'identity.json');
}

const optionalString = (value: unknown): boolean => value === undefined || typeof value === 'string';

export function usesVendorNames(identity: ProviderIdentity): boolean {
  return identity.source === 'workos' || identity.workosUserId !== undefined || identity.workosExternalId !== undefined;
}

// Field by field: a provider compiles elsewhere, so a spread would carry whatever else it sent into the record.
export function neutralIdentity(identity: ProviderIdentity): StudioIdentity {
  const subject = identity.subject ?? identity.workosUserId;
  const previousSubject = identity.previousSubject ?? identity.workosExternalId;
  return {
    email: identity.email,
    ...(identity.name !== undefined ? { name: identity.name } : {}),
    // Anything unrecognised is self-asserted: only the two verified names earn `provider`.
    source: identity.source === 'provider' || identity.source === 'workos' ? 'provider' : 'manual',
    ...(subject !== undefined ? { subject } : {}),
    ...(previousSubject !== undefined ? { previousSubject } : {}),
    ...(identity.pictureUrl !== undefined ? { pictureUrl: identity.pictureUrl } : {}),
  };
}

/** The record as every build before the neutral one writes and reads it, key for key. */
export function vendorIdentity(identity: StudioIdentity): ProviderIdentity {
  return {
    email: identity.email,
    ...(identity.name !== undefined ? { name: identity.name } : {}),
    source: identity.source === 'provider' ? 'workos' : 'manual',
    ...(identity.subject !== undefined ? { workosUserId: identity.subject } : {}),
    ...(identity.previousSubject !== undefined ? { workosExternalId: identity.previousSubject } : {}),
    ...(identity.pictureUrl !== undefined ? { pictureUrl: identity.pictureUrl } : {}),
  };
}

export function decodeVendorRecord(value: unknown): StudioIdentity | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const valid = typeof record['email'] === 'string'
    && record['email'].length > 0
    && (record['source'] === 'workos' || record['source'] === 'manual')
    && optionalString(record['name'])
    && optionalString(record['workosUserId'])
    && optionalString(record['workosExternalId'])
    && optionalString(record['pictureUrl']);
  return valid ? neutralIdentity(record as unknown as ProviderIdentity) : null;
}

// null: nothing on disk; undefined: not read yet. A negative answer is cached too.
let cache: StudioIdentity | null | undefined;

interface AccountRecord {
  identity: StudioIdentity;
  /** Whether the write also left the legacy file, so its absence later is an older build's sign-out. */
  mirrored: boolean;
}

function decodeAccount(value: unknown): AccountRecord | null {
  if (typeof value !== 'object' || value === null) return null;
  const { identity, mirrored } = value as Record<string, unknown>;
  if (typeof identity !== 'object' || identity === null) return null;
  const record = identity as Record<string, unknown>;
  const valid = typeof record['email'] === 'string'
    && record['email'].length > 0
    && (record['source'] === 'provider' || record['source'] === 'manual')
    && optionalString(record['name'])
    && optionalString(record['subject'])
    && optionalString(record['previousSubject'])
    && optionalString(record['pictureUrl']);
  return valid ? { identity: neutralIdentity(record as unknown as StudioIdentity), mirrored: mirrored === true } : null;
}

type Stored<Value> = { kind: 'missing' } | { kind: 'unreadable' } | { kind: 'record'; value: Value };

function readRecord<Value>(path: string, decode: (data: unknown) => Value | null): Stored<Value> {
  try {
    const file = readStateFile(path, 1);
    if (file.kind === 'missing') return { kind: 'missing' };
    const value = file.kind === 'data' ? decode(file.data) : null;
    return value === null ? { kind: 'unreadable' } : { kind: 'record', value };
  } catch {
    return { kind: 'unreadable' };
  }
}

function sameRecord(a: StudioIdentity, b: StudioIdentity): boolean {
  return a.email === b.email && a.name === b.name && a.source === b.source
    && a.subject === b.subject && a.previousSubject === b.previousSubject && a.pictureUrl === b.pictureUrl;
}

function resolveIdentity(): StudioIdentity | null {
  const account = readRecord(accountPath(), decodeAccount);
  const legacy = readRecord(legacyPath(), decodeVendorRecord);
  if (account.kind !== 'record') return legacy.kind === 'record' ? legacy.value : null;
  // Every write here leaves the two alike, so a legacy record that differs was written since by an older build, for the session it left.
  if (legacy.kind === 'record') return sameRecord(account.value.identity, legacy.value) ? account.value.identity : legacy.value;
  // An older build signs out by erasing the only file it knows.
  if (legacy.kind === 'missing' && account.value.mirrored) return null;
  return account.value.identity;
}

/** Never writes: a build older than `account.json` may still be reading the legacy file it finds. */
export function readIdentity(): StudioIdentity | null {
  if (cache === undefined) cache = resolveIdentity();
  return cache;
}

/** Answers in the names it was handed, so a provider built on the vendor's reads back what it wrote. */
export function writeIdentity(identity: StudioIdentity): StudioIdentity;
export function writeIdentity(identity: ProviderIdentity): ProviderIdentity;
export function writeIdentity(identity: ProviderIdentity): ProviderIdentity {
  const neutral = neutralIdentity(identity);
  // Replaces wholesale: a manual write carries no subject over from the prior record.
  const next: StudioIdentity = { ...neutral, email: neutral.email.trim().toLowerCase() };
  if (!canWriteStateFile(legacyPath(), 1) || !canWriteStateFile(accountPath(), 1)) throw new Error('identity_version_unsupported');
  // Legacy first: a write torn between the two leaves the pair the read already settles in the legacy file's favour.
  writeStateFile(legacyPath(), 1, vendorIdentity(next));
  writeStateFile(accountPath(), 1, { identity: next, mirrored: true } satisfies AccountRecord);
  cache = next;
  return usesVendorNames(identity) ? vendorIdentity(next) : next;
}

export function resetIdentityCache(): void {
  cache = undefined;
}

export function clearIdentity(): void {
  if (!canWriteStateFile(legacyPath(), 1) || !canWriteStateFile(accountPath(), 1)) throw new Error('identity_version_unsupported');
  // Legacy first: stopped between the two, what is left reads as signed out.
  eraseStateFile(legacyPath(), 1);
  eraseStateFile(accountPath(), 1);
  cache = null;
}

// On disk because telemetry's in-memory dedupe resets each launch and the person merge is irreversible.
function mergeMarkerPath(): string {
  return join(stateRoot(), 'posthog-merge-completed.json');
}

export function readMergeCompleted(): boolean {
  return existsSync(mergeMarkerPath());
}

// Throws: the caller merges only after the marker is written, so an unwritable disk fails closed.
export function markMergeCompleted(): void {
  if (!writeStateFile(mergeMarkerPath(), 1, { mergedAt: new Date().toISOString() })) {
    throw new Error('merge marker requires a newer Onlook build');
  }
}
