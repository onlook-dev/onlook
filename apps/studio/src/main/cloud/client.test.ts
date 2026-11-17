import { describe, expect, test } from 'bun:test';
import { createOnlookClient as createLocalOnlookClient } from './local.js';
import { statePublisher } from './client.js';
import { requireStudioTabSender } from '../tabs/sender.js';

describe('Onlook client boundary', () => {
  test('local stays inert without credentials, listeners or a backend', async () => {
    const client = createLocalOnlookClient();
    let updates = 0;
    client.subscribe(() => { updates += 1; });
    client.start();
    client.setSession(true);
    await client.signIn('email');
    await client.signOut();
    await client.deleteAccount();
    expect(client.snapshot()).toEqual({ revision: 0, session: 'local', connection: 'idle', me: null, profile: null });
    expect(updates).toBe(0);
    expect(await client.teamCommand({ type: 'refresh' })).toEqual({ ok: false, error: 'unavailable' });
    await client.close();
  });

  test('team lists advance the shared revision for every open Tab', () => {
    const publisher = statePublisher({ revision: 0, session: 'signed-in', connection: 'connected', me: null, profile: null });
    const first: number[] = [];
    const second: number[] = [];
    publisher.subscribe((state) => first.push(state.teams?.members.length ?? 0));
    publisher.subscribe((state) => second.push(state.teams?.members.length ?? 0));
    publisher.publish({ teams: { activeId: 'team', workspaces: [], members: [{ id: 'membership', userId: 'user', role: 'admin', status: 'active' }], invitations: [], loading: false, error: null } });
    expect(first).toEqual([1]);
    expect(second).toEqual([1]);
    expect(publisher.snapshot().revision).toBe(1);
  });

  test('one revisioned snapshot fans out to all subscribers and unsubscribes', () => {
    const publisher = statePublisher({ revision: 0, session: 'signed-out', connection: 'idle', me: null, profile: null });
    const first: number[] = [];
    const second: number[] = [];
    const stop = publisher.subscribe((state) => first.push(state.revision));
    publisher.subscribe((state) => second.push(state.revision));
    publisher.publish({ session: 'signed-in', connection: 'connecting', me: null });
    stop();
    publisher.publish({ session: 'signed-out', connection: 'idle', me: null });
    expect(first).toEqual([1]);
    expect(second).toEqual([1, 2]);
    expect(publisher.snapshot().revision).toBe(2);
  });

  test('only known top-level renderers can read or change the session', () => {
    const frame = {};
    const tab = { id: 1, mainFrame: frame, isDestroyed: () => false };
    expect(() => requireStudioTabSender({ sender: tab, senderFrame: frame }, [tab])).not.toThrow();
    expect(() => requireStudioTabSender({ sender: tab, senderFrame: {} }, [tab])).toThrow();
    expect(() => requireStudioTabSender({ sender: { ...tab }, senderFrame: frame }, [tab])).toThrow();
    expect(() => requireStudioTabSender({ sender: { ...tab, isDestroyed: () => true }, senderFrame: frame }, [])).toThrow();
  });

  test('retains snapshot identity and revision when projected state has not changed', () => {
    const publisher = statePublisher({ revision: 4, session: 'signed-in', connection: 'offline', me: null, profile: null });
    const original = publisher.snapshot();
    let updates = 0;
    publisher.subscribe(() => { updates += 1; });
    publisher.publish({ session: 'signed-in', connection: 'offline', me: null });
    expect(publisher.snapshot()).toBe(original);
    expect(updates).toBe(0);
  });

  test('publishes a profile by value, so a rebuilt but equal one stays silent', () => {
    const publisher = statePublisher({ revision: 0, session: 'signed-in', connection: 'connected', me: null, profile: null });
    const revisions: number[] = [];
    publisher.subscribe((state) => revisions.push(state.revision));
    publisher.publish({ profile: { name: 'Designer', email: 'designer@onlook.test', picture: null } });
    publisher.publish({ profile: { name: 'Designer', email: 'designer@onlook.test', picture: null } });
    publisher.publish({ profile: { name: 'Designer', email: 'designer@onlook.test', picture: 'data:image/png;base64,AAA' } });
    expect(revisions).toEqual([1, 2]);
    expect(publisher.snapshot().profile?.picture).toBe('data:image/png;base64,AAA');
  });

});
