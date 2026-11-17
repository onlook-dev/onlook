import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'bun:test';
import { createOnlookClient, identity } from './local.js';

describe('cloud provider identity boundary', () => {
  it('the local provider never restores credentials or requests sign-in', async () => {
    expect(identity.enabled()).toBe(false);
    expect(identity.configured()).toBe(false);
    expect(identity.prepareSession()).toBeNull();
    expect(identity.hasSession()).toBe(false);
    expect(identity.signInStep()).toBeNull();
    await identity.refreshSession();
    identity.clearSession();
    identity.supersedeSignIn();
    identity.dispose();
    await expect(identity.signIn()).rejects.toThrow('not_configured');
    const client = createOnlookClient();
    client.start();
    expect(client.snapshot().session).toBe('local');
    expect(client.snapshot().me).toBeNull();
    await client.close();
  });

  it('the local provider bundles without token persistence, browser sign-in or encryption code', async () => {
    const result = await Bun.build({ entrypoints: [join(import.meta.dirname, 'local.ts')], target: 'node' });
    expect(result.success).toBe(true);
    const output = await result.outputs[0]!.text();
    for (const forbidden of ['safeStorage', 'workos-tokens', 'workos-session', 'refreshToken', 'WorkOS']) expect(output).not.toContain(forbidden);
  });

  it('main uses the token-free provider contract instead of a token adapter', () => {
    for (const file of ['index.ts', '../identity/ipc.ts', '../index.ts', '../tabs/host.ts']) {
      const source = readFileSync(join(import.meta.dirname, file), 'utf8');
      for (const forbidden of ['identity/workos', 'identity/tokens', 'readTokens(', 'writeTokens(', 'safeStorage', 'fetchAccessToken(']) expect(source).not.toContain(forbidden);
    }
    const contract = readFileSync(join(import.meta.dirname, 'client.ts'), 'utf8');
    for (const forbidden of ['accessToken', 'refreshToken', 'WorkOS', 'Convex', 'fetchToken']) expect(contract).not.toContain(forbidden);
    expect(contract).toContain('onSignInFailure?(method: OnlookSignInMethod, code: SignInFailureCode): void;');
    for (const file of ['local.ts', 'local-client.ts']) {
      expect(readFileSync(join(import.meta.dirname, file), 'utf8')).not.toContain('onSignInFailure');
    }
  });
});
