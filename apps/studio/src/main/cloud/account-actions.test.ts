import { describe, expect, test } from 'bun:test';
import { held } from '@studio/fixtures';
import { createAccountActions } from './account-actions.js';
import { AUTH_PROVIDER_ERROR_CODES } from '@studio/events';

describe('account actions', () => {
  test.each([...AUTH_PROVIDER_ERROR_CODES])('returns only the bounded provider code %s from sign-in', async (code) => {
    const outcomes: unknown[] = [];
    const actions = createAccountActions({ hasSession: () => true,
      signIn: async () => { throw new Error(code); }, signOut: async () => {}, deleteAccount: async () => {},
      clear: () => {}, supersede: () => {}, record: (_action, result) => { outcomes.push(result); },
    });
    expect(await actions.signIn('google')).toEqual({ ok: false, code });
    expect(outcomes).toEqual([{ ok: false, code }]);
  });

  test('records one bounded outcome per accepted action, including refusal and supersession', async () => {
    const signingIn = held();
    const outcomes: unknown[] = [];
    const actions = createAccountActions({ hasSession: () => true,
      signIn: signingIn.wait, signOut: async () => {},
      deleteAccount: async () => { throw { data: { code: 'last_admin', private: 'not recorded' } }; },
      clear: () => {}, supersede: () => {},
      record: (action, result, method) => { outcomes.push({ action, result, method }); },
    });
    const pending = actions.signIn('github');
    const retry = actions.signIn('email');
    await actions.signOut();
    signingIn.open();
    await pending;
    await retry;
    await actions.deleteAccount();
    expect(outcomes).toEqual([
      { action: 'sign-out', result: { ok: true }, method: undefined },
      { action: 'sign-in', result: { ok: false, code: 'superseded' }, method: 'github' },
      { action: 'sign-in', result: { ok: false, code: 'superseded' }, method: 'email' },
      { action: 'delete-account', result: { ok: false, code: 'last_admin' }, method: undefined },
    ]);
    expect(JSON.stringify(outcomes)).not.toContain('not recorded');
  });

  test('another Tab can replace an abandoned browser sign-in without waiting for its timeout', async () => {
    const original = held();
    const replacement = held();
    const methods: string[] = [];
    let supersessions = 0;
    const actions = createAccountActions({ hasSession: () => true,
      signIn: (method) => { methods.push(method); return method === 'google' ? original.wait() : replacement.wait(); },
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {},
      supersede: () => { supersessions += 1; },
    });
    const abandoned = actions.signIn('google');
    const retry = actions.signIn('github');
    expect(methods).toEqual(['google', 'github']);
    expect(supersessions).toBe(1);
    original.open();
    expect(await abandoned).toEqual({ ok: false, code: 'superseded' });
    replacement.open();
    expect(await retry).toEqual({ ok: true });
  });
  test('remote sign-out finishes before local credentials are cleared', async () => {
    const order: string[] = [];
    const actions = createAccountActions({ hasSession: () => true,
      signIn: async () => {},
      signOut: async () => { order.push('remote'); },
      deleteAccount: async () => {},
      supersede: () => { order.push('supersede'); },
      clear: () => { order.push('clear'); },
    });
    expect(await actions.signOut()).toEqual({ ok: true });
    expect(order).toEqual(['supersede', 'remote', 'clear']);
  });

  test('a failed remote action keeps credentials and sanitizes errors', async () => {
    let cleared = false;
    const actions = createAccountActions({ hasSession: () => true,
      signIn: async () => { throw new Error('denied'); },
      signOut: async () => { throw new Error('private response'); },
      deleteAccount: async () => { throw { data: { code: 'last_admin', message: 'private response' } }; },
      supersede: () => {}, clear: () => { cleared = true; },
    });
    expect(await actions.signIn('email')).toEqual({ ok: false, code: 'denied' });
    expect(await actions.signOut()).toEqual({ ok: false, code: 'failed' });
    expect(await actions.deleteAccount()).toEqual({ ok: false, code: 'last_admin' });
    expect(cleared).toBe(false);
  });

  test('sign-out supersedes browser sign-in and blocks another Tab until it completes', async () => {
    const signIn = held();
    const signOut = held();
    let clears = 0;
    const actions = createAccountActions({ hasSession: () => true,
      signIn: signIn.wait,
      signOut: signOut.wait,
      deleteAccount: async () => {}, supersede: () => {}, clear: () => { clears += 1; },
    });
    const signingIn = actions.signIn('google');
    const signingOut = actions.signOut();
    expect(await actions.signIn('github')).toEqual({ ok: false, code: 'busy' });
    signIn.open();
    expect(await signingIn).toEqual({ ok: false, code: 'superseded' });
    expect(await actions.signIn('email')).toEqual({ ok: false, code: 'busy' });
    signOut.open();
    expect(await signingOut).toEqual({ ok: true });
    expect(clears).toBe(1);
  });

  test.each([
    ['access_denied', 'access_denied'],
    ['timeout', 'failed'],
    ['exchange_failed', 'failed'],
    ['persist_failed', 'failed'],
    ['listener_failed', 'failed'],
  ] as const)('a sign-in refused with %s reports that code to telemetry while the renderer sees %s', async (thrown, narrowed) => {
    const accountActions: unknown[] = [];
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    const actions = createAccountActions({ hasSession: () => true,
      signIn: async () => { throw { data: { code: thrown, message: 'private response' } }; },
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      record: (action, result, method) => { accountActions.push({ action, outcome: result.ok ? 'ok' : result.code, method }); },
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    expect(await actions.signIn('github')).toEqual({ ok: false, code: narrowed });
    expect(accountActions).toEqual([{ action: 'sign-in', outcome: narrowed, method: 'github' }]);
    expect(failures).toEqual([{ method: 'github', code: thrown }]);
    expect(completions).toEqual([]);
    expect(JSON.stringify(failures)).not.toContain('private response');
  });

  test('a sign-in pressed while an account action is in flight reports busy and records no account action', async () => {
    const deleting = held();
    const accountActions: unknown[] = [];
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    const actions = createAccountActions({ hasSession: () => true,
      signIn: async () => {}, signOut: async () => {}, deleteAccount: deleting.wait,
      clear: () => {}, supersede: () => {},
      record: (action, result, method) => { accountActions.push({ action, outcome: result.ok ? 'ok' : result.code, method }); },
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    const deletion = actions.deleteAccount();
    expect(await actions.signIn('google')).toEqual({ ok: false, code: 'busy' });
    expect(failures).toEqual([{ method: 'google', code: 'busy' }]);
    expect(accountActions).toEqual([]);
    deleting.open();
    expect(await deletion).toEqual({ ok: true });
    expect(accountActions).toEqual([{ action: 'delete-account', outcome: 'ok', method: undefined }]);
    expect(completions).toEqual([]);
  });

  test('a second method pressed and a quit during an open sign-in report neither a completion nor a failure', async () => {
    const abandoning = held();
    const accountActions: unknown[] = [];
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    const actions = createAccountActions({ hasSession: () => true,
      signIn: async (method) => { if (method === 'google') return abandoning.wait(); throw new Error('teardown'); },
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      record: (action, result, method) => { accountActions.push({ action, outcome: result.ok ? 'ok' : result.code, method }); },
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    const abandoned = actions.signIn('google');
    expect(await actions.signIn('github')).toEqual({ ok: false, code: 'failed' });
    abandoning.open();
    expect(await abandoned).toEqual({ ok: false, code: 'superseded' });
    expect(accountActions).toEqual([
      { action: 'sign-in', outcome: 'failed', method: 'github' },
      { action: 'sign-in', outcome: 'superseded', method: 'google' },
    ]);
    expect(failures).toEqual([]);
    expect(completions).toEqual([]);
  });

  test('a completed sign-in records its account action and its completion, and no failure', async () => {
    const accountActions: unknown[] = [];
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    const actions = createAccountActions({ hasSession: () => true,
      signIn: async () => {}, signOut: async () => {}, deleteAccount: async () => {},
      clear: () => {}, supersede: () => {},
      record: (action, result, method) => { accountActions.push({ action, outcome: result.ok ? 'ok' : result.code, method }); },
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    expect(await actions.signIn('email')).toEqual({ ok: true });
    expect(await actions.signOut()).toEqual({ ok: true });
    expect(accountActions).toEqual([
      { action: 'sign-in', outcome: 'ok', method: 'email' },
      { action: 'sign-out', outcome: 'ok', method: undefined },
    ]);
    expect(completions).toEqual(['email']);
    expect(failures).toEqual([]);
  });

  test('a failure the provider absorbed is reported alone, and the press that resolved on no session reports no completion', async () => {
    const accountActions: unknown[] = [];
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    let actions!: ReturnType<typeof createAccountActions>;
    actions = createAccountActions({ hasSession: () => false,
      // The provider reports the failure and resolves the press anyway; no session is what says it signed nobody in.
      signIn: async (method) => { actions.noteSignInFailure(method, 'access_denied'); },
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      record: (action, result, method) => { accountActions.push({ action, outcome: result.ok ? 'ok' : result.code, method }); },
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    expect(await actions.signIn('github')).toEqual({ ok: false, code: 'failed' });
    expect(accountActions).toEqual([{ action: 'sign-in', outcome: 'failed', method: 'github' }]);
    expect(failures).toEqual([{ method: 'github', code: 'access_denied' }]);
    expect(completions).toEqual([]);
  });

  test('a press that resolves on no session with nothing reported reports the failure itself', async () => {
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    const actions = createAccountActions({ hasSession: () => false,
      // The provider resolves the press, says nothing, and signs nobody in.
      signIn: async () => {},
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    expect(await actions.signIn('github')).toEqual({ ok: false, code: 'failed' });
    expect(failures).toEqual([{ method: 'github', code: 'failed' }]);
    expect(completions).toEqual([]);
  });

  test('a provider that absorbs one code and rejects with another reports both, and the press is one account action', async () => {
    const accountActions: unknown[] = [];
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    let actions!: ReturnType<typeof createAccountActions>;
    actions = createAccountActions({ hasSession: () => false,
      signIn: async (method) => { actions.noteSignInFailure(method, 'radar_sms_challenge'); throw new Error('exchange_failed'); },
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      record: (action, result, method) => { accountActions.push({ action, outcome: result.ok ? 'ok' : result.code, method }); },
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    expect(await actions.signIn('google')).toEqual({ ok: false, code: 'failed' });
    // Two codes are two things the provider said; what counts the attempts is the account action beside them.
    expect(failures).toEqual([{ method: 'google', code: 'radar_sms_challenge' }, { method: 'google', code: 'exchange_failed' }]);
    expect(accountActions).toEqual([{ action: 'sign-in', outcome: 'failed', method: 'google' }]);
    expect(completions).toEqual([]);
  });

  test('a press whose own refusal follows a failure on another method still reports its own', async () => {
    const abandoning = held();
    const failures: unknown[] = [];
    let presses = 0;
    const actions = createAccountActions({ hasSession: () => false,
      signIn: () => (presses++ === 0 ? abandoning.wait() : Promise.reject(new Error('invalid_grant'))),
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      recordFailure: (method, code) => { failures.push({ method, code }); },
    });
    const abandoned = actions.signIn('google');
    // The abandoned Google flow reports while the GitHub press that replaced it is open.
    actions.noteSignInFailure('google', 'access_denied');
    expect(await actions.signIn('github')).toEqual({ ok: false, code: 'invalid_grant' });
    abandoning.open();
    expect(await abandoned).toEqual({ ok: false, code: 'superseded' });
    expect(failures).toEqual([{ method: 'google', code: 'access_denied' }, { method: 'github', code: 'invalid_grant' }]);
  });

  test.each([['before'], ['after']] as const)('an abandoned method’s failure landing %s the replacement press is reported alone, and that press still completes', async (when) => {
    const abandoning = held();
    const replacement = held();
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    const actions = createAccountActions({ hasSession: () => true,
      signIn: (method) => (method === 'google' ? abandoning.wait() : replacement.wait()),
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    const abandoned = actions.signIn('google');
    if (when === 'before') actions.noteSignInFailure('google', 'timeout');
    const retry = actions.signIn('github');
    // The abandoned browser flow reports late, while a press on another method is open.
    if (when === 'after') actions.noteSignInFailure('google', 'timeout');
    abandoning.open();
    expect(await abandoned).toEqual({ ok: false, code: 'superseded' });
    replacement.open();
    expect(await retry).toEqual({ ok: true });
    expect(failures).toEqual([{ method: 'google', code: 'timeout' }]);
    expect(completions).toEqual(['github']);
  });

  test('an absorbed failure is reported even when the press it interrupted never resolves', async () => {
    const never = held();
    const failures: unknown[] = [];
    const actions = createAccountActions({ hasSession: () => true,
      signIn: never.wait, signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      recordFailure: (method, code) => { failures.push({ method, code }); },
    });
    void actions.signIn('github');
    actions.noteSignInFailure('github', 'access_denied');
    expect(failures).toEqual([{ method: 'github', code: 'access_denied' }]);
    never.open();
  });

  test('a delayed failure from a replaced press on the same method is reported alone, and refuses nothing the press that replaced it did', async () => {
    const abandoning = held();
    const replacement = held();
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    let presses = 0;
    const actions = createAccountActions({ hasSession: () => true,
      signIn: () => (presses++ === 0 ? abandoning.wait() : replacement.wait()),
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    const abandoned = actions.signIn('google');
    const retry = actions.signIn('google');
    // The abandoned browser flow reports late, and names only the method both presses asked for.
    actions.noteSignInFailure('google', 'access_denied');
    replacement.open();
    expect(await retry).toEqual({ ok: true });
    abandoning.open();
    expect(await abandoned).toEqual({ ok: false, code: 'superseded' });
    expect(failures).toEqual([{ method: 'google', code: 'access_denied' }]);
    expect(completions).toEqual(['google']);
  });

  test('a supersession the provider reports through the failure door is no failure, and the replacement still reports its own', async () => {
    const abandoning = held();
    const replacement = held();
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    let presses = 0;
    let actions!: ReturnType<typeof createAccountActions>;
    actions = createAccountActions({ hasSession: () => false,
      signIn: () => (presses++ === 0 ? abandoning.wait() : replacement.wait()),
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {},
      // The provider abandons the replaced press inside the supersession, and says so through the same door.
      supersede: () => { actions.noteSignInFailure('google', 'superseded'); },
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    const abandoned = actions.signIn('google');
    const retry = actions.signIn('google');
    actions.noteSignInFailure('google', 'invalid_grant');
    replacement.open();
    expect(await retry).toEqual({ ok: false, code: 'failed' });
    abandoning.open();
    expect(await abandoned).toEqual({ ok: false, code: 'superseded' });
    expect(failures).toEqual([{ method: 'google', code: 'invalid_grant' }]);
    expect(completions).toEqual([]);
  });

  test('two presses on one method that both fail report each failure, and neither reports a completion', async () => {
    const first = held();
    const second = held();
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    let presses = 0;
    const actions = createAccountActions({ hasSession: () => false,
      signIn: () => (presses++ === 0 ? first.wait() : second.wait()),
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    const abandoned = actions.signIn('google');
    const retry = actions.signIn('google');
    // Both browser flows fail, and the provider absorbs each rather than rejecting either press.
    actions.noteSignInFailure('google', 'timeout');
    actions.noteSignInFailure('google', 'access_denied');
    second.open();
    expect(await retry).toEqual({ ok: false, code: 'failed' });
    first.open();
    expect(await abandoned).toEqual({ ok: false, code: 'superseded' });
    expect(failures).toEqual([{ method: 'google', code: 'timeout' }, { method: 'google', code: 'access_denied' }]);
    expect(completions).toEqual([]);
  });

  test('a provider that repeats the code its own refusal already carried reports it once', async () => {
    const failures: unknown[] = [];
    const actions = createAccountActions({ hasSession: () => true,
      signIn: async () => { throw { data: { code: 'exchange_failed' } }; },
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: () => { failures.push('completed'); },
    });
    expect(await actions.signIn('github')).toEqual({ ok: false, code: 'failed' });
    // The same flow reports again, late, through the provider's own door.
    actions.noteSignInFailure('github', 'exchange_failed');
    expect(failures).toEqual([{ method: 'github', code: 'exchange_failed' }]);
  });

  test('a provider that repeats one failure reports the press once, and a later press reports its own', async () => {
    const failures: unknown[] = [];
    const completions: unknown[] = [];
    let actions!: ReturnType<typeof createAccountActions>;
    actions = createAccountActions({ hasSession: () => false,
      signIn: async (method) => {
        actions.noteSignInFailure(method, 'timeout');
        actions.noteSignInFailure(method, 'timeout');
        actions.noteSignInFailure(method, 'timeout');
      },
      signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      recordFailure: (method, code) => { failures.push({ method, code }); },
      recordCompletion: (method) => { completions.push(method); },
    });
    expect(await actions.signIn('github')).toEqual({ ok: false, code: 'failed' });
    expect(failures).toEqual([{ method: 'github', code: 'timeout' }]);
    expect(await actions.signIn('github')).toEqual({ ok: false, code: 'failed' });
    expect(failures).toEqual([{ method: 'github', code: 'timeout' }, { method: 'github', code: 'timeout' }]);
    expect(completions).toEqual([]);
  });

  test('a failure reported outside any press reports itself, since no press will', async () => {
    const failures: unknown[] = [];
    const actions = createAccountActions({ hasSession: () => true,
      signIn: async () => {}, signOut: async () => {}, deleteAccount: async () => {}, clear: () => {}, supersede: () => {},
      recordFailure: (method, code) => { failures.push({ method, code }); },
    });
    actions.noteSignInFailure('github', 'invalid_grant');
    expect(failures).toEqual([{ method: 'github', code: 'invalid_grant' }]);
    expect(await actions.signIn('github')).toEqual({ ok: true });
    expect(failures).toHaveLength(1);
  });

  test('deletion clears the session exactly once and rejects overlapping destructive actions', async () => {
    const deletion = held();
    let cleared = 0;
    const actions = createAccountActions({ hasSession: () => true,
      signIn: async () => {}, signOut: async () => {},
      deleteAccount: deletion.wait,
      supersede: () => {}, clear: () => { cleared += 1; },
    });
    const deleting = actions.deleteAccount();
    expect(await actions.signOut()).toEqual({ ok: false, code: 'busy' });
    deletion.open();
    expect(await deleting).toEqual({ ok: true });
    expect(cleared).toBe(1);
  });
});
