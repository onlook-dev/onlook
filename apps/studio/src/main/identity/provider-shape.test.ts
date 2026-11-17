import { describe, expect, it } from 'bun:test';
import type { OnlookState, StudioIdentity } from '@studio/events';
import { neutralState, type ProviderIdentity, type ProviderState } from './provider-shape.js';
import { decodeVendorRecord, neutralIdentity, usesVendorNames, vendorIdentity } from './store.js';

const NEUTRAL: StudioIdentity = { email: 'wren@example.com', name: 'Wren', source: 'provider', subject: 'user_01WREN', previousSubject: 'seed_wren', pictureUrl: 'https://pictures.example.com/wren.png' };
const VENDOR: ProviderIdentity = { email: 'wren@example.com', name: 'Wren', source: 'workos', workosUserId: 'user_01WREN', workosExternalId: 'seed_wren', pictureUrl: 'https://pictures.example.com/wren.png' };

describe('identity a provider hands over', () => {
  it('is the same record whichever names it came in', () => {
    expect(neutralIdentity(VENDOR)).toEqual(NEUTRAL);
    expect(neutralIdentity(NEUTRAL)).toEqual(NEUTRAL);
    expect(usesVendorNames(VENDOR)).toBe(true);
    expect(usesVendorNames(NEUTRAL)).toBe(false);
  });

  it('keeps every field through the vendor names and back', () => {
    expect(vendorIdentity(NEUTRAL)).toEqual(VENDOR);
    expect(Object.keys(vendorIdentity(NEUTRAL))).toEqual(['email', 'name', 'source', 'workosUserId', 'workosExternalId', 'pictureUrl']);
    expect(neutralIdentity(vendorIdentity(NEUTRAL))).toEqual(NEUTRAL);
    const typed: StudioIdentity = { email: 'typed@example.com', source: 'manual' };
    expect(neutralIdentity(vendorIdentity(typed))).toEqual(typed);
  });

  it('carries nothing a provider added beside the fields, and trusts no source it does not know', () => {
    const smuggled = { ...VENDOR, accessToken: 'secret' } as ProviderIdentity;
    expect(neutralIdentity(smuggled)).toEqual(NEUTRAL);
    expect(neutralIdentity({ email: 'x@example.com', source: 'sso' as 'provider' }).source).toBe('manual');
  });

  it('reads a legacy record only in the shape a release wrote', () => {
    expect(decodeVendorRecord(VENDOR)).toEqual(NEUTRAL);
    expect(decodeVendorRecord({ email: 'old@example.com', source: 'workos' })).toEqual({ email: 'old@example.com', source: 'provider' });
    expect(decodeVendorRecord({ email: '', source: 'workos' })).toBeNull();
    expect(decodeVendorRecord({ email: 'x@example.com', source: 'provider' })).toBeNull();
    expect(decodeVendorRecord({ email: 'x@example.com', source: 'workos', workosUserId: 7 })).toBeNull();
    expect(decodeVendorRecord(null)).toBeNull();
  });
});

describe('account state a provider publishes', () => {
  const base = { revision: 1, session: 'signed-in', connection: 'connected', profile: null } as const;
  const vendor: ProviderState = { ...base, me: { user: { id: 'row_1', workosUserId: 'user_01WREN', email: 'wren@example.com', createdAt: 5 }, orgId: 'org_1', role: 'admin' } };
  const neutral: OnlookState = { ...base, me: { user: { id: 'row_1', subject: 'user_01WREN', email: 'wren@example.com', createdAt: 5 }, orgId: 'org_1', role: 'admin' } };

  it('names the account the same way whichever names the provider used', () => {
    expect(neutralState(vendor)).toEqual(neutral);
    expect(neutralState(vendor).me?.user).not.toHaveProperty('workosUserId');
    expect(neutralState(neutral)).toBe(neutral);
  });

  it('answers by reference, so an unchanged provider state is not a change', () => {
    expect(neutralState(vendor)).toBe(neutralState(vendor));
    const republished: ProviderState = { ...vendor, connection: 'offline' };
    expect(neutralState(republished)).not.toBe(neutralState(vendor));
    expect(neutralState(republished).me).toBe(neutralState(vendor).me);
    const signedOut: ProviderState = { ...base, me: null };
    expect(neutralState(signedOut)).toBe(signedOut as OnlookState);
  });
});
