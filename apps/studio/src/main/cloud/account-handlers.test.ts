import { afterAll, expect, mock, spyOn, test } from 'bun:test';
import { ipcMain } from 'electron';
import { IPC_INVOKE, type OnlookState, type SurveyAnswer } from '@studio/events';
import { statePublisher, type OnlookClientOptions } from './client.js';

const keys = ['MAIN_VITE_ONLOOK_CLOUD', 'AGENT_HEADLESS', 'STUDIO_FLAGS', 'MAIN_VITE_FLAG_DEFAULTS'] as const;
const saved = keys.map((key) => process.env[key]);
const handlers = new Map<string, Parameters<typeof ipcMain.handle>[1]>();
const registration = spyOn(ipcMain, 'handle').mockImplementation((channel, handler) => { handlers.set(channel, handler); });
const captures: Array<{ event: string; properties: Record<string, unknown> }> = [];
const warnings: Array<{ message: string; fields: unknown }> = [];
const surveyAnswers: SurveyAnswer[] = [];
let surveyFailure: Error | undefined;
let enabled = false;
let clears = 0;
let signOuts = 0;
let clientOptions: OnlookClientOptions | undefined;
let providerSignIn: () => Promise<void> = async () => {};
const publisher = statePublisher({ revision: 1, session: 'signed-out', connection: 'idle', me: null, profile: null });

mock.module('../identity/store.js', () => ({ readIdentity: () => null, writeIdentity: (identity: unknown) => identity }));
mock.module('../identity/ipc.js', () => ({ clearAccountIdentity: () => {}, onIdentity: () => {}, completeBrowserSignIn: (identity: unknown) => identity }));
mock.module('../identity/picture.js', () => ({ resolvePicture: async () => null }));
mock.module('../window/host.js', () => ({ everyRenderer: () => [] }));
mock.module('../tabs/broadcast.js', () => ({ broadcastToRenderers: () => {} }));
mock.module('../tabs/sender.js', () => ({ requireStudioTabSender: () => {} }));
mock.module('../log/index.js', () => ({ log: () => ({ warn: (message: string, fields: unknown) => { warnings.push({ message, fields }); } }) }));
mock.module('../telemetry/index.js', () => ({ capture: (event: string, properties: Record<string, unknown>) => { captures.push({ event, properties }); }, identifyPerson: () => {} }));
mock.module('@onlook/cloud-provider', () => ({ identity: {
  enabled: () => enabled, prepareSession: () => ({}), hasSession: () => false,
  supersedeSignIn: () => {}, clearSession: () => { clears += 1; }, signInStep: () => null,
  onSignInProgress: () => () => {}, onSessionChanged: () => () => {},
}, createOnlookClient: (options: OnlookClientOptions) => {
  clientOptions = options;
  return {
    start: () => {}, close: async () => {}, snapshot: publisher.snapshot, subscribe: publisher.subscribe,
    setSession: () => {}, setProfile: () => {},
    signIn: () => providerSignIn(), signOut: async () => { signOuts += 1; }, deleteAccount: async () => {},
    answerSurvey: async (answer: SurveyAnswer) => {
      if (surveyFailure !== undefined) throw surveyFailure;
      surveyAnswers.push(answer);
    },
  };
} }));

// Before the import: `initializeOnlook` picks its implementation from this value at module evaluation.
process.env['MAIN_VITE_ONLOOK_CLOUD'] = 'true';
delete process.env['AGENT_HEADLESS'];
const { initializeOnlook, registerOnlookHandlers } = await import('./index.js');
const ask = async (channel: string, argument?: unknown) => handlers.get(channel)!({} as Electron.IpcMainInvokeEvent, argument);

afterAll(() => {
  registration.mockRestore();
  keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; });
});

test('a build whose provider is not enabled refuses every account action, keeping credentials untouched and recording the refused sign-in alone', async () => {
  captures.length = 0;
  await initializeOnlook();
  registerOnlookHandlers();
  const state = await ask(IPC_INVOKE.onlookState) as OnlookState;
  expect(state.session).toBe('local');
  expect(await ask(IPC_INVOKE.onlookSignOut)).toEqual({ ok: false, code: 'not_configured' });
  expect(await ask(IPC_INVOKE.onlookSignIn, 'google')).toEqual({ ok: false, code: 'not_configured' });
  expect(await ask(IPC_INVOKE.onlookDeleteAccount, state.sessionEpoch)).toEqual({ ok: false, code: 'superseded' });
  expect(captures).toEqual([{ event: 'sign_in_failed', properties: { method: 'google', code: 'not_configured' } }]);
  expect(clears).toBe(0);
});

/** The session is no longer 'local', so only the provider reading can refuse here: the half a session-only check would miss (ONL-2780). */
test('the provider reading alone refuses an account action once a provider has answered with a real session', async () => {
  captures.length = 0;
  enabled = true;
  await initializeOnlook();
  expect((await ask(IPC_INVOKE.onlookState) as OnlookState).session).toBe('signed-out');
  enabled = false;
  expect(await ask(IPC_INVOKE.onlookSignOut)).toEqual({ ok: false, code: 'not_configured' });
  expect(await ask(IPC_INVOKE.onlookSignIn, 'google')).toEqual({ ok: false, code: 'not_configured' });
  expect(signOuts).toBe(0);
  expect(captures).toEqual([{ event: 'sign_in_failed', properties: { method: 'google', code: 'not_configured' } }]);
  expect(clears).toBe(0);
});

test('account snapshots resolve the teams flag without changing provider team state', async () => {
  delete process.env['STUDIO_FLAGS'];
  const teams = { workspaces: [{ id: 'personal', name: 'Personal', role: 'admin' }],
    members: [], invitations: [], activeId: 'personal', loading: false, error: null };
  publisher.publish({ teams });
  const off = await ask(IPC_INVOKE.onlookState) as OnlookState;
  expect(off.teamsEnabled).toBe(false);
  expect(off.teams).toEqual(teams);
  process.env['STUDIO_FLAGS'] = 'teams';
  const on = await ask(IPC_INVOKE.onlookState) as OnlookState;
  expect(on.teamsEnabled).toBe(true);
  expect(on.teams).toEqual(teams);
  expect(on.revision).toBeGreaterThan(off.revision);
  expect(publisher.snapshot().teamsEnabled).toBeUndefined();
});

const PROVIDER_PAYLOAD = 'AuthKit refused user@example.test with ya29.granted at https://auth.example.test/callback';

test('a provider refusal queues the un-collapsed code beside the account action, and nothing the provider said', async () => {
  captures.length = 0;
  enabled = true;
  providerSignIn = async () => { throw { data: { code: 'exchange_failed', message: PROVIDER_PAYLOAD } }; };
  expect(await ask(IPC_INVOKE.onlookSignIn, 'github')).toEqual({ ok: false, code: 'failed' });
  expect(captures).toEqual([
    { event: 'account_action', properties: { action: 'sign-in', outcome: 'failed', method: 'github' } },
    { event: 'sign_in_failed', properties: { method: 'github', code: 'exchange_failed' } },
  ]);
  expect(Object.keys(captures[1]!.properties)).toEqual(['method', 'code']);
  for (const secret of ['user@example.test', 'ya29.granted', 'https://auth.example.test']) {
    expect(JSON.stringify(captures)).not.toContain(secret);
  }
});

test('a non-method argument queues nothing', async () => {
  captures.length = 0;
  expect(await ask(IPC_INVOKE.onlookSignIn, 'passkey')).toEqual({ ok: false, code: 'failed' });
  expect(await ask(IPC_INVOKE.onlookSignIn, 7)).toEqual({ ok: false, code: 'failed' });
  expect(captures).toEqual([]);
});

test('a completed sign-in queues its account action and its completion, carrying the method alone', async () => {
  captures.length = 0;
  // The provider signs the user in, so the session the press resolves on is the one the completion stands on.
  providerSignIn = async () => { publisher.publish({ session: 'signed-in' }); };
  expect(await ask(IPC_INVOKE.onlookSignIn, 'email')).toEqual({ ok: true });
  expect(captures).toEqual([
    { event: 'account_action', properties: { action: 'sign-in', outcome: 'ok', method: 'email' } },
    { event: 'sign_in_completed', properties: { method: 'email' } },
  ]);
  expect(Object.keys(captures[1]!.properties)).toEqual(['method']);
  publisher.publish({ session: 'signed-out' });
});

test('a press the provider resolves without signing anyone in reports the absorbed failure alone, and no completion', async () => {
  captures.length = 0;
  providerSignIn = async () => { (clientOptions?.onSignInFailure as ((method: unknown, code: unknown) => void) | undefined)?.('google', 'authentication_denied'); };
  expect(await ask(IPC_INVOKE.onlookSignIn, 'google')).toEqual({ ok: false, code: 'failed' });
  expect(captures).toEqual([
    { event: 'sign_in_failed', properties: { method: 'google', code: 'authentication_denied' } },
    { event: 'account_action', properties: { action: 'sign-in', outcome: 'failed', method: 'google' } },
  ]);
  providerSignIn = async () => {};
});

test("the provider's own failure door queues the event a Studio-observed refusal queues", () => {
  captures.length = 0;
  clientOptions?.onSignInFailure?.('github', 'invalid_grant');
  expect(captures).toEqual([{ event: 'sign_in_failed', properties: { method: 'github', code: 'invalid_grant' } }]);
});

test('the provider door bounds a code it does not own and drops a method it invents', () => {
  captures.length = 0;
  const door = clientOptions?.onSignInFailure as ((method: unknown, code: unknown) => void) | undefined;
  door?.('github', PROVIDER_PAYLOAD);
  door?.('email', 'invalid_grant_v2');
  door?.('passkey', 'invalid_grant');
  door?.(undefined, undefined);
  expect(captures).toEqual([
    { event: 'sign_in_failed', properties: { method: 'github', code: 'failed' } },
    { event: 'sign_in_failed', properties: { method: 'email', code: 'failed' } },
  ]);
  expect(JSON.stringify(captures)).not.toContain('user@example.test');
});

test('a survey answer is forwarded only for a valid signed-in Studio request', async () => {
  enabled = true;
  surveyAnswers.length = 0;
  const answer = { question: 'found_us@v1', answer: 'other', detail: 'A design meetup' };
  publisher.publish({ session: 'signed-out' });
  await ask(IPC_INVOKE.onlookAnswerSurvey, answer);
  expect(surveyAnswers).toEqual([]);
  publisher.publish({ session: 'signed-in' });
  for (const invalid of [null, 'x', {}, { question: 'x'.repeat(65), answer: 'x' }, { question: 'found_us@v1', answer: 7 }, { ...answer, detail: 'x'.repeat(2001) }]) {
    await ask(IPC_INVOKE.onlookAnswerSurvey, invalid);
  }
  expect(surveyAnswers).toEqual([]);
  await ask(IPC_INVOKE.onlookAnswerSurvey, answer);
  await ask(IPC_INVOKE.onlookAnswerSurvey, { question: 'found_us@v1', answer: 'friend' });
  expect(surveyAnswers).toEqual([answer, { question: 'found_us@v1', answer: 'friend' }]);
  publisher.publish({ session: 'signed-out' });
  enabled = false;
});

test('a found-us answer reaches telemetry as its option key, the first on the person, and never the words typed for other (ONL-3259)', async () => {
  enabled = true;
  captures.length = 0;
  surveyAnswers.length = 0;
  const answered = () => captures.filter((capture) => capture.event === 'onboarding_survey_answered');
  try {
    publisher.publish({ session: 'signed-out' });
    await ask(IPC_INVOKE.onlookAnswerSurvey, { question: 'found_us@v1', answer: 'friend' });
    expect(answered()).toEqual([]);

    publisher.publish({ session: 'signed-in' });
    await ask(IPC_INVOKE.onlookAnswerSurvey, { question: 'found_us@v1', answer: 'other', detail: 'A private meetup' });
    await ask(IPC_INVOKE.onlookAnswerSurvey, { question: 'found_us@v1', answer: 'friend' });
    await ask(IPC_INVOKE.onlookAnswerSurvey, { question: 'found_us@v1', answer: 'private billboard' });
    await ask(IPC_INVOKE.onlookAnswerSurvey, { question: 'job@v1', answer: 'designer' });

    expect(answered()).toEqual([
      { event: 'onboarding_survey_answered', properties: { question: 'found_us@v1', answer: 'other', has_detail: true, $set_once: { found_us: 'other' } } },
      { event: 'onboarding_survey_answered', properties: { question: 'found_us@v1', answer: 'friend', has_detail: false, $set_once: { found_us: 'friend' } } },
    ]);
    expect(JSON.stringify(captures)).not.toContain('private');
    expect(surveyAnswers.map((answer) => answer.answer)).toEqual(['other', 'friend', 'private billboard', 'designer']);
  } finally {
    publisher.publish({ session: 'signed-out' });
    enabled = false;
  }
});

test('a rejected survey answer logs its error code without the answer and resolves for onboarding', async () => {
  enabled = true;
  publisher.publish({ session: 'signed-in' });
  warnings.length = 0;
  surveyFailure = new TypeError('private survey detail and credentials');
  try {
    await expect(ask(IPC_INVOKE.onlookAnswerSurvey, { question: 'found_us@v1', answer: 'other', detail: 'Private answer' })).resolves.toBeUndefined();
    expect(warnings).toEqual([{ message: 'survey answer not stored', fields: { code: 'TypeError' } }]);
  } finally {
    surveyFailure = undefined;
    publisher.publish({ session: 'signed-out' });
    enabled = false;
  }
});
