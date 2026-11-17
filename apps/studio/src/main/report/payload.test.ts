import { describe, expect, it } from 'bun:test';
import { REPORT_MESSAGE_MAX, type ReportSubmitRequest, type StudioIdentity } from '@studio/events';
import { composeReport } from './payload.js';

const INSTALL_ID = '11111111-2222-3333-4444-555555555555';

function request(over: Partial<ReportSubmitRequest> = {}): ReportSubmitRequest {
  return { lane: 'bug', entryPoint: 'menu', message: 'the canvas froze', ...over };
}

describe('the report a user sends', () => {
  it('attributes feedback to the saved email and verified account without copying other identity fields', () => {
    const identity: StudioIdentity = {
      email: 'designer@onlook.test',
      source: 'provider',
      subject: 'user_designer',
      name: 'Designer',
      pictureUrl: 'https://example.test/avatar',
      previousSubject: 'legacy-user',
    };
    const composed = composeReport(request(), INSTALL_ID, identity);

    expect(composed).toEqual({
      ok: true,
      properties: {
        lane: 'bug',
        entry_point: 'menu',
        install_id: INSTALL_ID,
        message: 'the canvas froze',
        email: 'designer@onlook.test',
        account_id: 'user_designer',
        $geoip_disable: true,
        $ip: null,
      },
    });
  });

  it('includes contact email for manual and legacy identities without inventing a verified account', () => {
    for (const identity of [
      { email: 'manual@onlook.test', source: 'manual', subject: 'untrusted' },
      { email: 'legacy@onlook.test', source: 'provider' },
    ] satisfies StudioIdentity[]) {
      const composed = composeReport(request(), INSTALL_ID, identity);

      expect(composed.ok).toBe(true);
      if (!composed.ok) return;
      expect(composed.properties.email).toBe(identity.email);
      expect(composed.properties).not.toHaveProperty('account_id');
    }
  });

  it('ignores renderer-supplied attribution in favor of the main-process identity', () => {
    const spoofed = { ...request(), email: 'spoofed@onlook.test', account_id: 'spoofed' };
    const identity: StudioIdentity = {
      email: 'real@onlook.test', source: 'provider', subject: 'real-account',
    };
    const composed = composeReport(spoofed, INSTALL_ID, identity);

    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.properties.email).toBe(identity.email);
    expect(composed.properties.account_id).toBe(identity.subject);
    const anonymous = composeReport(spoofed, INSTALL_ID, null);
    expect(anonymous.ok).toBe(true);
    if (!anonymous.ok) return;
    expect(anonymous.properties).not.toHaveProperty('email');
    expect(anonymous.properties).not.toHaveProperty('account_id');
  });

  it('carries exactly the declared keys, the words verbatim, and nothing of the project', () => {
    const composed = composeReport(request({ message: '  /Users/me/app broke  ' }), INSTALL_ID);

    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(Object.keys(composed.properties).sort()).toEqual([
      '$geoip_disable',
      '$ip',
      'entry_point',
      'install_id',
      'lane',
      'message',
    ]);
    expect(composed.properties.message).toBe('/Users/me/app broke');
    expect(composed.properties.install_id).toBe(INSTALL_ID);
  });

  it('keeps the location and the network address off the event', () => {
    const composed = composeReport(request(), INSTALL_ID);

    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.properties.$geoip_disable).toBe(true);
    expect(composed.properties.$ip).toBe(null);
  });

  it('refuses an empty message and a whitespace-only message identically', () => {
    for (const message of ['', '   \n\t  ']) {
      expect(composeReport(request({ message }), INSTALL_ID)).toEqual({
        ok: false,
        reason: 'empty',
      });
    }
  });

  it('takes a message at the bound and refuses one past it, measured after the trim', () => {
    const atBound = 'x'.repeat(REPORT_MESSAGE_MAX);

    expect(composeReport(request({ message: `  ${atBound}  ` }), INSTALL_ID).ok).toBe(true);
    expect(composeReport(request({ message: `${atBound}x` }), INSTALL_ID)).toEqual({
      ok: false,
      reason: 'too-long',
    });
  });

  it('passes the lane and the entry point through as the enumerated ids', () => {
    const composed = composeReport(request({ lane: 'feature', entryPoint: 'canvas' }), INSTALL_ID);

    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(composed.properties.lane).toBe('feature');
    expect(composed.properties.entry_point).toBe('canvas');
  });

  it('refuses anything the form could not have produced', () => {
    const refusals: unknown[] = [
      { ...request(), lane: 'crash' },
      { ...request(), entryPoint: 'terminal' },
      { ...request(), message: 42 },
      undefined,
      'the canvas froze',
    ];

    for (const malformed of refusals) {
      expect(composeReport(malformed, INSTALL_ID)).toEqual({ ok: false, reason: 'malformed' });
    }
  });

  it('drops a property the request carries beyond the three it declares', () => {
    const smuggled = {
      ...request(),
      projectPath: '/Users/someone/code/secret-app',
      tabTitle: 'secret-app',
    };

    const composed = composeReport(smuggled, INSTALL_ID);

    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    expect(Object.keys(composed.properties).sort()).toEqual(
      ['$geoip_disable', '$ip', 'entry_point', 'install_id', 'lane', 'message'].sort(),
    );
  });
});
