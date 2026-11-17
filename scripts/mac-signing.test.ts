import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { assertMacSigningIdentity, MAC_APP_ID, MAC_TEAM_ID } from './mac-signing.js';

const signature = 'Identifier=com.onlook.studio\nTeamIdentifier=WLQ3KTS8SZ\ndesignated => identifier "com.onlook.studio" and anchor apple generic and certificate 1[field.1.2.840.113635.100.6.2.6] and certificate leaf[field.1.2.840.113635.100.6.1.13] and certificate leaf[subject.OU] = WLQ3KTS8SZ';

describe('macOS release signing continuity', () => {
  it('keeps the builder app identifier aligned with the established signed app', () => {
    const config = readFileSync(new URL('../apps/studio/electron-builder.official.yml', import.meta.url), 'utf8');
    expect(config.match(/^appId:\s*([^\s]+)\s*$/m)?.[1]).toBe('com.onlook.studio');
  });

  it('accepts the stable signing requirement and codesign comment formatting', () => {
    expect(() => assertMacSigningIdentity(signature)).not.toThrow();
    expect(() => assertMacSigningIdentity(signature.replace(' and certificate leaf[', ' /* exists */ and certificate leaf['))).not.toThrow();
  });

  it('rejects another team, app identifier, ad-hoc signature or build-specific requirement', () => {
    for (const changed of [
      signature.replaceAll(MAC_TEAM_ID, 'OTHERTEAM1'),
      signature.replaceAll(MAC_APP_ID, `${MAC_APP_ID}.alpha`),
      `Identifier=${MAC_APP_ID}\nSignature=adhoc\nTeamIdentifier=not set\ndesignated => cdhash H"1234"`,
      `${signature} and cdhash H"1234"`,
      `Identifier=${MAC_APP_ID}\nTeamIdentifier=${MAC_TEAM_ID}`,
    ]) expect(() => assertMacSigningIdentity(changed)).toThrow('signing identity changed');
  });
});
